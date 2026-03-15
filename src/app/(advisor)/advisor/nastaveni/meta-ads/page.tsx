"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Link2, Unlink, Copy, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MetaAdsPage() {
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [adAccountId, setAdAccountId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadStatus();

    // Check URL params for success/error
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");

    if (success === "true") {
      toast.success("Meta Ads bylo úspěšně propojeno!");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (error) {
      toast.error(`Chyba propojení: ${error}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadStatus() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: advisor } = await supabase
        .from("advisors")
        .select("meta_token, meta_ad_account_id")
        .eq("user_id", user.id)
        .single();

      if (advisor?.meta_token) {
        setConnected(true);
        setAdAccountId(advisor.meta_ad_account_id || null);
      }
    } catch (err) {
      console.error("Failed to load Meta status:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleConnect() {
    const clientId = process.env.NEXT_PUBLIC_META_APP_ID;
    if (!clientId) {
      toast.error("Meta App ID není nakonfigurováno");
      return;
    }

    const redirectUri = `${window.location.origin}/api/meta/callback`;
    const scope = "ads_management,ads_read,leads_retrieval,pages_show_list";

    const oauthUrl =
      `https://www.facebook.com/v18.0/dialog/oauth` +
      `?client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${scope}` +
      `&response_type=code`;

    window.location.href = oauthUrl;
  }

  async function handleDisconnect() {
    if (!confirm("Opravdu chcete odpojit Meta Ads?")) return;

    setDisconnecting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("advisors")
        .update({ meta_token: null, meta_ad_account_id: null })
        .eq("user_id", user.id);

      if (error) {
        toast.error("Nepodařilo se odpojit Meta Ads");
        return;
      }

      setConnected(false);
      setAdAccountId(null);
      toast.success("Meta Ads bylo odpojeno");
    } catch (err) {
      console.error("Disconnect error:", err);
      toast.error("Chyba při odpojování");
    } finally {
      setDisconnecting(false);
    }
  }

  function copyWebhookUrl() {
    const url = `${window.location.origin}/api/webhooks/meta-leads`;
    navigator.clipboard.writeText(url);
    toast.success("URL zkopírováno do schránky");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--card-text)" }} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--card-text)" }}
        >
          Propojení s Meta Ads
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted-text)" }}>
          Propojte svůj Meta (Facebook) reklamní účet pro automatický import
          leadů a sledování konverzí.
        </p>
      </div>

      {/* Status Card */}
      <div
        className="rounded-2xl border p-6"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--card-border)",
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`h-3 w-3 rounded-full ${connected ? "bg-green-500" : "bg-red-400"}`}
          />
          <span
            className="font-semibold text-lg"
            style={{ color: "var(--card-text)" }}
          >
            {connected
              ? `Propojeno — Ad Account: ${adAccountId || "N/A"}`
              : "Nepropojeno"}
          </span>
        </div>

        {!connected ? (
          <Button
            onClick={handleConnect}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-2xl"
          >
            <Link2 className="h-4 w-4 mr-2" />
            Propojit Meta Ads
          </Button>
        ) : (
          <Button
            onClick={handleDisconnect}
            disabled={disconnecting}
            variant="destructive"
            className="rounded-2xl"
          >
            {disconnecting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Unlink className="h-4 w-4 mr-2" />
            )}
            Odpojit
          </Button>
        )}
      </div>

      {/* Webhook Info (shown when connected) */}
      {connected && (
        <>
          <div
            className="rounded-2xl border p-6 space-y-4"
            style={{
              backgroundColor: "var(--card-bg)",
              borderColor: "var(--card-border)",
            }}
          >
            <h2
              className="text-lg font-semibold"
              style={{ color: "var(--card-text)" }}
            >
              Webhook pro Lead Forms
            </h2>
            <p className="text-sm" style={{ color: "var(--muted-text)" }}>
              Tento URL zadejte v Meta Business Manager jako webhook pro lead
              forms:
            </p>
            <div
              className="flex items-center gap-2 p-3 rounded-xl font-mono text-sm"
              style={{
                backgroundColor: "var(--card-border)",
                color: "var(--card-text)",
              }}
            >
              <span className="truncate flex-1">
                {typeof window !== "undefined"
                  ? `${window.location.origin}/api/webhooks/meta-leads`
                  : "/api/webhooks/meta-leads"}
              </span>
              <button
                onClick={copyWebhookUrl}
                className="p-1.5 rounded-lg hover:opacity-80 transition-opacity shrink-0"
                title="Kopírovat URL"
              >
                <Copy className="h-4 w-4" style={{ color: "var(--card-text)" }} />
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div
            className="rounded-2xl border p-6 space-y-4"
            style={{
              backgroundColor: "var(--card-bg)",
              borderColor: "var(--card-border)",
            }}
          >
            <h2
              className="text-lg font-semibold"
              style={{ color: "var(--card-text)" }}
            >
              Nastavení webhooku v Meta Business Manager
            </h2>
            <ol
              className="list-decimal list-inside space-y-3 text-sm"
              style={{ color: "var(--card-text)" }}
            >
              <li>
                Otevřete{" "}
                <a
                  href="https://business.facebook.com/settings/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-500 hover:underline inline-flex items-center gap-1"
                >
                  Meta Business Manager
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                Přejděte do sekce <strong>Integrations</strong> &rarr;{" "}
                <strong>Leads Access</strong> (nebo{" "}
                <strong>All tools</strong> &rarr; <strong>Leads Center</strong>)
              </li>
              <li>
                Klikněte na <strong>CRM</strong> a vyberte{" "}
                <strong>Connect CRM</strong> &rarr;{" "}
                <strong>Connect through Webhooks</strong>
              </li>
              <li>
                Vložte výše uvedený webhook URL do pole{" "}
                <strong>Callback URL</strong>
              </li>
              <li>
                Jako <strong>Verify Token</strong> zadejte stejný token, který
                máte nastavený v proměnné prostředí{" "}
                <code
                  className="px-1.5 py-0.5 rounded text-xs"
                  style={{ backgroundColor: "var(--card-border)" }}
                >
                  META_WEBHOOK_VERIFY_TOKEN
                </code>
              </li>
              <li>
                Klikněte na <strong>Verify and Save</strong>
              </li>
              <li>
                Přiřaďte webhook ke svým lead formulářům v sekci{" "}
                <strong>Forms Library</strong>
              </li>
            </ol>
            <p
              className="text-xs mt-4"
              style={{ color: "var(--muted-text)" }}
            >
              Po nastavení webhooku se nové leady z Meta lead formulářů budou
              automaticky zobrazovat ve vašem CRM jako noví klienti a dealy.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
