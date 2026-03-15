# Superadmin Upgrade Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade superadmin panel with dynamic pricing plans, automated invoicing, per-feature trials, live chat, and enhanced dashboard.

**Architecture:** Five independent blocks building on existing Supabase + Next.js App Router patterns. Each block adds DB columns, API routes, and UI components. All follow existing shadcn/ui + Recharts + Sonner patterns.

**Tech Stack:** Next.js 16 (App Router), Supabase (service_role for API/cron, anon for pages), Recharts, shadcn/ui, jsPDF, Resend email, Supabase Realtime.

**Spec:** `docs/superpowers/specs/2026-03-15-superadmin-upgrade-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/app/api/public/plans/route.ts` | Public GET endpoint for active pricing plans |
| `src/app/api/cron/monthly-invoices/route.ts` | Monthly invoice generation cron |
| `src/app/api/advisor/invoice/[id]/pdf/route.ts` | PDF invoice generation |
| `src/app/(advisor)/advisor/nastaveni/fakturace/page.tsx` | Advisor's invoice list + billing info |
| `src/components/SuperadminChatWidget.tsx` | Floating live chat widget for superadmin |
| `src/components/PlanCard.tsx` | Shared plan card component (landing + cenik + preview) |

### Modified Files
| File | Changes |
|------|---------|
| `src/app/page.tsx` | Replace hardcoded PLAN_DATA with fetch from `/api/public/plans`, use PlanCard |
| `src/app/(marketing)/cenik/page.tsx` | Replace direct Supabase query with `/api/public/plans` fetch, use PlanCard |
| `src/app/(superadmin)/superadmin/plany/page.tsx` | Add description, perks, badge, trial_days, sort_order fields + live preview |
| `src/app/(superadmin)/superadmin/fakturace/page.tsx` | Add generate button calling cron, mark-paid with date, enhanced CSV |
| `src/app/(superadmin)/superadmin/poradci/[id]/page.tsx` | Add feature trials section + DM button |
| `src/app/(superadmin)/superadmin/page.tsx` | Enhanced KPIs, trial→paid chart, activity feed, quick actions |
| `src/app/(superadmin)/layout.tsx` | Add SuperadminChatWidget |
| `src/app/(advisor)/layout.tsx` | Feature trial check in module filtering |
| `src/app/api/cron/daily/route.ts` | Invoice reminders + feature trial expiry checks |
| `src/lib/email/templates.ts` | 10 new email templates |
| `package.json` | Add jspdf |

---

## Chunk 1: Dynamic Plans (BLOK 1)

### Task 1: Public Plans API

**Files:**
- Create: `src/app/api/public/plans/route.ts`

- [ ] **Step 1: Create the API route**

```typescript
// src/app/api/public/plans/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("pricing_plans")
      .select("id, name, tier, price_monthly, max_clients, features, is_active, description, perks, sort_order, badge, trial_days")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) throw error;

    return NextResponse.json(data ?? [], {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
```

- [ ] **Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds (new columns won't exist in DB yet but API returns empty/errors gracefully)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/public/plans/route.ts
git commit -m "feat(plans): add public plans API endpoint"
```

---

### Task 2: Shared PlanCard Component

**Files:**
- Create: `src/components/PlanCard.tsx`

- [ ] **Step 1: Create the shared PlanCard component**

This component will be used on landing page, /cenik, and as live preview in superadmin. Extract the card rendering pattern from the existing landing page pricing section (src/app/page.tsx lines 153-205 pattern).

```typescript
// src/components/PlanCard.tsx
"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

export interface PlanData {
  id?: string;
  name: string;
  tier?: string;
  price_monthly: number;
  max_clients: number;
  features: Record<string, boolean>;
  description?: string | null;
  perks?: string[] | null;
  badge?: string | null;
  trial_days?: number | null;
}

const FEATURE_LABELS: Record<string, string> = {
  crm: "CRM & Pipeline",
  portal: "Klientský portál",
  templates: "Šablony smluv",
  scoring: "Lead scoring",
  automations: "Automatizace",
  meta_ads: "Meta Ads integrace",
  ocr: "OCR dokumentů",
  ai_assistant: "AI asistent",
  osvc: "OSVČ modul",
  calendar: "Kalendář & sync",
};

export function PlanCard({
  plan,
  featured = false,
  showCta = true,
}: {
  plan: PlanData;
  featured?: boolean;
  showCta?: boolean;
}) {
  const enabledFeatures = Object.entries(plan.features || {})
    .filter(([, v]) => v)
    .map(([k]) => FEATURE_LABELS[k] || k);

  return (
    <div
      className={`relative rounded-2xl border p-8 flex flex-col ${
        featured
          ? "border-[#22d3ee]/40 bg-[#22d3ee]/[.04] ring-1 ring-[#22d3ee]/20"
          : "border-white/[.06] bg-white/[.02]"
      }`}
    >
      {plan.badge && (
        <span className="absolute -top-3 left-6 bg-[#22d3ee] text-[#060d1a] font-[Oswald] text-[.65rem] uppercase tracking-[3px] px-3 py-1 font-bold">
          {plan.badge}
        </span>
      )}
      <h3 className="font-[Oswald] text-xl font-bold uppercase tracking-[2px] text-white">
        {plan.name}
      </h3>
      {plan.description && (
        <p className="font-[DM_Sans] text-sm text-white/40 mt-2">{plan.description}</p>
      )}
      <div className="mt-4 flex items-baseline gap-1">
        <span className="font-[Oswald] text-4xl font-bold text-white">
          {plan.price_monthly === 0 ? "Zdarma" : `${plan.price_monthly.toLocaleString("cs-CZ")} Kč`}
        </span>
        {plan.price_monthly > 0 && (
          <span className="font-[DM_Sans] text-sm text-white/30">/měsíc</span>
        )}
      </div>
      <p className="font-[DM_Sans] text-xs text-white/30 mt-1">
        max {plan.max_clients} klientů
      </p>
      <ul className="mt-6 space-y-2 flex-1">
        {enabledFeatures.map((f) => (
          <li key={f} className="flex items-center gap-2 font-[DM_Sans] text-sm text-white/60">
            <span className="text-[#22d3ee]">&#10003;</span> {f}
          </li>
        ))}
      </ul>
      {plan.perks && plan.perks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/[.06] space-y-1.5">
          {plan.perks.map((perk, i) => (
            <p key={i} className="font-[DM_Sans] text-xs text-[#22d3ee]/80">
              ★ {perk}
            </p>
          ))}
        </div>
      )}
      {showCta && (
        <Link
          href="/register"
          className={`mt-6 flex items-center justify-center gap-2 font-[Oswald] text-sm uppercase tracking-[2px] px-6 py-3 font-bold transition-colors ${
            featured
              ? "bg-[#22d3ee] text-[#060d1a] hover:bg-[#22d3ee]/90"
              : "border border-white/10 text-white/60 hover:text-white hover:border-white/20"
          }`}
          style={{
            clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))",
          }}
        >
          Začít {plan.trial_days ? `${plan.trial_days} dní zdarma` : "zdarma"}
          <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add src/components/PlanCard.tsx
git commit -m "feat(plans): add shared PlanCard component"
```

---

### Task 3: Update Landing Page Pricing Section

**Files:**
- Modify: `src/app/page.tsx` — replace PLAN_DATA constant (lines ~153-205) and pricing card rendering with dynamic fetch + PlanCard

- [ ] **Step 1: Add state and fetch logic**

At the top of the Home component (after existing useState calls), add:

```typescript
const [plans, setPlans] = useState<PlanData[]>([]);
const [plansLoading, setPlansLoading] = useState(true);

useEffect(() => {
  fetch("/api/public/plans")
    .then((r) => r.json())
    .then((data) => { setPlans(data); setPlansLoading(false); })
    .catch(() => setPlansLoading(false));
}, []);
```

Import PlanCard and PlanData at the top:
```typescript
import { PlanCard, type PlanData } from "@/components/PlanCard";
```

- [ ] **Step 2: Replace hardcoded pricing cards with dynamic rendering**

Find the pricing section (search for PLAN_DATA usage or the pricing grid). Replace the hardcoded plan card mapping with:

```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
  {plansLoading ? (
    Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="rounded-2xl border border-white/[.06] bg-white/[.02] p-8 animate-pulse h-96" />
    ))
  ) : plans.length > 0 ? (
    plans.map((plan, i) => (
      <PlanCard key={plan.id || i} plan={plan} featured={i === 1} />
    ))
  ) : (
    /* Fallback to PLAN_DATA if API fails - keep existing hardcoded array as fallback */
    PLAN_DATA.map((plan, i) => (
      <PlanCard
        key={plan.slug}
        plan={{
          name: plan.name,
          price_monthly: plan.price,
          max_clients: plan.maxClients,
          features: {},
          description: plan.desc,
          perks: [],
          badge: plan.featured ? "Nejoblíbenější" : null,
        }}
        featured={plan.featured}
      />
    ))
  )}
