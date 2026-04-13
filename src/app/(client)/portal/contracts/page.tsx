"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { FilterButton, FilterGroup } from "@/components/ui/filter-group";
import { ContactAdvisorButton } from "@/components/portal/ContactAdvisorButton";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { FileText, CreditCard, Shield, Upload, Loader2, AlertTriangle, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { usePortalForm } from "@/lib/forms/use-portal-form";

interface ClassificationResult {
  document_type: "contract" | "invoice" | "receipt" | "statement" | "other";
  confidence: "high" | "medium" | "low";
  description_cs: string;
  extracted_provider: string | null;
  extracted_amount: number | null;
  extracted_type: "uver" | "pojisteni" | null;
  redirect_suggestion: "documents" | "receipts" | null;
}

interface Contract {
  id: string;
  title: string;
  status: string;
  type: string;
  provider: string | null;
  interest_rate: number | null;
  remaining_balance: number | null;
  monthly_payment: number | null;
  valid_from: string | null;
  valid_to: string | null;
  insurance_type: string | null;
  value: number | null;
}

function formatCZK(v: number | null) {
  if (v == null) return "—";
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(v);
}

export default function ContractsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filter, setFilter] = useState("all");
  const [clientId, setClientId] = useState("");
  const [advisorId, setAdvisorId] = useState("");
  const [interestThreshold, setInterestThreshold] = useState(5.0);

  // Sheet state
  const [sheetType, setSheetType] = useState<"uver" | "pojisteni" | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [provider, setProvider] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [remainingBalance, setRemainingBalance] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [insuranceType, setInsuranceType] = useState("zivotni");
  const [insurancePremium, setInsurancePremium] = useState("");
  const contractForm = usePortalForm<"provider">();

  // Upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // AI classification
  const [classifying, setClassifying] = useState(false);
  const [classification, setClassification] = useState<ClassificationResult | null>(null);

  async function fetchData() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/portal/contracts");
      if (!res.ok) { setError("Nepodařilo se načíst smlouvy."); setLoading(false); return; }
      const data = await res.json();
      setContracts(data.contracts || []);
      setClientId(data.client_id || "");
      setAdvisorId(data.advisor_id || "");
    } catch {
      setError("Nepodařilo se načíst smlouvy.");
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = filter === "all" ? contracts : contracts.filter((c) => c.type === filter);

  function resetForm() {
    setProvider(""); setLoanAmount(""); setInterestRate(""); setMonthlyPayment("");
    setRemainingBalance(""); setValidFrom(""); setValidTo(""); setInsuranceType("zivotni");
    setInsurancePremium(""); setUploadFile(null); setClassification(null);
    contractForm.resetErrors();
  }

  async function classifyUploadedFile(file: File) {
    if (!clientId) return;
    setClassifying(true);
    setClassification(null);

    // Upload to temp storage for AI analysis
    const filePath = `client-docs/${clientId}/classify_${Date.now()}_${file.name}`;
    const { error: storageError } = await supabase.storage.from("deal-documents").upload(filePath, file);
    if (storageError) {
      toast.error("Chyba při nahrávání souboru pro analýzu.");
      setClassifying(false);
      return;
    }

    try {
      const res = await fetch("/api/portal/contracts/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storage_path: filePath }),
      });
      if (res.ok) {
        const data = await res.json();
        setClassification(data.classification);

        // Auto-fill fields from AI extraction
        if (data.classification.document_type === "contract") {
          if (data.classification.extracted_provider && !provider) {
            setProvider(data.classification.extracted_provider);
          }
          if (data.classification.extracted_amount) {
            if (sheetType === "uver" && !loanAmount) {
              setLoanAmount(String(data.classification.extracted_amount));
            } else if (sheetType === "pojisteni" && !insurancePremium) {
              setInsurancePremium(String(data.classification.extracted_amount));
            }
          }
        }
      }
    } catch {
      // Classification is optional, don't block the flow
    }
    setClassifying(false);
  }

  async function handleSaveContract() {
    if (!clientId || !advisorId) return;

    if (!uploadFile && !contractForm.validateRequired([{ name: "provider", value: provider }])) return;

    setSaving(true);

    const isLoan = sheetType === "uver";
    const title = isLoan
      ? `${provider.trim() || "Úvěr"} - ${formatCZK(parseFloat(loanAmount) || 0)}`
      : `${provider.trim() || "Pojištění"} - ${insuranceType}`;

    const payload = {
      title,
      status: "active",
      type: isLoan ? "uver" : "pojisteni",
      provider: provider.trim() || null,
      interest_rate: isLoan ? parseFloat(interestRate) || null : null,
      remaining_balance: isLoan ? parseFloat(remainingBalance) || parseFloat(loanAmount) || null : null,
      monthly_payment: isLoan ? parseFloat(monthlyPayment) || null : parseFloat(insurancePremium) || null,
      valid_from: validFrom || null,
      valid_to: validTo || null,
      insurance_type: isLoan ? null : insuranceType,
      value: isLoan ? parseFloat(loanAmount) || null : parseFloat(insurancePremium) ? parseFloat(insurancePremium) * 12 : null,
    };

    try {
      const res = await fetch("/api/portal/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Chyba při ukládání smlouvy.");
        setSaving(false);
        return;
      }

      // Upload file if present
      if (uploadFile && data.contract) {
        setUploading(true);
        const filePath = `client-docs/${clientId}/${Date.now()}_${uploadFile.name}`;
        const { error: storageError } = await supabase.storage.from("deal-documents").upload(filePath, uploadFile);
        if (storageError) {
          toast.error("Chyba při nahrávání souboru: " + storageError.message);
        } else {
          const docRes = await fetch("/api/portal/documents/upload-attachment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: uploadFile.name,
              category: "contract",
              file_path: filePath,
              file_size: uploadFile.size,
            }),
          });
          if (!docRes.ok) {
            toast.error("Chyba při ukládání dokumentu.");
          }
        }
        setUploading(false);
      }

      // Check interest rate for savings alert
      if (isLoan && parseFloat(interestRate) > interestThreshold) {
        // Alert already created server-side in POST handler
      }

      setSaving(false);
      setSheetType(null);
      resetForm();
      toast.success("Smlouva přidána.");
      fetchData();
    } catch {
      toast.error("Chyba při ukládání smlouvy.");
      setSaving(false);
    }
  }

  const showSavingsAlert = sheetType === "uver" && parseFloat(interestRate) > interestThreshold;

  if (loading) return <div className="space-y-4 p-4 md:p-8"><Skeleton className="h-8 w-48" />{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;
  if (error) return <div className="p-4 md:p-8"><ErrorState description={error} onRetry={fetchData} /></div>;

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--card-text)]">Smlouvy</h1>
        <p className="mt-1 text-sm text-[var(--card-text-muted)]">
          Mějte přehled o svých úvěrech a pojištění. Poradce uvidí vaše smlouvy a může navrhnout lepší podmínky.
        </p>
        {contracts.length > 0 && (
          <p className="mt-0.5 text-xs text-[var(--card-text-dim)]">{contracts.length} smluv</p>
        )}
      </div>

      {/* CTA Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button onClick={() => { resetForm(); setSheetType("uver"); }}
          className="rounded-2xl border-2 border-dashed border-[var(--card-border)] bg-[var(--card-bg)] p-6 text-left transition-all hover:border-blue-300 hover:bg-blue-50/30">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white mb-3">
            <CreditCard className="h-6 w-6" />
          </div>
          <span className="text-sm font-semibold text-[var(--card-text)]">Přidat úvěr</span>
          <p className="mt-1 text-xs text-[var(--card-text-muted)]">Hypotéka, spotřebitelský úvěr...</p>
        </button>
        <button onClick={() => { resetForm(); setSheetType("pojisteni"); }}
          className="rounded-2xl border-2 border-dashed border-[var(--card-border)] bg-[var(--card-bg)] p-6 text-left transition-all hover:border-blue-300 hover:bg-blue-50/30">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 text-white mb-3">
            <Shield className="h-6 w-6" />
          </div>
          <span className="text-sm font-semibold text-[var(--card-text)]">Přidat pojištění</span>
          <p className="mt-1 text-xs text-[var(--card-text-muted)]">Životní, majetkové, auto...</p>
        </button>
      </div>

      {/* Filter */}
      <FilterGroup value={filter} onChange={setFilter} className="mb-4">
        {[
          { key: "all", label: "Vše" },
          { key: "uver", label: "Úvěry" },
          { key: "pojisteni", label: "Pojištění" },
        ].map((f) => (
          <FilterButton
            key={f.key}
            value={f.key}
          >
            {f.label}
          </FilterButton>
        ))}
      </FilterGroup>

      {/* Contract list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <FileText className="mb-4 h-12 w-12 text-[var(--card-text-dim)]" />
          <p className="text-lg font-medium text-[var(--card-text-dim)]">Žádné smlouvy</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const iconConfig = c.type === "uver"
              ? { from: "from-amber-400", to: "to-orange-500", Icon: CreditCard }
              : c.insurance_type === "auto"
                ? { from: "from-orange-400", to: "to-red-500", Icon: Shield }
                : { from: "from-blue-400", to: "to-blue-600", Icon: Shield };
            return (
              <div key={c.id} onClick={() => router.push(`/portal/contracts/${c.id}`)}
                className="flex items-center gap-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 cursor-pointer hover:shadow-md transition-all">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${iconConfig.from} ${iconConfig.to} text-white shrink-0`}>
                  <iconConfig.Icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-[var(--card-text)]">{c.title}</h3>
                  <p className="text-xs text-[var(--card-text-muted)]">{c.provider || "—"}</p>
                  <Badge variant={c.status === "active" ? "default" : "secondary"} className="mt-1 text-[10px]">
                    {c.status === "active" ? "Aktivní" : c.status}
                  </Badge>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-[var(--card-text)]">{formatCZK(c.monthly_payment)}</p>
                  <p className="text-xs text-[var(--card-text-dim)]">měsíčně</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add contract sheet */}
      <Sheet open={!!sheetType} onOpenChange={(o) => !o && setSheetType(null)}>
        <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto p-0">
          {/* Header with gradient */}
          <div className={`px-6 pt-6 pb-5 ${sheetType === "uver" ? "bg-gradient-to-br from-amber-50 to-orange-50" : "bg-gradient-to-br from-blue-50 to-indigo-50"}`}>
            <SheetHeader>
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${sheetType === "uver" ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-gradient-to-br from-blue-400 to-blue-600"}`}>
                  {sheetType === "uver" ? <CreditCard className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
                </div>
                <div>
                  <SheetTitle>{sheetType === "uver" ? "Přidat úvěr" : "Přidat pojištění"}</SheetTitle>
                  <SheetDescription className="mt-0.5">
                    {sheetType === "uver"
                      ? "Poradce vyhodnotí, zda nemáte zbytečně drahý úvěr."
                      : "Poradce zkontroluje, zda jste dostatečně chráněni."
                    }
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>
          </div>

          <div className="px-6 pb-6">
            <Tabs defaultValue="form" className="mt-5">
              <TabsList className="w-full">
                <TabsTrigger value="form" className="flex-1">Vyplnit formulář</TabsTrigger>
                <TabsTrigger value="upload" className="flex-1">Nahrát dokument</TabsTrigger>
              </TabsList>

              <TabsContent value="form" className="mt-5 space-y-5">
                {sheetType === "uver" ? (
                  <>
                    {/* Provider */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium" htmlFor="contract-provider">Banka / Poskytovatel *</Label>
                      <Input
                        id="contract-provider"
                        ref={contractForm.registerRef("provider")}
                        value={provider}
                        onChange={(e) => {
                          setProvider(e.target.value);
                          contractForm.clearError("provider");
                        }}
                        placeholder="např. Česká spořitelna"
                        required
                        aria-invalid={!!contractForm.errors.provider}
                        aria-describedby={contractForm.errors.provider ? "contract-provider-error" : undefined}
                      />
                      {contractForm.errors.provider && (
                        <p id="contract-provider-error" className="text-xs font-medium text-red-600">
                          {contractForm.errors.provider}
                        </p>
                      )}
                    </div>

                    {/* Loan amount */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Výše úvěru (Kč)</Label>
                      <Input type="number" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} placeholder="např. 2 000 000" />
                    </div>

                    {/* Rate + payment row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Úroková sazba (%)</Label>
                        <Input type="number" step="0.01" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} placeholder="např. 5.49" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Měsíční splátka (Kč)</Label>
                        <Input type="number" value={monthlyPayment} onChange={(e) => setMonthlyPayment(e.target.value)} placeholder="např. 12 500" />
                      </div>
                    </div>

                    {/* Remaining balance */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Zůstatek (Kč)</Label>
                      <Input type="number" value={remainingBalance} onChange={(e) => setRemainingBalance(e.target.value)} placeholder="Kolik ještě zbývá splatit" />
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Datum sjednání</Label>
                        <Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Datum splatnosti</Label>
                        <Input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Provider */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium" htmlFor="contract-provider">Pojišťovna *</Label>
                      <Input
                        id="contract-provider"
                        ref={contractForm.registerRef("provider")}
                        value={provider}
                        onChange={(e) => {
                          setProvider(e.target.value);
                          contractForm.clearError("provider");
                        }}
                        placeholder="např. Allianz"
                        required
                        aria-invalid={!!contractForm.errors.provider}
                        aria-describedby={contractForm.errors.provider ? "contract-provider-error" : undefined}
                      />
                      {contractForm.errors.provider && (
                        <p id="contract-provider-error" className="text-xs font-medium text-red-600">
                          {contractForm.errors.provider}
                        </p>
                      )}
                    </div>

                    {/* Insurance type */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Typ pojištění</Label>
                      <Select value={insuranceType} onValueChange={setInsuranceType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="zivotni">Životní</SelectItem>
                          <SelectItem value="majetek">Majetek</SelectItem>
                          <SelectItem value="auto">Auto</SelectItem>
                          <SelectItem value="odpovednost">Odpovědnost</SelectItem>
                          <SelectItem value="dalsi">Další</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Premium */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Měsíční pojistné (Kč)</Label>
                      <Input type="number" value={insurancePremium} onChange={(e) => setInsurancePremium(e.target.value)} placeholder="např. 1 200" />
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Platnost od</Label>
                        <Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Platnost do</Label>
                        <Input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
                      </div>
                    </div>
                  </>
                )}

                {showSavingsAlert && (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-green-800">Vaše úroková sazba je nad {interestThreshold}%.</p>
                        <p className="mt-1 text-xs text-green-700">Je možné, že můžete ušetřit optimalizací nebo refinancováním úvěru.</p>
                        <div className="mt-3">
                          <ContactAdvisorButton clientId={clientId} label="Kontaktovat poradce" className="text-xs" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Benefit hint */}
                <div className="rounded-xl bg-[var(--table-hover)] p-4">
                  <p className="text-xs text-[var(--card-text-muted)]">
                    {sheetType === "uver"
                      ? "Tip: Čím přesnější údaje zadáte, tím lépe vám poradce pomůže najít úspory na úrocích a splátkách."
                      : "Tip: Díky přehledu pojistek poradce ověří, zda jste dostatečně chráněni a neplatíte za duplicitní krytí."
                    }
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="upload" className="mt-5">
                <div
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--card-border)] p-8 transition-colors hover:border-blue-300"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { setUploadFile(f); setClassification(null); classifyUploadedFile(f); } }}
                >
                  <Upload className="mb-3 h-8 w-8 text-[var(--card-text-dim)]" />
                  <p className="text-sm font-medium text-[var(--card-text)]">Přetáhněte soubor sem</p>
                  <p className="mt-1 text-xs text-[var(--card-text-muted)]">PDF, JPG, PNG — smlouvu nebo výpis</p>
                  <label className="mt-4 cursor-pointer rounded-lg bg-[var(--table-header)] px-4 py-2 text-xs font-medium text-[var(--card-text-muted)] hover:bg-[var(--table-hover)]">
                    Vybrat soubor
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setUploadFile(f); setClassification(null); classifyUploadedFile(f); } }} />
                  </label>
                </div>
                {uploadFile && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span className="text-xs text-blue-700">{uploadFile.name}</span>
                    <button onClick={() => { setUploadFile(null); setClassification(null); }} className="ml-auto text-xs text-blue-400 hover:text-blue-600">Odebrat</button>
                  </div>
                )}

                {/* AI Classification status */}
                {classifying && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    <span className="text-sm text-blue-700">AI analyzuje dokument...</span>
                  </div>
                )}

                {classification && classification.document_type === "contract" && (
                  <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-green-800">Smlouva rozpoznána</p>
                        <p className="mt-1 text-xs text-green-700">{classification.description_cs}</p>
                        {classification.extracted_provider && (
                          <p className="mt-1 text-xs text-green-600">Poskytovatel: <strong>{classification.extracted_provider}</strong></p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {classification && classification.document_type !== "contract" && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <XCircle className="mt-0.5 h-5 w-5 text-amber-600 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">
                          Toto nevypadá jako smlouva
                        </p>
                        <p className="mt-1 text-xs text-amber-700">{classification.description_cs}</p>
                        <p className="mt-2 text-xs text-amber-700">
                          {classification.document_type === "receipt"
                            ? "Účtenky a paragony nahrajte v sekci Dokumenty → Skenovat doklad."
                            : classification.document_type === "invoice"
                              ? "Faktury nahrajte v sekci Dokumenty → Skenovat doklad."
                              : "Tento typ dokumentu nahrajte v sekci Dokumenty nebo Trezor."
                          }
                        </p>
                        <a
                          href={classification.document_type === "receipt" || classification.document_type === "invoice" ? "/portal/documents" : "/portal/trezor"}
                          className="mt-3 inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors"
                        >
                          Přejít do {classification.document_type === "receipt" || classification.document_type === "invoice" ? "Dokumentů" : "Trezoru"}
                          <ArrowRight className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {!classification && !classifying && (
                  <p className="mt-3 text-xs text-[var(--card-text-muted)]">
                    Nahrajte smlouvu a AI ji automaticky rozpozná. Pokud to není smlouva, navede vás kam dokument patří.
                  </p>
                )}
              </TabsContent>
            </Tabs>

            <div className="mt-6">
              <Button
                onClick={handleSaveContract}
                disabled={saving || uploading || classifying || (!!classification && classification.document_type !== "contract" && !!uploadFile)}
                className="w-full"
                size="lg"
              >
                {(saving || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Uložit smlouvu
              </Button>
              {classification && classification.document_type !== "contract" && uploadFile && (
                <p className="mt-2 text-center text-xs text-amber-600">
                  AI rozpoznala, že nahraný dokument není smlouva. Odeberte ho nebo nahrajte správný dokument.
                </p>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
