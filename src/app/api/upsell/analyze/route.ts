import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: advisor } = await supabaseAdmin
    .from("advisors")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!advisor) {
    return NextResponse.json({ error: "Advisor not found" }, { status: 404 });
  }

  // Get active rules
  const { data: rules } = await supabaseAdmin
    .from("upsell_rules")
    .select("*")
    .eq("advisor_id", advisor.id)
    .eq("is_active", true);

  if (!rules || rules.length === 0) {
    return NextResponse.json({ generated: 0 });
  }

  // Get clients
  const { data: clients } = await supabaseAdmin
    .from("clients")
    .select("id, first_name, last_name, monthly_income, annual_income, date_of_birth")
    .eq("advisor_id", advisor.id);

  if (!clients || clients.length === 0) {
    return NextResponse.json({ generated: 0 });
  }

  const clientIds = clients.map((c) => c.id);

  // Fetch related data in parallel
  const [contractsRes, investmentsRes, paymentsRes] = await Promise.all([
    supabaseAdmin
      .from("contracts")
      .select("id, client_id, type, title, status, interest_rate, fixation_end, start_date, valid_to, amount")
      .in("client_id", clientIds),
    supabaseAdmin
      .from("investments")
      .select("id, client_id, type, current_value, is_regular")
      .in("client_id", clientIds),
    supabaseAdmin
      .from("payments")
      .select("id, client_id, amount, type")
      .in("client_id", clientIds),
  ]);

  const contracts = contractsRes.data || [];
  const investments = investmentsRes.data || [];
  const payments = paymentsRes.data || [];

  let generated = 0;
  const now = new Date();

  for (const rule of rules) {
    for (const client of clients) {
      let matches = false;
      let descriptionValues = "";

      const clientContracts = contracts.filter((c) => c.client_id === client.id);
      const clientInvestments = investments.filter((i) => i.client_id === client.id);
      const clientPayments = payments.filter((p) => p.client_id === client.id);
      const clientName = `${client.first_name} ${client.last_name}`;

      try {
        switch (rule.rule_type) {
          case "interest_rate_high": {
            const highRate = clientContracts.find(
              (c) => c.interest_rate && c.interest_rate > rule.threshold_value && c.status === "active"
            );
            if (highRate) {
              matches = true;
              descriptionValues = `Úroková sazba ${highRate.interest_rate}% u smlouvy "${highRate.title || ""}".`;
            }
            break;
          }

          case "fixation_ending": {
            const deadline = new Date();
            deadline.setMonth(deadline.getMonth() + rule.threshold_value);
            const ending = clientContracts.find(
              (c) =>
                c.fixation_end &&
                c.status === "active" &&
                new Date(c.fixation_end) <= deadline &&
                new Date(c.fixation_end) >= now
            );
            if (ending) {
              matches = true;
              descriptionValues = `Fixace končí ${new Date(ending.fixation_end).toLocaleDateString("cs-CZ")}.`;
            }
            break;
          }

          case "payment_ratio_high": {
            const monthlyIncome = client.monthly_income || 0;
            if (monthlyIncome > 0) {
              const totalPayments = clientPayments
                .filter((p) => p.type === "loan_payment" || p.type === "mortgage_payment")
                .reduce((s, p) => s + (p.amount || 0), 0);
              const ratio = (totalPayments / monthlyIncome) * 100;
              if (ratio > rule.threshold_value) {
                matches = true;
                descriptionValues = `Poměr splátek k příjmu: ${ratio.toFixed(0)}%.`;
              }
            }
            break;
          }

          case "loan_no_insurance": {
            const loans = clientContracts.filter(
              (c) => (c.type === "loan" || c.type === "mortgage") && c.status === "active"
            );
            const insuranceContracts = clientContracts.filter(
              (c) => c.type === "loan_insurance" || c.type === "payment_protection"
            );
            if (loans.length > 0 && insuranceContracts.length === 0) {
              matches = true;
              descriptionValues = `${loans.length} aktivní(ch) úvěrů bez pojištění.`;
            }
            break;
          }

          case "policy_old": {
            const thresholdDate = new Date();
            thresholdDate.setFullYear(thresholdDate.getFullYear() - rule.threshold_value);
            const oldPolicy = clientContracts.find(
              (c) =>
                (c.type === "insurance" || c.type === "life_insurance") &&
                c.status === "active" &&
                c.start_date &&
                new Date(c.start_date) < thresholdDate
            );
            if (oldPolicy) {
              matches = true;
              descriptionValues = `Pojistka z ${new Date(oldPolicy.start_date).toLocaleDateString("cs-CZ")}.`;
            }
            break;
          }

          case "coverage_low": {
            const annualIncome = client.annual_income || (client.monthly_income ? client.monthly_income * 12 : 0);
            if (annualIncome > 0) {
              const insuranceAmount = clientContracts
                .filter((c) => (c.type === "insurance" || c.type === "life_insurance") && c.status === "active")
                .reduce((s, c) => s + (c.amount || 0), 0);
              if (insuranceAmount > 0 && insuranceAmount < rule.threshold_value * annualIncome) {
                matches = true;
                descriptionValues = `Krytí ${insuranceAmount.toLocaleString("cs-CZ")} Kč vs. potřeba ${(rule.threshold_value * annualIncome).toLocaleString("cs-CZ")} Kč.`;
              }
            }
            break;
          }

          case "missing_accident": {
            const hasAccident = clientContracts.some(
              (c) => c.type === "accident_insurance" && c.status === "active"
            );
            if (!hasAccident && clientContracts.length > 0) {
              matches = true;
              descriptionValues = "Klient nemá úrazové pojištění.";
            }
            break;
          }

          case "missing_property": {
            const hasProperty = clientContracts.some(
              (c) => c.type === "property_insurance" && c.status === "active"
            );
            if (!hasProperty && clientContracts.length > 0) {
              matches = true;
              descriptionValues = "Klient nemá pojištění majetku.";
            }
            break;
          }

          case "savings_high": {
            const savingsValue = clientInvestments
              .filter((i) => i.type === "savings")
              .reduce((s, i) => s + (i.current_value || 0), 0);
            if (savingsValue > rule.threshold_value) {
              matches = true;
              descriptionValues = `Úspory: ${savingsValue.toLocaleString("cs-CZ")} Kč.`;
            }
            break;
          }

          case "no_regular_saving": {
            const hasRegular = clientInvestments.some((i) => i.is_regular);
            if (!hasRegular && clientInvestments.length > 0) {
              matches = true;
              descriptionValues = "Klient nemá pravidelnou investici.";
            }
            break;
          }

          case "contract_expiring": {
            const expiryDeadline = new Date();
            expiryDeadline.setDate(expiryDeadline.getDate() + rule.threshold_value);
            const expiring = clientContracts.filter(
              (c) =>
                c.status === "active" &&
                c.valid_to &&
                new Date(c.valid_to) <= expiryDeadline &&
                new Date(c.valid_to) >= now
            );
            if (expiring.length > 0) {
              matches = true;
              descriptionValues = `${expiring.length} smluv vyprší do ${rule.threshold_value} dní.`;
            }
            break;
          }

          case "near_retirement": {
            if (client.date_of_birth) {
              const age = Math.floor(
                (now.getTime() - new Date(client.date_of_birth).getTime()) /
                  (365.25 * 24 * 60 * 60 * 1000)
              );
              const yearsToRetirement = 65 - age;
              if (yearsToRetirement > 0 && yearsToRetirement <= rule.threshold_value) {
                matches = true;
                descriptionValues = `Věk ${age} let, do důchodu ${yearsToRetirement} let.`;
              }
            }
            break;
          }

          default:
            // Unknown rule type — skip
            break;
        }
      } catch {
        // Data insufficient for this rule/client combo — skip
        continue;
      }

      if (matches) {
        // Check for existing non-resolved alert
        const { data: existing } = await supabaseAdmin
          .from("upsell_alerts")
          .select("id")
          .eq("advisor_id", advisor.id)
          .eq("client_id", client.id)
          .eq("rule_id", rule.id)
          .in("status", ["new", "contacted"])
          .limit(1);

        if (!existing || existing.length === 0) {
          const description = rule.message_template
            .replace("{threshold}", String(rule.threshold_value))
            + (descriptionValues ? ` ${descriptionValues}` : "");

          await supabaseAdmin.from("upsell_alerts").insert({
            advisor_id: advisor.id,
            client_id: client.id,
            rule_id: rule.id,
            title: `${clientName} — ${rule.rule_type}`,
            description,
            status: "new",
            priority: rule.priority,
            category: rule.category,
          });
          generated++;
        }
      }
    }
  }

  return NextResponse.json({ generated });
}
