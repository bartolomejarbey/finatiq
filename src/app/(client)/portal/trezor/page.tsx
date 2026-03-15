"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Lock,
  Upload,
  Download,
  Trash2,
  Share2,
  AlertCircle,
  CreditCard,
  Car,
  Globe,
  Baby,
  Heart,
  FileText,
  Receipt,
  Calculator,
  Folder,
  ArrowLeft,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const CATEGORIES = [
  { key: "obcansky_prukaz", label: "Občanský průkaz", icon: CreditCard },
  { key: "ridicsky_prukaz", label: "Řidičský průkaz", icon: Car },
  { key: "pas", label: "Pas", icon: Globe },
  { key: "rodny_list", label: "Rodný list", icon: Baby },
  { key: "oddaci_list", label: "Oddací list", icon: Heart },
  { key: "smlouvy", label: "Smlouvy", icon: FileText },
  { key: "vypisy", label: "Výpisy", icon: Receipt },
  { key: "danova_priznani", label: "Daňová přiznání", icon: Calculator },
  { key: "ostatni", label: "Ostatní", icon: Folder },
] as const;

interface VaultDoc {
  id: string;
  name: string;
  vault_category: string;
  valid_until: string | null;
  shared_with_advisor: boolean;
  file_url: string;
  created_at: string;
}

export default function TrezorPage() {
  const supabase = createClient();
  const [docs, setDocs] = useState<VaultDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Upload form
  const [file, setFile] = useState<File | null>(null);
  const [docName, setDocName] = useState("");
  const [docCategory, setDocCategory] = useState("ostatni");
  const [validUntil, setValidUntil] = useState("");
  const [shareWithAdvisor, setShareWithAdvisor] = useState(false);

  useEffect(() => {
    fetchDocs();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchDocs() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: client } = await supabase.from("clients").select("id").eq("user_id", user.id).single();
    if (!client) return;
    setClientId(client.id);

    const { data } = await supabase
      .from("documents")
      .select("id, name, vault_category, valid_until, shared_with_advisor, file_url, created_at")
      .eq("client_id", client.id)
      .eq("is_vault", true)
      .order("created_at", { ascending: false });

    setDocs(data || []);
    setLoading(false);
  }

  async function handleUpload() {
    if (!file || !docName || !clientId) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `vault/${clientId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);

    if (uploadError) {
      toast.error("Chyba při nahrávání: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);

    const { data: client } = await supabase.from("clients").select("advisor_id").eq("id", clientId).single();

    await supabase.from("documents").insert({
      client_id: clientId,
      advisor_id: client?.advisor_id,
      name: docName,
      file_url: urlData.publicUrl,
      is_vault: true,
      vault_category: docCategory,
      valid_until: validUntil || null,
      shared_with_advisor: shareWithAdvisor,
    });

    toast.success("Dokument nahrán do trezoru.");
    setFile(null);
    setDocName("");
    setValidUntil("");
    setShareWithAdvisor(false);
    setUploading(false);
    fetchDocs();
  }

  async function toggleShare(doc: VaultDoc) {
    await supabase
      .from("documents")
      .update({ shared_with_advisor: !doc.shared_with_advisor })
      .eq("id", doc.id);
    setDocs((prev) =>
      prev.map((d) => (d.id === doc.id ? { ...d, shared_with_advisor: !d.shared_with_advisor } : d))
    );
    toast.success(doc.shared_with_advisor ? "Sdílení zrušeno" : "Sdíleno s poradcem");
  }

  async function handleDelete(id: string) {
    if (!confirm("Opravdu smazat tento dokument?")) return;
    await supabase.from("documents").delete().eq("id", id);
    setDocs((prev) => prev.filter((d) => d.id !== id));
    toast.success("Dokument smazán.");
  }

  function isExpiringSoon(date: string | null) {
    if (!date) return false;
    const diff = new Date(date).getTime() - Date.now();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const categoryCounts = CATEGORIES.map((cat) => ({
    ...cat,
    count: docs.filter((d) => d.vault_category === cat.key).length,
  }));

  const filteredDocs = selectedCategory
    ? docs.filter((d) => d.vault_category === selectedCategory)
    : docs;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--card-text)] flex items-center gap-2">
          <Lock className="h-6 w-6" /> Dokumentový trezor
        </h1>
        <p className="text-sm text-[var(--card-text-muted)] mt-1">
          Bezpečné úložiště vašich důležitých dokumentů
        </p>
      </div>

      {/* Upload section */}
      <div className="mb-6 rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--card-text)] mb-4">
          Nahrát dokument
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Soubor</Label>
            <Input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Název</Label>
            <Input
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="Název dokumentu"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Kategorie</Label>
            <Select value={docCategory} onValueChange={setDocCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Platnost do</Label>
            <Input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-[var(--card-text-muted)]">
            <input
              type="checkbox"
              checked={shareWithAdvisor}
              onChange={(e) => setShareWithAdvisor(e.target.checked)}
              className="rounded"
            />
            Sdílet s poradcem
          </label>
          <Button onClick={handleUpload} disabled={!file || !docName || uploading}>
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Nahrávám..." : "Nahrát"}
          </Button>
        </div>
      </div>

      {/* Category grid */}
      {!selectedCategory && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {categoryCounts.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className="rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm hover:shadow-md transition-all text-left"
            >
              <cat.icon className="h-8 w-8 text-blue-500 mb-2" />
              <h3 className="font-semibold text-[var(--card-text)]">{cat.label}</h3>
              <p className="text-sm text-[var(--card-text-muted)]">{cat.count} dokumentů</p>
            </button>
          ))}
        </div>
      )}

      {/* Filtered document list */}
      {selectedCategory && (
        <>
          <button
            onClick={() => setSelectedCategory(null)}
            className="mb-4 flex items-center gap-1.5 text-sm text-[var(--card-text-muted)] hover:text-[var(--card-text)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Zpět na kategorie
          </button>

          <h2 className="text-lg font-semibold text-[var(--card-text)] mb-4">
            {CATEGORIES.find((c) => c.key === selectedCategory)?.label}
          </h2>

          {filteredDocs.length === 0 ? (
            <p className="text-center text-[var(--card-text-dim)] py-12">
              Žádné dokumenty v této kategorii
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-xl border bg-[var(--card-bg)] p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-[var(--card-text)]">{doc.name}</h3>
                      <p className="text-xs text-[var(--card-text-muted)]">
                        {new Date(doc.created_at).toLocaleDateString("cs-CZ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {doc.shared_with_advisor && (
                        <Badge className="bg-blue-100 text-blue-700 text-[10px]">
                          Sdíleno
                        </Badge>
                      )}
                    </div>
                  </div>

                  {doc.valid_until && (
                    <div
                      className={`mt-2 text-xs flex items-center gap-1 ${
                        isExpiringSoon(doc.valid_until)
                          ? "text-amber-600"
                          : "text-[var(--card-text-muted)]"
                      }`}
                    >
                      {isExpiringSoon(doc.valid_until) && (
                        <AlertCircle className="h-3 w-3" />
                      )}
                      Platnost do:{" "}
                      {new Date(doc.valid_until).toLocaleDateString("cs-CZ")}
                      {isExpiringSoon(doc.valid_until) && " — brzy vyprší!"}
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(doc.file_url, "_blank")}
                    >
                      <Download className="mr-1 h-3 w-3" /> Stáhnout
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleShare(doc)}
                    >
                      <Share2 className="mr-1 h-3 w-3" />
                      {doc.shared_with_advisor ? "Zrušit sdílení" : "Sdílet"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