</div>
```

- [ ] **Step 3: Remove old PLAN_DATA constant** (lines ~153-205) — keep it as a fallback const but simplify it. Actually, keep it for the fallback case above.

- [ ] **Step 4: Verify build**

Run: `npx next build 2>&1 | tail -5`

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(plans): dynamic pricing section on landing page"
```

---

### Task 4: Update /cenik Page

**Files:**
- Modify: `src/app/(marketing)/cenik/page.tsx` — replace Supabase direct query with `/api/public/plans` fetch, use PlanCard

- [ ] **Step 1: Replace Supabase fetch with API fetch**

In the useEffect (lines ~131-148), replace the direct Supabase query with:

```typescript
useEffect(() => {
  fetch("/api/public/plans")
    .then((r) => r.json())
    .then((data: Plan[]) => { setPlans(data); setLoading(false); })
    .catch(() => setLoading(false));
}, []);
```

Remove the Supabase import if no longer needed. Import PlanCard:
```typescript
import { PlanCard } from "@/components/PlanCard";
```

- [ ] **Step 2: Replace plan card rendering with PlanCard component**

In the pricing cards section (lines ~184-283), replace inline card rendering with PlanCard usage. Keep the comparison table as-is but generate it from the fetched plans data.

- [ ] **Step 3: Verify build**

Run: `npx next build 2>&1 | tail -5`

- [ ] **Step 4: Commit**

```bash
git add src/app/(marketing)/cenik/page.tsx
git commit -m "feat(plans): dynamic pricing on /cenik page"
```

---

### Task 5: Upgrade Superadmin /plany CRUD

**Files:**
- Modify: `src/app/(superadmin)/superadmin/plany/page.tsx` — add new fields + live preview

- [ ] **Step 1: Extend Plan interface and form state**

Add to the Plan interface (line ~20-28):
```typescript
description?: string | null;
perks?: string[] | null;
sort_order?: number;
badge?: string | null;
trial_days?: number;
```

Add corresponding state in the edit form (extend openEdit and handleSave).

- [ ] **Step 2: Add form fields for new columns**

In the Dialog modal, add:
- `description` — Textarea
- `perks` — Text input + Add button + list of items with X remove
- `badge` — Input
- `trial_days` — Number input
- `sort_order` — Number input

- [ ] **Step 3: Add live preview**

Below the form in the dialog, add:
```tsx
import { PlanCard } from "@/components/PlanCard";

{/* Live preview */}
<div className="mt-4 p-4 bg-[#060d1a] rounded-xl">
  <p className="text-xs text-white/40 mb-2 font-[JetBrains_Mono]">NÁHLED NA WEBU</p>
  <PlanCard
    plan={{
      name: formName,
      price_monthly: formPrice,
      max_clients: formMaxClients,
      features: formFeatures,
      description: formDescription,
      perks: formPerks,
      badge: formBadge,
      trial_days: formTrialDays,
    }}
    featured={false}
    showCta={false}
  />
</div>
```

- [ ] **Step 4: Update table to show new columns**

Add columns for badge, sort_order, trial_days in the plans list table.

- [ ] **Step 5: Verify build**

Run: `npx next build 2>&1 | tail -5`

- [ ] **Step 6: Commit**

```bash
git add src/app/(superadmin)/superadmin/plany/page.tsx
git commit -m "feat(plans): extended CRUD with description, perks, badge, preview"
```

---

## Chunk 2: Automated Invoicing (BLOK 2)

### Task 6: Install jsPDF

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install jspdf**

Run: `npm install jspdf`

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add jspdf dependency"
```

---

### Task 7: Monthly Invoice Cron

**Files:**
- Create: `src/app/api/cron/monthly-invoices/route.ts`

- [ ] **Step 1: Create the cron endpoint**

```typescript
// src/app/api/cron/monthly-invoices/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/resend";
import { invoiceReady } from "@/lib/email/templates";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + 14);

  // Get active advisors with their plans
  const { data: advisors } = await supabase
    .from("advisors")
    .select("id, user_id, company_name, email, billing_dic, selected_plan_id, subscription_status")
    .eq("subscription_status", "active");

  if (!advisors || advisors.length === 0) {
    return NextResponse.json({ generated: 0 });
  }

  // Get existing invoices for this period
  const { data: existing } = await supabase
    .from("invoices")
    .select("advisor_id")
    .eq("period", period);
  const existingSet = new Set((existing || []).map((i) => i.advisor_id));

  // Get plan prices
  const planIds = [...new Set(advisors.map((a) => a.selected_plan_id).filter(Boolean))];
  const { data: plans } = await supabase
    .from("pricing_plans")
    .select("id, name, price_monthly")
    .in("id", planIds);
  const planMap = Object.fromEntries((plans || []).map((p) => [p.id, p]));

  // Count existing invoices this period for numbering
  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .like("invoice_number", `${period.replace("-", "")}-`);
  let seq = (count || 0) + 1;

  let generated = 0;

  for (const advisor of advisors) {
    if (existingSet.has(advisor.id)) continue;
    const plan = planMap[advisor.selected_plan_id];
    if (!plan || plan.price_monthly <= 0) continue;

    const vatApplied = !!advisor.billing_dic;
    const amount = plan.price_monthly;
    const vatAmount = vatApplied ? Math.round(amount * 0.21 * 100) / 100 : 0;
    const totalWithVat = amount + vatAmount;
    const invoiceNumber = `${period.replace("-", "")}-${String(seq).padStart(3, "0")}`;

    const { error } = await supabase.from("invoices").insert({
      advisor_id: advisor.id,
      period,
      amount,
      vat_amount: vatAmount,
      total_with_vat: totalWithVat,
      vat_applied: vatApplied,
      invoice_number: invoiceNumber,
      status: "issued",
      due_date: dueDate.toISOString().split("T")[0],
    });

    if (!error) {
      seq++;
      generated++;
      // Send email
      if (advisor.email) {
        const tpl = invoiceReady(
          advisor.company_name || "Poradce",
          totalWithVat,
          period,
          dueDate.toLocaleDateString("cs-CZ")
        );
        await sendEmail(advisor.email, tpl.subject, tpl.html).catch(() => {});
      }
    }
  }

  return NextResponse.json({ generated, period });
}
```

- [ ] **Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/monthly-invoices/route.ts
git commit -m "feat(invoicing): monthly invoice generation cron endpoint"
```

