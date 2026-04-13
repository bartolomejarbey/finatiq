import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { requireClientAccess, requirePortalActor } from "@/lib/api/portal-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Deadline {
  type: "contract_expiry" | "payment_due" | "fixation_end";
  title: string;
  client_name: string;
  date: string;
  days_remaining: number;
  severity: "green" | "orange" | "red";
}

function getSeverity(daysRemaining: number): "green" | "orange" | "red" {
  if (daysRemaining < 7) return "red";
  if (daysRemaining <= 30) return "orange";
  return "green";
}

function daysBetween(date1: Date, date2: Date): number {
  const diffMs = date2.getTime() - date1.getTime();
  return Math.ceil(diffMs / 86400000);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const advisorId = searchParams.get("advisor_id");
    const clientId = searchParams.get("client_id");

    const now = new Date();
    const deadlines: Deadline[] = [];

    if (!clientId && !advisorId) {
      return NextResponse.json({ error: "client_id nebo advisor_id je povinné" }, { status: 400 });
    }

    if (clientId) {
      const auth = await requireClientAccess(clientId);
      if ("error" in auth) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
      }
    } else if (advisorId) {
      const auth = await requirePortalActor();
      if ("error" in auth) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
      }
      if (auth.actor.advisorId !== advisorId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Fetch contracts with valid_to set
    let contractsQuery = supabase
      .from("contracts")
      .select("*, clients(first_name, last_name)")
      .not("valid_to", "is", null);

    if (clientId) {
      contractsQuery = contractsQuery.eq("client_id", clientId);
    } else if (advisorId) {
      contractsQuery = contractsQuery.eq("clients.advisor_id", advisorId);
    }

    const { data: contracts } = await contractsQuery;

    if (contracts) {
      for (const contract of contracts) {
        const validTo = new Date(contract.valid_to);
        const daysRemaining = daysBetween(now, validTo);
        const clientData = contract.clients as { first_name?: string; last_name?: string } | null;
        const clientName = clientData
          ? `${clientData.first_name || ""} ${clientData.last_name || ""}`.trim()
          : "Neznamy klient";

        deadlines.push({
          type: "contract_expiry",
          title: `Expirace smlouvy: ${contract.name || contract.title || contract.contract_number || "Smlouva"}`,
          client_name: clientName,
          date: contract.valid_to,
          days_remaining: daysRemaining,
          severity: getSeverity(daysRemaining),
        });

        // Check for fixation end if present
        if (contract.fixation_end) {
          const fixEnd = new Date(contract.fixation_end);
          const fixDays = daysBetween(now, fixEnd);
          deadlines.push({
            type: "fixation_end",
            title: `Konec fixace: ${contract.name || contract.title || contract.contract_number || "Smlouva"}`,
            client_name: clientName,
            date: contract.fixation_end,
            days_remaining: fixDays,
            severity: getSeverity(fixDays),
          });
        }
      }
    }

    // Fetch payments with due_date set and status != 'paid'
    let paymentsQuery = supabase
      .from("payments")
      .select("*, clients(first_name, last_name)")
      .not("due_date", "is", null)
      .neq("status", "paid");

    if (clientId) {
      paymentsQuery = paymentsQuery.eq("client_id", clientId);
    } else if (advisorId) {
      paymentsQuery = paymentsQuery.eq("clients.advisor_id", advisorId);
    }

    const { data: payments } = await paymentsQuery;

    if (payments) {
      for (const payment of payments) {
        const dueDate = new Date(payment.due_date);
        const daysRemaining = daysBetween(now, dueDate);
        const clientData = payment.clients as { first_name?: string; last_name?: string } | null;
        const clientName = clientData
          ? `${clientData.first_name || ""} ${clientData.last_name || ""}`.trim()
          : "Neznamy klient";

        deadlines.push({
          type: "payment_due",
          title: `Splatnost platby: ${Number(payment.amount || 0).toLocaleString("cs-CZ")} Kc`,
          client_name: clientName,
          date: payment.due_date,
          days_remaining: daysRemaining,
          severity: getSeverity(daysRemaining),
        });
      }
    }

    // Sort by days_remaining ascending
    deadlines.sort((a, b) => a.days_remaining - b.days_remaining);

    return NextResponse.json({ deadlines });
  } catch (error) {
    console.error("Deadlines check error:", error);
    return NextResponse.json(
      { error: "Chyba pri kontrole terminu" },
      { status: 500 }
    );
  }
}
