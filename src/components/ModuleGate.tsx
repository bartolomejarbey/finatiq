"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Lock, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ModuleGateProps {
  moduleKey: string;
  moduleName: string;
  moduleDescription: string;
  children: React.ReactNode;
}

interface PlanInfo {
  name: string;
  price_monthly: number;
}

/**
 * Wraps a module page. Checks:
 * 1. Is the module in the advisor's subscription plan? → if not, paywall
 * 2. Is the module enabled by the advisor? → if not, redirect to /advisor
 * 3. Is the module in an active trial? → allow access
 */
export function ModuleGate({ moduleKey, moduleName, moduleDescription, children }: ModuleGateProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "allowed" | "paywall" | "disabled">("loading");
  const [requiredPlan, setRequiredPlan] = useState<PlanInfo | null>(null);

  useEffect(() => {
    async function check() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: advisor } = await supabase
        .from("advisors")
        .select("id, enabled_modules, feature_trials, selected_plan_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!advisor) { setStatus("allowed"); return; }

      const enabledModules = (advisor.enabled_modules as Record<string, boolean>) || {};
      const featureTrials = (advisor.feature_trials as Record<string, string>) || {};

      // Check trial access
      const trialExpiry = featureTrials[moduleKey];
      const hasActiveTrial = trialExpiry && new Date(trialExpiry) > new Date();

      // Check plan features
      let inPlan = true;
      if (advisor.selected_plan_id) {
        const { data: plan } = await supabase
          .from("subscription_plans")
          .select("name, price_monthly, features")
          .eq("id", advisor.selected_plan_id)
          .single();

        if (plan) {
          const features = (plan.features as Record<string, boolean>) || {};
          if (features[moduleKey] === false || (moduleKey in features === false && Object.keys(features).length > 0)) {
            // Module not in plan — but check if it's explicitly included
            if (features[moduleKey] !== true) {
              inPlan = false;
            }
          }

          if (!inPlan && !hasActiveTrial) {
            // Find which plan includes this module
            const { data: plans } = await supabase
              .from("subscription_plans")
              .select("name, price_monthly, features")
              .eq("is_active", true)
              .order("price_monthly", { ascending: true });

            if (plans) {
              const targetPlan = plans.find((p) => {
                const f = (p.features as Record<string, boolean>) || {};
                return f[moduleKey] === true;
              });
              if (targetPlan) {
                setRequiredPlan({ name: targetPlan.name, price_monthly: targetPlan.price_monthly });
              }
            }

            setStatus("paywall");
            return;
          }
        }
      }

      // Check if module is enabled (advisor toggle)
      if (enabledModules[moduleKey] === false && !hasActiveTrial) {
        // Module is disabled by advisor — redirect
        setStatus("disabled");
        return;
      }

      setStatus("allowed");
    }

    check();
  }, [moduleKey, router]);

  useEffect(() => {
    if (status === "disabled") {
      router.replace("/advisor");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--card-text-dim)]" />
      </div>
    );
  }

  if (status === "paywall") {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--table-header)]">
            <Lock className="h-7 w-7 text-[var(--card-text-dim)]" />
          </div>
          <h1 className="text-xl font-semibold text-[var(--card-text)] mb-2">{moduleName}</h1>
          <p className="text-sm text-[var(--card-text-muted)] mb-6 leading-relaxed">
            {moduleDescription}
          </p>
          {requiredPlan && (
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4 mb-6">
              <p className="text-sm text-[var(--card-text-muted)]">
                Tato funkce je dostupná od plánu
              </p>
              <p className="text-lg font-semibold text-[var(--card-text)] mt-1">
                {requiredPlan.name}
                <span className="text-sm font-normal text-[var(--card-text-dim)] ml-2">
                  ({requiredPlan.price_monthly} Kč/měs.)
                </span>
              </p>
            </div>
          )}
          <Button
            onClick={() => router.push("/advisor/predplatne")}
            className="h-10 px-6 cursor-pointer"
          >
            Upgradovat plán
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (status === "disabled") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--card-text-dim)]" />
      </div>
    );
  }

  return <>{children}</>;
}