---

### Task 8: PDF Invoice Generation

**Files:**
- Create: `src/app/api/advisor/invoice/[id]/pdf/route.ts`

- [ ] **Step 1: Create PDF generation route**

```typescript
// src/app/api/advisor/invoice/[id]/pdf/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Fetch invoice + advisor data
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, advisors(company_name, email, billing_name, billing_ico, billing_dic, billing_address)")
    .eq("id", id)
    .single();

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const advisor = invoice.advisors;
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.text("FAKTURA", 20, 25);
  doc.setFontSize(10);
  doc.text(`Číslo: ${invoice.invoice_number}`, 20, 35);
  doc.text(`Datum vystavení: ${new Date(invoice.created_at).toLocaleDateString("cs-CZ")}`, 20, 42);
  doc.text(`Datum splatnosti: ${new Date(invoice.due_date).toLocaleDateString("cs-CZ")}`, 20, 49);

  // Supplier
  doc.setFontSize(11);
  doc.text("Dodavatel:", 20, 65);
  doc.setFontSize(9);
  doc.text("Harotas s.r.o.", 20, 72);
  doc.text("IČO: 21402027 | DIČ: CZ21402027", 20, 78);
  doc.text("Školská 689/20, Nové Město, 110 00 Praha 1", 20, 84);

  // Customer
  doc.setFontSize(11);
  doc.text("Odběratel:", 120, 65);
  doc.setFontSize(9);
  doc.text(advisor?.billing_name || advisor?.company_name || "—", 120, 72);
  if (advisor?.billing_ico) doc.text(`IČO: ${advisor.billing_ico}`, 120, 78);
  if (advisor?.billing_dic) doc.text(`DIČ: ${advisor.billing_dic}`, 120, 84);
  if (advisor?.billing_address) doc.text(advisor.billing_address, 120, 90);

  // Table header
  let y = 110;
  doc.setFillColor(240, 240, 240);
  doc.rect(20, y - 5, 170, 8, "F");
  doc.setFontSize(9);
  doc.text("Položka", 22, y);
  doc.text("Období", 100, y);
  doc.text("Částka", 155, y);

  // Table row
  y += 12;
  doc.text(`Předplatné Finatiq`, 22, y);
  doc.text(invoice.period, 100, y);
  doc.text(`${invoice.amount.toLocaleString("cs-CZ")} Kč`, 155, y);

  // Totals
  y += 20;
  doc.text(`Základ: ${invoice.amount.toLocaleString("cs-CZ")} Kč`, 130, y);
  if (invoice.vat_applied) {
    y += 7;
    doc.text(`DPH 21%: ${invoice.vat_amount.toLocaleString("cs-CZ")} Kč`, 130, y);
  }
  y += 7;
  doc.setFontSize(11);
  doc.text(`Celkem: ${(invoice.total_with_vat || invoice.amount).toLocaleString("cs-CZ")} Kč`, 130, y);

  // Payment info
  y += 20;
  doc.setFontSize(9);
  doc.text("Platební údaje:", 20, y);
  y += 7;
  doc.text("Banka: Fio banka", 20, y);
  y += 6;
  const vs = (invoice.invoice_number || "").replace(/-/g, "");
  doc.text(`VS: ${vs}`, 20, y);

  // QR payment (SPD format)
  y += 15;
  doc.setFontSize(8);
  doc.text("QR platba — naskenujte v bankovní aplikaci", 20, y);

  const pdfBuffer = doc.output("arraybuffer");

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="faktura-${invoice.invoice_number}.pdf"`,
    },
  });
}
```

- [ ] **Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/advisor/invoice/[id]/pdf/route.ts
git commit -m "feat(invoicing): PDF invoice generation endpoint"
```

---

### Task 9: Invoice Email Templates

**Files:**
- Modify: `src/lib/email/templates.ts` — add invoiceReady, invoiceDueSoon, invoiceOverdue, invoiceSecondReminder, subscriptionSuspended

- [ ] **Step 1: Add 5 invoice-related email templates**

Append to the end of `src/lib/email/templates.ts` (before final closing), following the existing pattern (using `layout`, `p`, `btn`, `muted` helpers):

```typescript
export function invoiceReady(name: string, amount: number, period: string, dueDate: string) {
  return {
    subject: `Faktura za ${period} — Finatiq`,
    html: layout(`
      ${p(`Dobrý den, ${name},`)}
      ${p(`vaše faktura za období <strong>${period}</strong> byla vystavena.`)}
      ${p(`Částka: <strong>${amount.toLocaleString("cs-CZ")} Kč</strong>`)}
      ${p(`Splatnost: <strong>${dueDate}</strong>`)}
      ${p("Fakturu si můžete stáhnout ve svém portálu v sekci Nastavení → Fakturace.")}
      ${btn("Zobrazit fakturu", "https://www.finatiq.cz/advisor/nastaveni/fakturace")}
    `),
  };
}

export function invoiceDueSoon(name: string, amount: number, dueDate: string) {
  return {
    subject: "Připomínka splatnosti faktury — Finatiq",
    html: layout(`
      ${p(`Dobrý den, ${name},`)}
      ${p(`připomínáme, že vaše faktura ve výši <strong>${amount.toLocaleString("cs-CZ")} Kč</strong> je splatná <strong>${dueDate}</strong>.`)}
      ${btn("Zobrazit fakturu", "https://www.finatiq.cz/advisor/nastaveni/fakturace")}
    `),
  };
}

export function invoiceOverdue(name: string, amount: number, dueDate: string) {
  return {
    subject: "Faktura po splatnosti — Finatiq",
    html: layout(`
      ${p(`Dobrý den, ${name},`)}
      ${p(`vaše faktura ve výši <strong>${amount.toLocaleString("cs-CZ")} Kč</strong> byla splatná <strong>${dueDate}</strong> a dosud nebyla uhrazena.`)}
      ${p("Prosíme o co nejrychlejší úhradu.")}
      ${btn("Zobrazit fakturu", "https://www.finatiq.cz/advisor/nastaveni/fakturace")}
    `),
  };
}

export function invoiceSecondReminder(name: string, amount: number) {
  return {
    subject: "Druhá upomínka — neuhrazená faktura — Finatiq",
    html: layout(`
      ${p(`Dobrý den, ${name},`)}
      ${p(`vaše faktura ve výši <strong>${amount.toLocaleString("cs-CZ")} Kč</strong> je stále neuhrazena.`)}
      ${p("Pokud nebude uhrazena do 7 dní, bude váš účet pozastaven.")}
      ${btn("Uhradit nyní", "https://www.finatiq.cz/advisor/nastaveni/fakturace")}
    `),
  };
}

export function subscriptionSuspended(name: string) {
  return {
    subject: "Účet pozastaven — neuhrazená faktura — Finatiq",
    html: layout(`
      ${p(`Dobrý den, ${name},`)}
      ${p("váš účet byl pozastaven z důvodu neuhrazené faktury.")}
      ${p("Pro obnovení přístupu prosíme o úhradu dlužné částky.")}
      ${btn("Zobrazit faktury", "https://www.finatiq.cz/advisor/nastaveni/fakturace")}
    `),
  };
}
```

