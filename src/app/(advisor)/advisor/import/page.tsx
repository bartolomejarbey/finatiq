"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

type MappingTarget =
  | "first_name"
  | "last_name"
  | "email"
  | "phone"
  | "is_osvc"
  | "birth_date"
  | "address"
  | "skip";

const MAPPING_OPTIONS: { value: MappingTarget; label: string }[] = [
  { value: "skip", label: "Přeskočit" },
  { value: "first_name", label: "Jméno" },
  { value: "last_name", label: "Příjmení" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Telefon" },
  { value: "is_osvc", label: "OSVC" },
  { value: "birth_date", label: "Datum narození" },
  { value: "address", label: "Adresa" },
];

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (line.trim() === "") continue;
    const row: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ",") {
          row.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
    }
    row.push(current.trim());
    rows.push(row);
  }
  return rows;
}

interface ImportStats {
  imported: number;
  skipped: number;
  errors: number;
}

export default function ImportPage() {
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, MappingTarget>>({});
  const [advisorId, setAdvisorId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<ImportStats>({ imported: 0, skipped: 0, errors: 0 });

  useEffect(() => {
    async function loadAdvisor() {
      const { data } = await supabase.from("advisors").select("id").single();
      if (data) setAdvisorId(data.id);
    }
    loadAdvisor();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length < 2) {
        toast.error("CSV soubor musí obsahovat hlavičku a alespoň jeden řádek.");
        return;
      }
      setHeaders(parsed[0]);
      setRows(parsed.slice(1));
      const initialMapping: Record<number, MappingTarget> = {};
      parsed[0].forEach((h, i) => {
        const lower = h.toLowerCase();
        if (lower.includes("jmen") || lower.includes("first")) initialMapping[i] = "first_name";
        else if (lower.includes("prijm") || lower.includes("last")) initialMapping[i] = "last_name";
        else if (lower.includes("email") || lower.includes("mail")) initialMapping[i] = "email";
        else if (lower.includes("tel") || lower.includes("phone")) initialMapping[i] = "phone";
        else if (lower.includes("osvc") || lower.includes("ico")) initialMapping[i] = "is_osvc";
        else if (lower.includes("narozen") || lower.includes("birth")) initialMapping[i] = "birth_date";
        else if (lower.includes("adres") || lower.includes("address")) initialMapping[i] = "address";
        else initialMapping[i] = "skip";
      });
      setMapping(initialMapping);
      setStep(2);
    };
    reader.readAsText(file);
  }

  function getMappedRow(row: string[]): Record<string, string> {
    const result: Record<string, string> = {};
    Object.entries(mapping).forEach(([colIdx, target]) => {
      if (target !== "skip") {
        result[target] = row[Number(colIdx)] || "";
      }
    });
    return result;
  }

  function rowHasIssues(mapped: Record<string, string>): string[] {
    const issues: string[] = [];
    if (!mapped.first_name) issues.push("Chybí jméno");
    if (!mapped.last_name) issues.push("Chybí příjmení");
    return issues;
  }

  async function handleImport() {
    if (!advisorId) {
      toast.error("Nelze načíst profil poradce.");
      return;
    }
    setImporting(true);
    setProgress(0);
    const result: ImportStats = { imported: 0, skipped: 0, errors: 0 };

    for (let i = 0; i < rows.length; i++) {
      const mapped = getMappedRow(rows[i]);
      if (!mapped.first_name || !mapped.last_name) {
        result.errors++;
        setProgress(i + 1);
        continue;
      }

      if (mapped.email) {
        const { data: existing } = await supabase
          .from("clients")
          .select("id")
          .eq("advisor_id", advisorId)
          .eq("email", mapped.email)
          .maybeSingle();
        if (existing) {
          result.skipped++;
          setProgress(i + 1);
          continue;
        }
      }

      const insertData: Record<string, unknown> = {
        advisor_id: advisorId,
        first_name: mapped.first_name,
        last_name: mapped.last_name,
      };
      if (mapped.email) insertData.email = mapped.email;
      if (mapped.phone) insertData.phone = mapped.phone;
      if (mapped.is_osvc) insertData.is_osvc = mapped.is_osvc === "true" || mapped.is_osvc === "1" || mapped.is_osvc.toLowerCase() === "ano";
      if (mapped.birth_date) insertData.birth_date = mapped.birth_date;
      if (mapped.address) insertData.address = mapped.address;

      const { error } = await supabase.from("clients").insert(insertData);
      if (error) {
        result.errors++;
      } else {
        result.imported++;
      }
      setProgress(i + 1);
    }

    setStats(result);
    setImporting(false);
    setStep(5);
  }

  const previewRows = rows.slice(0, 10).map((row) => ({
    mapped: getMappedRow(row),
    issues: rowHasIssues(getMappedRow(row)),
  }));

  const steps = [
    { num: 1, label: "Nahrát soubor" },
    { num: 2, label: "Mapování sloupců" },
    { num: 3, label: "Náhled" },
    { num: 4, label: "Import" },
    { num: 5, label: "Výsledek" },
  ];

  return (
    <div className="">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--card-text)]">Import klientů</h1>
        <p className="mt-0.5 text-sm text-[var(--card-text-muted)]">
          Hromadný import klientů z CSV souboru
        </p>
      </div>

      {/* Step indicator */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step > s.num
                  ? "bg-green-500 text-white"
                  : step === s.num
                  ? "bg-blue-500 text-white"
                  : "bg-[var(--card-border)] text-[var(--card-text-muted)]"
              }`}
            >
              {step > s.num ? <Check className="h-4 w-4" /> : s.num}
            </div>
            <span
              className={`hidden text-xs sm:inline ${
                step === s.num ? "font-medium text-[var(--card-text)]" : "text-[var(--card-text-dim)]"
              }`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div className="mx-2 h-px w-8 bg-[var(--card-border)]" />
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-sm">
        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="flex flex-col items-center py-12">
            <FileSpreadsheet className="mb-4 h-16 w-16 text-[var(--card-text-dim)]" />
            <h2 className="mb-2 text-lg font-semibold text-[var(--card-text)]">
              Nahrajte CSV soubor
            </h2>
            <p className="mb-6 text-sm text-[var(--card-text-muted)]">
              Soubor musí obsahovat hlavičku s názvy sloupců
            </p>
            <label className="cursor-pointer">
              <div className="flex items-center gap-2 rounded-lg border-2 border-dashed border-[var(--input-border)] px-8 py-4 transition-colors hover:border-blue-400 hover:bg-blue-50">
                <Upload className="h-5 w-5 text-[var(--card-text-dim)]" />
                <span className="text-sm font-medium text-[var(--card-text-muted)]">
                  Vybrat soubor
                </span>
              </div>
              <Input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        )}

        {/* Step 2: Column mapping */}
        {step === 2 && (
          <div>
            <h2 className="mb-4 text-lg font-semibold text-[var(--card-text)]">
              Mapování sloupců
            </h2>
            <p className="mb-4 text-sm text-[var(--card-text-muted)]">
              Přiřaďte každému sloupci v CSV odpovídající pole
            </p>
            <div className="space-y-3">
              {headers.map((header, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-4 rounded-lg border p-3"
                >
                  <span className="w-40 truncate text-sm font-medium text-[var(--card-text)]">
                    {header}
                  </span>
                  <ArrowRight className="h-4 w-4 text-[var(--card-text-dim)]" />
                  <Select
                    value={mapping[idx] || "skip"}
                    onValueChange={(val) =>
                      setMapping({ ...mapping, [idx]: val as MappingTarget })
                    }
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MAPPING_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-[var(--card-text-muted)]">
                    např.: {rows[0]?.[idx] || "—"}
                  </span>
                </div>
              ))}
            </div>

            {/* Preview first 3 rows */}
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-medium text-[var(--card-text)]">
                Náhled (první 3 řádky)
              </h3>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-[var(--table-hover)] text-left text-xs font-medium uppercase tracking-wider text-[var(--card-text)]">
                      {Object.entries(mapping)
                        .filter(([, t]) => t !== "skip")
                        .map(([, target]) => (
                          <th key={target} className="px-4 py-2">
                            {MAPPING_OPTIONS.find((o) => o.value === target)?.label}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 3).map((row, i) => {
                      const mapped = getMappedRow(row);
                      return (
                        <tr key={i} className="border-b last:border-0">
                          {Object.entries(mapping)
                            .filter(([, t]) => t !== "skip")
                            .map(([, target]) => (
                              <td key={target} className="px-4 py-2 text-[var(--card-text-muted)]">
                                {mapped[target] || "—"}
                              </td>
                            ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zpět
              </Button>
              <Button onClick={() => setStep(3)}>
                Pokračovat
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && (
          <div>
            <h2 className="mb-4 text-lg font-semibold text-[var(--card-text)]">
              Náhled importu
            </h2>
            <p className="mb-4 text-sm text-[var(--card-text-muted)]">
              Celkem řádků k importu: <strong>{rows.length}</strong>
            </p>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-[var(--table-hover)] text-left text-xs font-medium uppercase tracking-wider text-[var(--card-text)]">
                    <th className="px-4 py-2">#</th>
                    <th className="px-4 py-2">Jméno</th>
                    <th className="px-4 py-2">Příjmení</th>
                    <th className="px-4 py-2">Email</th>
                    <th className="px-4 py-2">Telefon</th>
                    <th className="px-4 py-2">Stav</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((pr, i) => (
                    <tr
                      key={i}
                      className={`border-b last:border-0 ${
                        pr.issues.length > 0 ? "bg-red-50" : ""
                      }`}
                    >
                      <td className="px-4 py-2 text-[var(--card-text-dim)]">{i + 1}</td>
                      <td className="px-4 py-2 text-[var(--card-text)]">
                        {pr.mapped.first_name || "—"}
                      </td>
                      <td className="px-4 py-2 text-[var(--card-text)]">
                        {pr.mapped.last_name || "—"}
                      </td>
                      <td className="px-4 py-2 text-[var(--card-text-muted)]">
                        {pr.mapped.email || "—"}
                      </td>
                      <td className="px-4 py-2 text-[var(--card-text-muted)]">
                        {pr.mapped.phone || "—"}
                      </td>
                      <td className="px-4 py-2">
                        {pr.issues.length > 0 ? (
                          <div className="flex items-center gap-1 text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-xs">{pr.issues.join(", ")}</span>
                          </div>
                        ) : (
                          <Badge className="bg-green-100 text-green-700 text-xs">
                            <Check className="mr-1 h-3 w-3" />
                            OK
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 10 && (
              <p className="mt-2 text-xs text-[var(--card-text-muted)]">
                ... a dalších {rows.length - 10} řádků
              </p>
            )}

            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zpět
              </Button>
              <Button onClick={() => { setStep(4); handleImport(); }}>
                Spustit import
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Import progress */}
        {step === 4 && (
          <div className="flex flex-col items-center py-12">
            <FileSpreadsheet className="mb-4 h-12 w-12 animate-pulse text-blue-500" />
            <h2 className="mb-4 text-lg font-semibold text-[var(--card-text)]">
              Importuji klienty...
            </h2>
            <div className="mb-2 w-full max-w-md">
              <div className="h-3 w-full rounded-full bg-[var(--card-border)]">
                <div
                  className="h-3 rounded-full bg-blue-500 transition-all"
                  style={{
                    width: `${rows.length > 0 ? (progress / rows.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <p className="text-sm text-[var(--card-text-muted)]">
              {progress} / {rows.length}
            </p>
          </div>
        )}

        {/* Step 5: Report */}
        {step === 5 && (
          <div className="flex flex-col items-center py-12">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="mb-4 text-xl font-semibold text-[var(--card-text)]">
              Import dokončen
            </h2>
            <div className="mb-6 space-y-2 text-center">
              <p className="text-sm text-[var(--card-text-muted)]">
                Importováno:{" "}
                <strong className="text-green-600">{stats.imported}</strong>{" "}
                klientů
              </p>
              <p className="text-sm text-[var(--card-text-muted)]">
                Přeskočeno:{" "}
                <strong className="text-yellow-600">{stats.skipped}</strong>{" "}
                duplicit
              </p>
              <p className="text-sm text-[var(--card-text-muted)]">
                Chyby:{" "}
                <strong className="text-red-600">{stats.errors}</strong>
              </p>
            </div>
            <Button
              onClick={() => (window.location.href = "/advisor/clients")}
            >
              Přejít na seznam klientů
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
