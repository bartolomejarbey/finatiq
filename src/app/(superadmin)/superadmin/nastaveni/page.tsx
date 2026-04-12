"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Loader2, Settings, Layout, FileText, Brain } from "lucide-react";
import { toast } from "sonner";

export default function SuperadminSettingsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [platformName, setPlatformName] = useState("Finatiq");
  const [platformContact, setPlatformContact] = useState("");

  const [defaultStages, setDefaultStages] = useState("Nový lead\nKontaktován\nSchůzka\nNabídka\nUzavřeno - výhra\nUzavřeno - prohra");
  const [defaultTemplatesInfo, setDefaultTemplatesInfo] = useState("5 výchozích šablon (Úvodní kontakt, Nabídka, Follow-up, Poděkování, Připomínka)");

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 rounded-xl" /></div>;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Nastavení platformy</h1>

      {/* Platform info */}
      <div className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition-all">
        <div className="mb-4 flex items-center gap-2">
          <Settings className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Platforma</h2>
        </div>
        <div className="space-y-4">
          <div className="space-y-1"><Label className="text-xs">Název platformy</Label><Input value={platformName} onChange={(e) => setPlatformName(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Kontaktní email</Label><Input value={platformContact} onChange={(e) => setPlatformContact(e.target.value)} placeholder="admin@finadvisor.cz" /></div>
          <Button size="sm" onClick={() => toast.success("Nastavení uloženo.")} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}Uložit
          </Button>
        </div>
      </div>

      <Separator className="my-6" />

      {/* Default pipeline stages */}
      <div className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition-all">
        <div className="mb-4 flex items-center gap-2">
          <Layout className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Výchozí pipeline fáze</h2>
        </div>
        <p className="mb-3 text-xs text-slate-500">Tyto fáze se vytvoří při registraci nového poradce. Jeden název na řádek.</p>
        <Textarea value={defaultStages} onChange={(e) => setDefaultStages(e.target.value)} rows={6} />
        <Button size="sm" className="mt-3" onClick={() => toast.success("Fáze uloženy.")} disabled={saving}>Uložit fáze</Button>
      </div>

      <Separator className="my-6" />

      {/* Default templates */}
      <div className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition-all">
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Výchozí emailové šablony</h2>
        </div>
        <p className="text-sm text-slate-600">{defaultTemplatesInfo}</p>
        <p className="mt-2 text-xs text-slate-500">Šablony se automaticky vytvoří při registraci nového poradce. Editace v kódu (register route).</p>
      </div>

      <Separator className="my-6" />

      {/* Default AI rules */}
      <div className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition-all">
        <div className="mb-4 flex items-center gap-2">
          <Brain className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Výchozí AI pravidla</h2>
        </div>
        <p className="text-sm text-slate-600">Výchozí upsell pravidla nejsou zatím nastavena.</p>
        <p className="mt-2 text-xs text-slate-500">AI pravidla si každý poradce nastavuje sám v sekci Nastavení → AI pravidla.</p>
      </div>
    </div>
  );
}