- [ ] **Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add src/lib/email/templates.ts
git commit -m "feat(invoicing): add invoice email templates"
```

---

### Task 10: Invoice Reminders in Daily Cron

**Files:**
- Modify: `src/app/api/cron/daily/route.ts` — add 4-tier reminder logic

- [ ] **Step 1: Add invoice reminder section**

After the existing overdue invoice check section (line ~133), add:

```typescript
// --- Invoice email reminders ---
const today = new Date();

// 3 days before due: send reminder
const threeDaysFuture = new Date(today);
threeDaysFuture.setDate(today.getDate() + 3);
const futureDateStr = threeDaysFuture.toISOString().split("T")[0];

const { data: dueSoon } = await supabase
  .from("invoices")
  .select("id, advisor_id, amount, total_with_vat, due_date, reminder_sent_at, advisors(company_name, email)")
  .eq("status", "issued")
  .eq("due_date", futureDateStr)
  .is("reminder_sent_at", null);

for (const inv of dueSoon || []) {
  const adv = inv.advisors;
  if (adv?.email) {
    const tpl = templates.invoiceDueSoon(adv.company_name || "Poradce", inv.total_with_vat || inv.amount, new Date(inv.due_date).toLocaleDateString("cs-CZ"));
    await sendEmail(adv.email, tpl.subject, tpl.html).catch(() => {});
    await supabase.from("invoices").update({ reminder_sent_at: new Date().toISOString() }).eq("id", inv.id);
  }
}

// 1 day after due: first overdue email
const oneDayAgo = new Date(today);
oneDayAgo.setDate(today.getDate() - 1);
const oneDayAgoStr = oneDayAgo.toISOString().split("T")[0];

const { data: justOverdue } = await supabase
  .from("invoices")
  .select("id, advisor_id, amount, total_with_vat, due_date, advisors(company_name, email)")
  .in("status", ["issued", "overdue"])
  .eq("due_date", oneDayAgoStr);

for (const inv of justOverdue || []) {
  const adv = inv.advisors;
  if (adv?.email) {
    const tpl = templates.invoiceOverdue(adv.company_name || "Poradce", inv.total_with_vat || inv.amount, new Date(inv.due_date).toLocaleDateString("cs-CZ"));
    await sendEmail(adv.email, tpl.subject, tpl.html).catch(() => {});
  }
  await supabase.from("invoices").update({ status: "overdue" }).eq("id", inv.id);
}

// 7 days after due: second reminder
const sevenDaysAgo = new Date(today);
sevenDaysAgo.setDate(today.getDate() - 7);
const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

const { data: secondReminders } = await supabase
  .from("invoices")
  .select("id, advisor_id, amount, total_with_vat, advisors(company_name, email)")
  .eq("status", "overdue")
  .eq("due_date", sevenDaysAgoStr)
  .is("second_reminder_sent_at", null);

for (const inv of secondReminders || []) {
  const adv = inv.advisors;
  if (adv?.email) {
    const tpl = templates.invoiceSecondReminder(adv.company_name || "Poradce", inv.total_with_vat || inv.amount);
    await sendEmail(adv.email, tpl.subject, tpl.html).catch(() => {});
    await supabase.from("invoices").update({ second_reminder_sent_at: new Date().toISOString() }).eq("id", inv.id);
  }
}

// 14 days after due: suspend subscription
const fourteenDaysAgo = new Date(today);
fourteenDaysAgo.setDate(today.getDate() - 14);
const fourteenDaysAgoStr = fourteenDaysAgo.toISOString().split("T")[0];

const { data: toSuspend } = await supabase
  .from("invoices")
  .select("advisor_id, advisors(company_name, email, user_id)")
  .eq("status", "overdue")
  .lte("due_date", fourteenDaysAgoStr);

for (const inv of toSuspend || []) {
  const adv = inv.advisors;
  await supabase.from("advisors").update({ subscription_status: "pending_payment" }).eq("id", inv.advisor_id);
  if (adv?.email) {
    const tpl = templates.subscriptionSuspended(adv.company_name || "Poradce");
    await sendEmail(adv.email, tpl.subject, tpl.html).catch(() => {});
  }
}
```

Import the new templates at the top of the file:
```typescript
import * as templates from "@/lib/email/templates";
```

- [ ] **Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/daily/route.ts
git commit -m "feat(invoicing): 4-tier automatic invoice reminders in daily cron"
```

---

### Task 11: Advisor Invoices Page

**Files:**
- Create: `src/app/(advisor)/advisor/nastaveni/fakturace/page.tsx`

- [ ] **Step 1: Create the advisor invoices page**

```typescript
// src/app/(advisor)/advisor/nastaveni/fakturace/page.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";

interface Invoice {
  id: string;
  invoice_number: string;
  period: string;
  amount: number;
  total_with_vat: number;
  vat_applied: boolean;
  vat_amount: number;
  status: string;
  due_date: string;
  paid_at: string | null;
}

interface BillingInfo {
  billing_name: string;
  billing_ico: string;
  billing_dic: string;
  billing_address: string;
}

export default function AdvisorFakturacePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [billing, setBilling] = useState<BillingInfo>({ billing_name: "", billing_ico: "", billing_dic: "", billing_address: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: advisor } = await supabase
        .from("advisors")
        .select("id, billing_name, billing_ico, billing_dic, billing_address")
        .eq("user_id", user.id)
        .single();

      if (!advisor) return;
      setBilling({
        billing_name: advisor.billing_name || "",
        billing_ico: advisor.billing_ico || "",
        billing_dic: advisor.billing_dic || "",
        billing_address: advisor.billing_address || "",
      });

      const { data: inv } = await supabase
        .from("invoices")
        .select("id, invoice_number, period, amount, total_with_vat, vat_applied, vat_amount, status, due_date, paid_at")
        .eq("advisor_id", advisor.id)
        .order("created_at", { ascending: false });

      setInvoices(inv || []);
      setLoading(false);
    })();
  }, [supabase]);

  const saveBilling = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("advisors").update(billing).eq("user_id", user.id);
    if (error) toast.error("Chyba při ukládání");
    else toast.success("Fakturační údaje uloženy");
    setSaving(false);
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { issued: "bg-blue-100 text-blue-700", paid: "bg-green-100 text-green-700", overdue: "bg-red-100 text-red-700" };
    const labels: Record<string, string> = { issued: "Vystavena", paid: "Zaplacena", overdue: "Po splatnosti" };
    return <Badge className={map[s] || "bg-gray-100"}>{labels[s] || s}</Badge>;
  };

  if (loading) return <div className="p-6 space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Fakturace</h1>

      {/* Billing info */}
      <div className="border rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">Fakturační údaje</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>Název firmy / Jméno</Label><Input value={billing.billing_name} onChange={(e) => setBilling({ ...billing, billing_name: e.target.value })} /></div>
          <div><Label>IČO</Label><Input value={billing.billing_ico} onChange={(e) => setBilling({ ...billing, billing_ico: e.target.value })} /></div>
          <div><Label>DIČ</Label><Input value={billing.billing_dic} onChange={(e) => setBilling({ ...billing, billing_dic: e.target.value })} /></div>
          <div><Label>Adresa</Label><Input value={billing.billing_address} onChange={(e) => setBilling({ ...billing, billing_address: e.target.value })} /></div>
        </div>
        <Button onClick={saveBilling} disabled={saving}>{saving ? "Ukládám..." : "Uložit"}</Button>
      </div>

      {/* Invoice list */}
      <div className="border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left p-3 font-medium">Číslo</th>
              <th className="text-left p-3 font-medium">Období</th>
              <th className="text-left p-3 font-medium">Částka</th>
              <th className="text-left p-3 font-medium">Stav</th>
              <th className="text-left p-3 font-medium">Splatnost</th>
              <th className="text-left p-3 font-medium">PDF</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b hover:bg-slate-50/50">
                <td className="p-3 font-mono text-xs">{inv.invoice_number}</td>
                <td className="p-3">{inv.period}</td>
                <td className="p-3">{(inv.total_with_vat || inv.amount).toLocaleString("cs-CZ")} Kč</td>
                <td className="p-3">{statusBadge(inv.status)}</td>
                <td className="p-3">{new Date(inv.due_date).toLocaleDateString("cs-CZ")}</td>
                <td className="p-3">
                  <a href={`/api/advisor/invoice/${inv.id}/pdf`} target="_blank" rel="noopener">
                    <Button variant="ghost" size="sm"><Download className="w-4 h-4 mr-1" /> PDF</Button>
                  </a>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-slate-400">Zatím žádné faktury</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add link in advisor sidebar navigation**

In `src/app/(advisor)/layout.tsx`, add nav item for fakturace in the settings section or as a direct nav item:

```typescript
{ href: "/advisor/nastaveni/fakturace", icon: FileText, label: "Fakturace" },
```

- [ ] **Step 3: Verify build**

Run: `npx next build 2>&1 | tail -5`

- [ ] **Step 4: Commit**

```bash
git add src/app/(advisor)/advisor/nastaveni/fakturace/page.tsx src/app/(advisor)/layout.tsx
git commit -m "feat(invoicing): advisor invoice list + billing info page"
```

---

### Task 12: Superadmin Fakturace Upgrade

**Files:**
- Modify: `src/app/(superadmin)/superadmin/fakturace/page.tsx`

- [ ] **Step 1: Add "Generovat faktury" button**

Find the existing generateInvoices function (line ~272). Replace or wrap it to call the cron endpoint:

```typescript
const generateFromCron = async () => {
  setGenerating(true);
  try {
    const res = await fetch("/api/cron/monthly-invoices", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ""}` },
    });
    const data = await res.json();
    toast.success(`Vygenerováno ${data.generated} faktur za ${data.period}`);
    fetchData(); // refresh
  } catch {
    toast.error("Chyba při generování faktur");
  }
  setGenerating(false);
};
```

Note: For superadmin calling the cron internally, create a separate internal route or pass the CRON_SECRET via an environment variable exposed to the client. Alternatively, implement the generation logic directly in the superadmin page (the existing `generateInvoices` function already does this — extend it with the new fields).

- [ ] **Step 2: Add "Zaplaceno" button with date**

In the invoices table, add a button per row for marking as paid:

```typescript
const markPaid = async (invoiceId: string) => {
  await supabase.from("invoices").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", invoiceId);
  toast.success("Faktura označena jako zaplacená");
  fetchData();
};
```

- [ ] **Step 3: Verify build**

Run: `npx next build 2>&1 | tail -5`

- [ ] **Step 4: Commit**

```bash
git add src/app/(superadmin)/superadmin/fakturace/page.tsx
git commit -m "feat(invoicing): superadmin generate + mark paid buttons"
```

---

## Chunk 3: Per-Feature Trial (BLOK 3)

### Task 13: Feature Trial Email Templates

**Files:**
- Modify: `src/lib/email/templates.ts`

- [ ] **Step 1: Add 2 feature trial templates**

```typescript
export function featureTrialExpiring(advisorName: string, featureName: string, daysLeft: number) {
  return {
    subject: `Trial funkce "${featureName}" končí za ${daysLeft} dny — Finatiq`,
    html: layout(`
      ${p(`Dobrý den, ${advisorName},`)}
      ${p(`trial funkce <strong>${featureName}</strong> končí za <strong>${daysLeft} dny</strong>.`)}
      ${p("Pro pokračování upgradujte svůj plán.")}
      ${btn("Zobrazit plány", "https://www.finatiq.cz/advisor/predplatne")}
    `),
  };
}

export function featureTrialExpired(advisorName: string, featureName: string) {
  return {
    subject: `Trial funkce "${featureName}" skončil — Finatiq`,
    html: layout(`
      ${p(`Dobrý den, ${advisorName},`)}
      ${p(`trial funkce <strong>${featureName}</strong> skončil.`)}
      ${p("Pro obnovení přístupu upgradujte svůj plán.")}
      ${btn("Upgradovat", "https://www.finatiq.cz/advisor/predplatne")}
    `),
  };
}
```

- [ ] **Step 2: Verify build + commit**

```bash
git add src/lib/email/templates.ts
git commit -m "feat(trials): add feature trial email templates"
```

---

### Task 14: Feature Trial Section in Advisor Detail

**Files:**
- Modify: `src/app/(superadmin)/superadmin/poradci/[id]/page.tsx`

- [ ] **Step 1: Add feature trials section**

After the onboarding checklist section (around line 214), add a new card:

```typescript
const FEATURE_NAMES: Record<string, string> = {
  crm: "CRM & Pipeline",
  portal: "Klientský portál",
  templates: "Šablony smluv",
  scoring: "Lead scoring",
  automations: "Automatizace",
  meta_ads: "Meta Ads",
  ocr: "OCR dokumentů",
  ai_assistant: "AI asistent",
  osvc: "OSVČ modul",
  calendar: "Kalendář",
};

// In component, add state:
const [featureTrials, setFeatureTrials] = useState<Record<string, string>>(advisor?.feature_trials || {});

const giveFeatureTrial = async (feature: string) => {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 14);
  const updated = { ...featureTrials, [feature]: expiry.toISOString() };
  await supabase.from("advisors").update({ feature_trials: updated }).eq("id", advisor.id);
  setFeatureTrials(updated);
  toast.success(`Trial ${FEATURE_NAMES[feature]} aktivován na 14 dní`);
};

const activateFeature = async (feature: string) => {
  const modules = { ...(advisor.enabled_modules || {}), [feature]: true };
  const trials = { ...featureTrials };
  delete trials[feature];
  await supabase.from("advisors").update({ enabled_modules: modules, feature_trials: trials }).eq("id", advisor.id);
  setFeatureTrials(trials);
  toast.success(`${FEATURE_NAMES[feature]} aktivován natrvalo`);
  fetchData();
};

const deactivateFeature = async (feature: string) => {
  const modules = { ...(advisor.enabled_modules || {}), [feature]: false };
  const trials = { ...featureTrials };
  delete trials[feature];
  await supabase.from("advisors").update({ enabled_modules: modules, feature_trials: trials }).eq("id", advisor.id);
  setFeatureTrials(trials);
  toast.success(`${FEATURE_NAMES[feature]} deaktivován`);
  fetchData();
};
```

JSX section:
```tsx
<div className="border rounded-xl p-6 shadow-sm">
  <h3 className="font-semibold mb-4">Feature trialy</h3>
  <div className="space-y-3">
    {Object.entries(FEATURE_NAMES).map(([key, label]) => {
      const inPlan = advisor?.enabled_modules?.[key] === true;
      const trialDate = featureTrials[key];
      const trialActive = trialDate && new Date(trialDate) > new Date();
      const trialExpired = trialDate && new Date(trialDate) <= new Date();

      return (
        <div key={key} className="flex items-center justify-between py-2 border-b last:border-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{label}</span>
            {inPlan && <Badge className="bg-green-100 text-green-700">V plánu</Badge>}
            {trialActive && <Badge className="bg-amber-100 text-amber-700">Trial do {new Date(trialDate).toLocaleDateString("cs-CZ")}</Badge>}
            {trialExpired && <Badge className="bg-red-100 text-red-700">Trial expiroval</Badge>}
            {!inPlan && !trialActive && !trialExpired && <Badge className="bg-gray-100 text-gray-500">Neaktivní</Badge>}
          </div>
          <div className="flex gap-2">
            {!inPlan && !trialActive && (
              <Button size="sm" variant="outline" onClick={() => giveFeatureTrial(key)}>Trial 14d</Button>
            )}
            {!inPlan && (
              <Button size="sm" variant="outline" onClick={() => activateFeature(key)}>Aktivovat</Button>
            )}
            {(inPlan || trialActive) && (
              <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deactivateFeature(key)}>Deaktivovat</Button>
            )}
          </div>
        </div>
      );
    })}
  </div>
</div>
```

- [ ] **Step 2: Ensure advisor fetch includes `feature_trials` and `enabled_modules`**

In fetchData, ensure the advisor select includes these fields:
```typescript
.select("*, feature_trials, enabled_modules")
```

- [ ] **Step 3: Verify build + commit**

```bash
git add src/app/(superadmin)/superadmin/poradci/[id]/page.tsx
git commit -m "feat(trials): feature trial management in advisor detail"
```

---

### Task 15: Feature Trial Check in Advisor Layout

**Files:**
- Modify: `src/app/(advisor)/layout.tsx` — line ~98 module filter

- [ ] **Step 1: Extend module filtering logic**

Change the nav filter (line ~98) from:
```typescript
.filter((item) => !item.moduleKey || enabledModules[item.moduleKey] !== false)
```
To:
```typescript
.filter((item) => {
  if (!item.moduleKey) return true;
  if (enabledModules[item.moduleKey] === true) return true;
  // Check feature trials
  const trialExpiry = featureTrials[item.moduleKey];
  if (trialExpiry && new Date(trialExpiry) > new Date()) return true;
  return false;
})
```

Add `featureTrials` state and fetch it from advisor record (in the same useEffect that fetches enabled_modules, line ~82):

```typescript
const [featureTrials, setFeatureTrials] = useState<Record<string, string>>({});

// In useEffect, after fetching advisor:
setFeatureTrials(advisor.feature_trials || {});
```

- [ ] **Step 2: Verify build + commit**

```bash
git add src/app/(advisor)/layout.tsx
git commit -m "feat(trials): feature trial check in advisor nav filtering"
```

---

### Task 16: Feature Trial Cron Checks

**Files:**
- Modify: `src/app/api/cron/daily/route.ts`

- [ ] **Step 1: Add feature trial expiry checks**

After the invoice reminder section, add:

```typescript
// --- Feature trial checks ---
const { data: advisorsWithTrials } = await supabase
  .from("advisors")
  .select("id, company_name, email, feature_trials")
  .not("feature_trials", "eq", "{}");

const FEATURE_NAMES: Record<string, string> = {
  crm: "CRM & Pipeline", portal: "Klientský portál", templates: "Šablony smluv",
  scoring: "Lead scoring", automations: "Automatizace", meta_ads: "Meta Ads",
  ocr: "OCR dokumentů", ai_assistant: "AI asistent", osvc: "OSVČ modul", calendar: "Kalendář",
};

for (const adv of advisorsWithTrials || []) {
  const trials = adv.feature_trials || {};
  for (const [feature, expiryStr] of Object.entries(trials)) {
    const expiry = new Date(expiryStr as string);
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 2 && adv.email) {
      const tpl = templates.featureTrialExpiring(adv.company_name || "Poradce", FEATURE_NAMES[feature] || feature, 2);
      await sendEmail(adv.email, tpl.subject, tpl.html).catch(() => {});
    }
    if (diffDays <= 0 && adv.email) {
      const tpl = templates.featureTrialExpired(adv.company_name || "Poradce", FEATURE_NAMES[feature] || feature);
      await sendEmail(adv.email, tpl.subject, tpl.html).catch(() => {});
    }
  }
}
```

- [ ] **Step 2: Verify build + commit**

```bash
git add src/app/api/cron/daily/route.ts
git commit -m "feat(trials): feature trial expiry checks in daily cron"
```

---

## Chunk 4: Tickets & Live Chat (BLOK 4)

### Task 17: Ticket Email Templates

**Files:**
- Modify: `src/lib/email/templates.ts`

- [ ] **Step 1: Add 3 ticket templates**

```typescript
export function newTicketAlert(ticketSubject: string, advisorName: string) {
  return {
    subject: `Nový tiket: ${ticketSubject} — Finatiq`,
    html: layout(`
      ${p("Nový tiket v systému:")}
      ${p(`<strong>${ticketSubject}</strong>`)}
      ${p(`Od: ${advisorName}`)}
      ${btn("Zobrazit tiket", "https://www.finatiq.cz/superadmin/tikety")}
    `),
  };
}

export function ticketReply(advisorName: string, message: string) {
  return {
    subject: "Nová odpověď na váš tiket — Finatiq",
    html: layout(`
      ${p(`Dobrý den, ${advisorName},`)}
      ${p("na váš tiket byla přidána odpověď:")}
      ${p(`<em>"${message.substring(0, 200)}${message.length > 200 ? "..." : ""}"</em>`)}
      ${btn("Zobrazit tiket", "https://www.finatiq.cz/advisor")}
    `),
  };
}

export function newDirectMessage(advisorName: string, message: string) {
  return {
    subject: "Nová zpráva od Finatiq týmu",
    html: layout(`
      ${p(`Dobrý den, ${advisorName},`)}
      ${p("máte novou zprávu od Finatiq týmu:")}
      ${p(`<em>"${message.substring(0, 300)}${message.length > 300 ? "..." : ""}"</em>`)}
      ${btn("Zobrazit zprávy", "https://www.finatiq.cz/advisor")}
    `),
  };
}
```

- [ ] **Step 2: Verify build + commit**

```bash
git add src/lib/email/templates.ts
git commit -m "feat(tickets): add ticket/DM email templates"
```

---

### Task 18: Ticket Email Notifications on Create/Reply

**Files:**
- Modify: `src/components/ticket-modal.tsx` — send email on ticket creation
- Modify: `src/app/(superadmin)/superadmin/tikety/[id]/page.tsx` — send email on reply

- [ ] **Step 1: Add email notification on ticket creation (ticket-modal.tsx)**

After the ticket INSERT succeeds, call an API to send the email. Add a fetch to a notify endpoint or directly call:

```typescript
// After successful ticket creation:
await fetch("/api/admin/system-health", { method: "POST", body: JSON.stringify({ type: "new_ticket", subject: formSubject, advisorName }) });
```

Actually, simpler approach — add email sending logic in the ticket creation flow. Since ticket-modal is a client component, create a small API route or add to existing ticket creation flow.

Best approach: Add a POST handler to the existing ticket detail page API or create `/api/tickets/notify`:

```typescript
// After ticket INSERT in ticket-modal.tsx, add:
fetch("/api/tickets/notify", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ type: "new_ticket", subject: ticketSubject, advisorName: advisor?.company_name }),
});
```

Create `src/app/api/tickets/notify/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/resend";
import * as templates from "@/lib/email/templates";

const SUPERADMIN_EMAIL = "bartolomej@arbey.cz";

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.type === "new_ticket") {
    const tpl = templates.newTicketAlert(body.subject, body.advisorName);
    await sendEmail(SUPERADMIN_EMAIL, tpl.subject, tpl.html);
  } else if (body.type === "reply") {
    const tpl = templates.ticketReply(body.advisorName, body.message);
    await sendEmail(body.advisorEmail, tpl.subject, tpl.html);
  } else if (body.type === "dm") {
    const tpl = templates.newDirectMessage(body.advisorName, body.message);
    await sendEmail(body.advisorEmail, tpl.subject, tpl.html);
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Add email on superadmin reply**

In `src/app/(superadmin)/superadmin/tikety/[id]/page.tsx`, after inserting a reply message, add:

```typescript
// After INSERT to ticket_messages with sender_type: "superadmin":
fetch("/api/tickets/notify", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ type: "reply", advisorName: advisor.company_name, advisorEmail: advisor.email, message: messageText }),
});
```

- [ ] **Step 3: Verify build + commit**

```bash
git add src/app/api/tickets/notify/route.ts src/components/ticket-modal.tsx src/app/(superadmin)/superadmin/tikety/[id]/page.tsx
git commit -m "feat(tickets): email notifications on ticket create and reply"
```

---

### Task 19: SuperadminChatWidget

**Files:**
- Create: `src/components/SuperadminChatWidget.tsx`
- Modify: `src/app/(superadmin)/layout.tsx`

- [ ] **Step 1: Create the chat widget component**

```typescript
// src/components/SuperadminChatWidget.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageCircle, X, Send, ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Ticket {
  id: string;
  subject: string;
  status: string;
  advisor_id: string;
  advisors?: { company_name: string; email: string };
  latest_message?: string;
  unread_count?: number;
}

interface Message {
  id: string;
  message: string;
  sender_type: string;
  created_at: string;
}

export function SuperadminChatWidget() {
  const [open, setOpen] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [sending, setSending] = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Fetch open tickets
  useEffect(() => {
    const fetchTickets = async () => {
      const { data } = await supabase
        .from("tickets")
        .select("id, subject, status, advisor_id, advisors(company_name, email)")
        .in("status", ["open", "in_progress", "waiting"])
        .order("created_at", { ascending: false })
        .limit(20);
      setTickets(data || []);
      setUnreadTotal((data || []).length);
    };
    fetchTickets();

    // Realtime subscription
    const channel = supabase
      .channel("ticket-messages-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ticket_messages" }, (payload) => {
        const msg = payload.new as Message;
        if (selectedTicket && msg.id) {
          setMessages((prev) => [...prev, msg]);
        }
        fetchTickets();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, selectedTicket]);

  // Fetch messages when ticket selected
  useEffect(() => {
    if (!selectedTicket) return;
    (async () => {
      const { data } = await supabase
        .from("ticket_messages")
        .select("id, message, sender_type, created_at")
        .eq("ticket_id", selectedTicket.id)
        .order("created_at", { ascending: true });
      setMessages(data || []);
    })();
  }, [selectedTicket, supabase]);

  // Auto-scroll
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMsg.trim() || !selectedTicket || sending) return;
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("ticket_messages").insert({
      ticket_id: selectedTicket.id,
      sender_type: "superadmin",
      sender_id: user?.id,
      message: newMsg.trim(),
    });

    // Notify advisor
    fetch("/api/tickets/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "reply",
        advisorName: selectedTicket.advisors?.company_name,
        advisorEmail: selectedTicket.advisors?.email,
        message: newMsg.trim(),
      }),
    }).catch(() => {});

    setNewMsg("");
    setSending(false);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {!open && unreadTotal > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            {unreadTotal}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[500px] bg-white rounded-xl shadow-2xl border flex flex-col overflow-hidden">
          {selectedTicket ? (
            <>
              {/* Chat header */}
              <div className="p-3 border-b flex items-center gap-2 bg-slate-50">
                <button onClick={() => setSelectedTicket(null)}>
                  <ChevronLeft className="w-5 h-5 text-slate-500" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedTicket.subject}</p>
                  <p className="text-xs text-slate-400">{selectedTicket.advisors?.company_name}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender_type === "superadmin" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                      m.sender_type === "superadmin" ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-700"
                    }`}>
                      {m.message}
                      <p className={`text-[10px] mt-1 ${m.sender_type === "superadmin" ? "text-blue-200" : "text-slate-400"}`}>
                        {new Date(m.created_at).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEnd} />
              </div>

              {/* Input */}
              <div className="p-3 border-t flex gap-2">
                <Input
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  placeholder="Napište zprávu..."
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <Button size="sm" onClick={sendMessage} disabled={sending}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Ticket list */}
              <div className="p-3 border-b bg-slate-50">
                <h3 className="font-semibold text-sm">Otevřené tikety</h3>
              </div>
              <div className="flex-1 overflow-y-auto">
                {tickets.length === 0 && (
                  <p className="p-6 text-center text-sm text-slate-400">Žádné otevřené tikety</p>
                )}
                {tickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className="w-full text-left p-3 border-b hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">{t.subject}</p>
                      <Badge className={t.status === "open" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}>
                        {t.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{t.advisors?.company_name}</p>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Add widget to superadmin layout**

In `src/app/(superadmin)/layout.tsx`, import and add the widget:

```typescript
import { SuperadminChatWidget } from "@/components/SuperadminChatWidget";

// In the return JSX, add before closing </main> or after {children}:
<SuperadminChatWidget />
```

- [ ] **Step 3: Verify build + commit**

```bash
git add src/components/SuperadminChatWidget.tsx src/app/(superadmin)/layout.tsx
git commit -m "feat(tickets): live chat widget for superadmin"
```

---

### Task 20: DM from Superadmin to Advisor

**Files:**
- Modify: `src/app/(superadmin)/superadmin/poradci/[id]/page.tsx`

- [ ] **Step 1: Add "Poslat zprávu" button + dialog**

Add a Dialog with textarea for the DM message. On submit:

```typescript
const sendDM = async (message: string) => {
  const { data: { user } } = await supabase.auth.getUser();

  // Create ticket
  const { data: ticket } = await supabase.from("tickets").insert({
    advisor_id: advisor.id,
    subject: `Zpráva od Finatiq`,
    category: "dm",
    priority: "low",
    status: "open",
  }).select("id").single();

  if (ticket) {
    await supabase.from("ticket_messages").insert({
      ticket_id: ticket.id,
      sender_type: "superadmin",
      sender_id: user?.id,
      message,
    });

    // Email notification
    fetch("/api/tickets/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "dm", advisorName: advisor.company_name, advisorEmail: advisor.email, message }),
    }).catch(() => {});

    toast.success("Zpráva odeslána");
  }
};
```

Add button in the page header area:
```tsx
<Button onClick={() => setDmDialogOpen(true)}>
  <MessageCircle className="w-4 h-4 mr-2" /> Poslat zprávu
</Button>
```

- [ ] **Step 2: Verify build + commit**

```bash
git add src/app/(superadmin)/superadmin/poradci/[id]/page.tsx
git commit -m "feat(tickets): DM from superadmin to advisor"
```

---

## Chunk 5: Dashboard Enhancements (BLOK 5)

### Task 21: Enhanced Superadmin Dashboard

**Files:**
- Modify: `src/app/(superadmin)/superadmin/page.tsx`

- [ ] **Step 1: Add enhanced KPIs**

Extend the existing useEffect data fetching (lines ~36-46) to also calculate:

```typescript
// Advisor breakdown
const activeCount = advisors.filter((a) => a.subscription_status === "active").length;
const trialCount = advisors.filter((a) => a.subscription_status === "trial").length;
const expiredCount = advisors.filter((a) => a.subscription_status === "expired").length;
const avgPricePerAdvisor = activeCount > 0 ? mrr / activeCount : 0;

// Churn rate (expired this month)
const thisMonth = new Date().toISOString().slice(0, 7);
const churnThisMonth = advisors.filter(
  (a) => a.subscription_status === "expired" && a.updated_at?.startsWith(thisMonth)
).length;
const churnRate = activeCount > 0 ? (churnThisMonth / activeCount * 100).toFixed(1) : "0";
```

- [ ] **Step 2: Add trial→paid conversion chart**

Add a new chart section after existing charts:

```typescript
// Calculate conversion data: per month, how many trials converted to active
const conversionData = useMemo(() => {
  const months: Record<string, { trials: number; converted: number }> = {};
  advisors.forEach((a) => {
    const created = a.created_at?.slice(0, 7);
    if (created) {
      months[created] = months[created] || { trials: 0, converted: 0 };
      months[created].trials++;
      if (a.subscription_status === "active") months[created].converted++;
    }
  });
  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([m, d]) => ({
      month: m,
      rate: d.trials > 0 ? Math.round((d.converted / d.trials) * 100) : 0,
    }));
}, [advisors]);
```

Add BarChart for conversion:
```tsx
<div className="border rounded-xl p-6 shadow-sm">
  <h3 className="font-semibold text-sm mb-4">Konverze trial → placený (%)</h3>
  <ResponsiveContainer width="100%" height={200}>
    <BarChart data={conversionData}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
      <YAxis tick={{ fontSize: 11 }} />
      <Tooltip />
      <Bar dataKey="rate" fill="#22d3ee" radius={[4, 4, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
</div>
```

- [ ] **Step 3: Add activity feed (tickets + errors)**

Fetch recent tickets and errors:

```typescript
// In useEffect:
const { data: recentTickets } = await supabase
  .from("tickets")
  .select("id, subject, status, created_at, advisors(company_name)")
  .order("created_at", { ascending: false })
  .limit(10);

const { data: recentErrors } = await supabase
  .from("error_logs")
  .select("id, message, created_at")
  .order("created_at", { ascending: false })
  .limit(5);
```

Render in the activity section:
```tsx
<div className="border rounded-xl p-6 shadow-sm">
  <h3 className="font-semibold text-sm mb-3">Poslední tikety</h3>
  <div className="space-y-2">
    {recentTickets.map((t) => (
      <div key={t.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
        <span className="truncate">{t.subject}</span>
        <Badge>{t.status}</Badge>
      </div>
    ))}
  </div>
</div>

<div className="border rounded-xl p-6 shadow-sm">
  <h3 className="font-semibold text-sm mb-3">Poslední chyby</h3>
  <div className="space-y-2">
    {recentErrors.map((e) => (
      <div key={e.id} className="text-sm py-1 border-b last:border-0">
        <span className="text-red-500 truncate block">{e.message}</span>
        <span className="text-xs text-slate-400">{new Date(e.created_at).toLocaleString("cs-CZ")}</span>
      </div>
    ))}
  </div>
</div>
```

- [ ] **Step 4: Add quick actions**

```tsx
<div className="border rounded-xl p-6 shadow-sm">
  <h3 className="font-semibold text-sm mb-3">Rychlé akce</h3>
  <div className="flex flex-wrap gap-3">
    <Button variant="outline" onClick={generateInvoices}>
      <FileText className="w-4 h-4 mr-2" /> Generovat faktury
    </Button>
    <Button variant="outline" onClick={() => setBulkEmailOpen(true)}>
      <Mail className="w-4 h-4 mr-2" /> Hromadný email
    </Button>
    <Button variant="outline" onClick={exportAdvisors}>
      <Download className="w-4 h-4 mr-2" /> Export poradců
    </Button>
  </div>
</div>
```

Implement generateInvoices, bulk email dialog, and exportAdvisors:

```typescript
const generateInvoices = async () => {
  const res = await fetch("/api/cron/monthly-invoices", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET}` },
  });
  const data = await res.json();
  toast.success(`Vygenerováno ${data.generated} faktur`);
};

const exportAdvisors = () => {
  const csv = ["Jméno,Email,Status,Plán,Klientů,Vytvořen"]
    .concat(advisors.map((a) => `"${a.company_name}","${a.email}","${a.subscription_status}","${a.subscription_tier}","${clients.filter((c) => c.advisor_id === a.id).length}","${a.created_at}"`))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `poradci-${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
};
```

Bulk email dialog (with Dialog component):
```tsx
const [bulkEmailOpen, setBulkEmailOpen] = useState(false);
const [bulkSubject, setBulkSubject] = useState("");
const [bulkBody, setBulkBody] = useState("");

const sendBulkEmail = async () => {
  const activeAdvisors = advisors.filter((a) => a.subscription_status === "active" && a.email);
  for (const adv of activeAdvisors) {
    await fetch("/api/tickets/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "bulk", email: adv.email, subject: bulkSubject, body: bulkBody, name: adv.company_name }),
    }).catch(() => {});
  }
  toast.success(`Email odeslán ${activeAdvisors.length} poradcům`);
  setBulkEmailOpen(false);
};
```

Add bulk email handler to `/api/tickets/notify`:
```typescript
} else if (body.type === "bulk") {
  const html = layout(`
    ${p(`Dobrý den, ${body.name},`)}
    ${p(body.body)}
  `);
  await sendEmail(body.email, body.subject, html);
}
```

- [ ] **Step 5: Update KPI cards display**

Replace the 4 existing KPI cards with expanded set:
```tsx
<div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
  <KpiCard label="MRR" value={`${mrr.toLocaleString("cs-CZ")} Kč`} />
  <KpiCard label="Poradců" value={`${advisors.length}`} sub={`${activeCount} aktivních / ${trialCount} trial / ${expiredCount} expired`} />
  <KpiCard label="Klientů" value={`${clients.length}`} />
  <KpiCard label="Ø cena" value={`${Math.round(avgPricePerAdvisor).toLocaleString("cs-CZ")} Kč`} />
  <KpiCard label="Churn" value={`${churnRate}%`} sub={`${churnThisMonth} tento měsíc`} />
</div>
```

- [ ] **Step 6: Verify build**

Run: `npx next build 2>&1 | tail -5`

- [ ] **Step 7: Commit**

```bash
git add src/app/(superadmin)/superadmin/page.tsx src/app/api/tickets/notify/route.ts
git commit -m "feat(dashboard): enhanced KPIs, charts, activity feed, quick actions"
```

---

## Final: Build Verification & SQL Output

### Task 22: Final Build Check

- [ ] **Step 1: Run full build**

```bash
npm run build
```

Expected: 0 errors

- [ ] **Step 2: Output SQL for user to run in Supabase**

Print all ALTER TABLE statements:

```sql
-- BLOK 1: Pricing plans
ALTER TABLE pricing_plans
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS perks JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS badge TEXT,
  ADD COLUMN IF NOT EXISTS trial_days INT DEFAULT 14;

-- BLOK 2: Invoicing
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_with_vat NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS vat_applied BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS second_reminder_sent_at TIMESTAMPTZ;

ALTER TABLE advisors
  ADD COLUMN IF NOT EXISTS billing_name TEXT,
  ADD COLUMN IF NOT EXISTS billing_ico TEXT,
  ADD COLUMN IF NOT EXISTS billing_dic TEXT,
  ADD COLUMN IF NOT EXISTS billing_address TEXT;

-- BLOK 3: Feature trials
ALTER TABLE advisors
  ADD COLUMN IF NOT EXISTS feature_trials JSONB DEFAULT '{}';
```

- [ ] **Step 3: Final commit with all files**

```bash
git add -A
git commit -m "feat: superadmin complete upgrade — dynamic plans, invoicing, trials, chat, dashboard"
```
