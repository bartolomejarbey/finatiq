# Superadmin Kompletni Upgrade — Design Spec

**Date:** 2026-03-15
**Status:** Approved

## Overview

Five interconnected blocks upgrading the superadmin panel, billing, and advisor experience:

1. Dynamic pricing plans from DB on landing page + /cenik
2. Automated monthly invoicing with PDF generation and reminders
3. Per-feature trial system for advisors
4. Tickets & live chat improvements
5. Superadmin dashboard enhancements

---

## BLOK 1: Dynamic Plans from DB

### Problem
Pricing plans are hardcoded on the landing page and /cenik. Changes require code deploy.

### Solution

#### 1.1 Database Changes
```sql
ALTER TABLE pricing_plans
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS perks JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS badge TEXT,
  ADD COLUMN IF NOT EXISTS trial_days INT DEFAULT 14;
```

Existing columns used: `name`, `tier`, `price_monthly`, `max_clients`, `features` (JSONB), `is_active`.

#### 1.2 Public API Route

**`GET /api/public/plans`** (no auth required)

```typescript
// Query: SELECT * FROM pricing_plans WHERE is_active = true ORDER BY sort_order ASC
// Response: Array of plans with all fields
```

Uses `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS.

#### 1.3 Landing Page (src/app/page.tsx)

Replace hardcoded pricing section with:
- Fetch from `/api/public/plans` on mount (client component section)
- Render plan cards dynamically: name, price, description, features list, perks, badge
- Badge renders as colored label on card (e.g. "Nejoblibenejsi")
- Perks render below features as highlighted items
- Skeleton loading state while fetching
- Fallback: show hardcoded plans if API fails

#### 1.4 Cenik Page (src/app/(marketing)/cenik/page.tsx)

Same fetch, plus:
- Feature comparison table generated from all plans' features
- Dynamic card rendering matching existing design (cyan accent, clip-path corners)

#### 1.5 Superadmin /plany Upgrade

Extend existing CRUD with:
- `description` textarea
- `perks` editor: text input + add button, list with remove buttons
- `badge` text input (empty = no badge)
- `trial_days` number input
- `sort_order` number input
- **Live preview**: card component showing how the plan will look on landing page
- Save updates all fields via Supabase UPDATE

---

## BLOK 2: Automated Invoicing

### Problem
Invoices are generated manually. No PDF download, no automatic reminders, no VAT handling.

### Solution

#### 2.1 Database Changes
```sql
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
```

#### 2.2 Monthly Invoice Cron

**`POST /api/cron/monthly-invoices`** (secured by CRON_SECRET header)

Logic:
1. Get all advisors WHERE `subscription_status = 'active'`
2. For each advisor:
   - Check if invoice for current period (YYYY-MM) exists — skip if yes
   - Get plan price from `pricing_plans` via `selected_plan_id`
   - Calculate VAT: if `billing_dic IS NOT NULL` → 21% VAT, else no VAT
   - Generate invoice_number: `YYYYMM-XXX` (auto-increment per month via COUNT+1)
   - INSERT into invoices
   - Send email via Resend: `invoiceReady(name, amount, period, dueDate)`
3. Return count of generated invoices

#### 2.3 PDF Invoice Generation

**`GET /api/advisor/invoice/[id]/pdf`** (auth required — advisor or superadmin)

Implementation: `jspdf` library
- Supplier: Harotas s.r.o., ICO 21402027, DIC CZ21402027, address
- Customer: from advisor billing fields
- Line item: plan name, period, price
- VAT breakdown if applicable
- QR payment code (Czech QR payment standard: SPD format)
- Variable symbol = invoice_number digits
- Due date
- Bank details

Response: `Content-Type: application/pdf`, streamed PDF buffer.

#### 2.4 Automatic Reminders

Extend existing `daily` cron (`/api/cron/daily`):

| Timing | Action | Email Template |
|--------|--------|----------------|
| 3 days before due | Reminder email | `invoiceDueSoon(name, amount, dueDate)` |
| 1 day after due | First overdue email | `invoiceOverdue(name, amount, dueDate)` |
| 7 days after due | Second overdue + DB flag | `invoiceSecondReminder(name, amount)` |
| 14 days after due | Status → `pending_payment` | `subscriptionSuspended(name)` |

Use `reminder_sent_at` / `second_reminder_sent_at` to prevent duplicate emails.

#### 2.5 Advisor Invoice Page

**`/advisor/nastaveni/fakturace`** (new page)

- Table: invoice_number, period, amount, status badge, due_date
- "Stahnout PDF" button per row → opens `/api/advisor/invoice/[id]/pdf`
- QR code display for unpaid invoices (inline SVG via qr generation)
- Billing info form: company name, ICO, DIC, address (saved to advisor record)

#### 2.6 Superadmin /fakturace Upgrade

Extend existing page:
- "Generovat faktury za tento mesic" button → calls `/api/cron/monthly-invoices`
- Per-invoice "Zaplaceno" button → sets status=paid, paid_at=now
- CSV export (already partially exists — ensure all fields exported)

---

## BLOK 3: Per-Feature Trial

### Problem
No way to give an advisor temporary access to a specific feature without changing their plan.

### Solution

#### 3.1 Database Changes
```sql
ALTER TABLE advisors
  ADD COLUMN IF NOT EXISTS feature_trials JSONB DEFAULT '{}';

-- Format: {"automations": "2026-04-01T00:00:00Z", "ai_assistant": "2026-04-15T00:00:00Z"}
```

#### 3.2 Superadmin — Advisor Detail

In `/superadmin/poradci/[id]`, add section "Feature trialy":

- List all known features (from `pricing_plans.features` keys): crm, portal, templates, scoring, automations, meta_ads, ocr, ai_assistant, osvc, calendar
- Per feature show status:
  - **V planu** (green) — in `enabled_modules`
  - **Trial do {date}** (amber) — in `feature_trials` and not expired
  - **Neaktivni** (gray) — neither
- Actions per feature:
  - "Trial 14 dni" → sets `feature_trials.{key} = NOW() + 14 days`
  - "Aktivovat natrvalo" → adds to `enabled_modules`
  - "Deaktivovat" → removes from both

#### 3.3 Module Access Logic

In advisor layout (`src/app/(advisor)/layout.tsx`), modify module check:

```typescript
// Current: enabled_modules[module] === true
// New: enabled_modules[module] === true || (feature_trials[module] && new Date(feature_trials[module]) > new Date())
```

For expired trials: show banner "Trial funkce {name} skoncil — upgradujte plan" instead of page content.

#### 3.4 Cron Extension

In daily cron, add feature trial checks:
- 2 days before expiry → email `featureTrialExpiring(name, featureName, daysLeft)`
- After expiry → email `featureTrialExpired(name, featureName)`

#### 3.5 New Email Templates

- `featureTrialExpiring(advisorName, featureName, daysLeft)` — "Trial funkce {name} konci za {days} dny"
- `featureTrialExpired(advisorName, featureName)` — "Trial funkce {name} skoncil"

---

## BLOK 4: Tickets & Live Chat

### Problem
Ticket system exists but lacks: email notifications, real-time updates, DM from superadmin, live chat widget.

### Solution

#### 4.1 Verify & Fix Existing Flow

Ensure complete flow works:
1. Advisor creates ticket via TicketModal → INSERT to `tickets` + `ticket_messages`
2. Ticket appears in `/superadmin/tikety`
3. Superadmin responds → INSERT to `ticket_messages`
4. Email notifications both directions

#### 4.2 Email Notifications

New templates:
- `newTicketAlert(ticketSubject, advisorName, ticketUrl)` → sent to superadmin email
- `ticketReply(advisorName, message, ticketUrl)` → sent to advisor when superadmin replies
- `newDirectMessage(advisorName, message)` → sent to advisor for DM

Trigger points:
- Ticket creation → `newTicketAlert` to superadmin
- Superadmin reply → `ticketReply` to advisor
- DM creation → `newDirectMessage` to advisor

#### 4.3 Live Chat Widget (Superadmin)

New component: `SuperadminChatWidget`

- Floating button in superadmin layout (bottom-right corner)
- Badge with count of unread messages across all open tickets
- Click opens panel:
  - List of open tickets with last message preview
  - Click ticket → inline chat view
  - Send message input at bottom
- Supabase Realtime subscription on `ticket_messages` table
- Auto-scroll to latest message

#### 4.4 Direct Messages

In `/superadmin/poradci/[id]`, button "Poslat zpravu":
- Opens dialog with message textarea
- Creates ticket with `category: 'dm'`, `status: 'open'`
- Adds first message to `ticket_messages` with `sender_type: 'superadmin'`
- Sends `newDirectMessage` email to advisor

Advisor sees DM:
- In TicketModal / "Potrebuji pomoc" section, show DM tickets separately
- NotificationBell includes DM count

#### 4.5 NotificationBell Extension

Add query for unread DM tickets (tickets WHERE category='dm' AND status!='resolved' AND has unread messages).

---

## BLOK 5: Superadmin Dashboard

### Problem
Dashboard exists with basic KPIs. Needs more metrics, charts, and quick actions.

### Solution

#### 5.1 KPI Widgets

Extend existing cards:
- **MRR** — sum of active advisors' plan prices (exists, verify accuracy)
- **Poradci breakdown** — total / active / trial / expired counts
- **Klienti** — total across all advisors
- **Prumerna cena** — MRR / active advisor count
- **Churn rate** — advisors who became expired this month / total active start of month

#### 5.2 Charts (Recharts)

- **MRR trend 12m** — already exists, verify data
- **Registrace per mesic** — COUNT advisors GROUP BY month(created_at) last 12m
- **Konverze trial→placeny** — percentage of trial advisors who became active, per month

#### 5.3 Activity Feed

- 10 latest registrations (exists)
- 10 latest tickets with status badge
- 5 latest errors from `error_logs` table

#### 5.4 Quick Actions

Row of action buttons:
- "Generovat faktury" → POST to `/api/cron/monthly-invoices`
- "Hromadny email" → opens dialog with subject + body, sends to all active advisors via Resend
- "Export poradcu" → triggers CSV download of advisors list

---

## SQL Summary

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

-- No new tables needed for BLOK 4-5 (using existing tickets, ticket_messages, etc.)
```

## New Email Templates

| Template | Trigger | Recipient |
|----------|---------|-----------|
| `invoiceReady` | Invoice generated | Advisor |
| `invoiceDueSoon` | 3 days before due | Advisor |
| `invoiceOverdue` | 1 day after due | Advisor |
| `invoiceSecondReminder` | 7 days after due | Advisor |
| `subscriptionSuspended` | 14 days after due | Advisor |
| `featureTrialExpiring` | 2 days before feature trial end | Advisor |
| `featureTrialExpired` | Feature trial ended | Advisor |
| `newTicketAlert` | New ticket created | Superadmin |
| `ticketReply` | Superadmin replied | Advisor |
| `newDirectMessage` | Superadmin sent DM | Advisor |

## New Files

| File | Purpose |
|------|---------|
| `src/app/api/public/plans/route.ts` | Public plans API |
| `src/app/api/cron/monthly-invoices/route.ts` | Monthly invoice generation |
| `src/app/api/advisor/invoice/[id]/pdf/route.ts` | PDF invoice generation |
| `src/app/(advisor)/advisor/nastaveni/fakturace/page.tsx` | Advisor invoices page |
| `src/components/SuperadminChatWidget.tsx` | Live chat widget |

## Modified Files

| File | Changes |
|------|---------|
| `src/app/page.tsx` | Dynamic plans fetch in pricing section |
| `src/app/(marketing)/cenik/page.tsx` | Dynamic plans fetch |
| `src/app/(superadmin)/superadmin/plany/page.tsx` | Extended CRUD fields + live preview |
| `src/app/(superadmin)/superadmin/fakturace/page.tsx` | Generate button, mark paid, CSV |
| `src/app/(superadmin)/superadmin/poradci/[id]/page.tsx` | Feature trials section, DM button |
| `src/app/(superadmin)/superadmin/page.tsx` | Enhanced KPIs, charts, activity, actions |
| `src/app/(superadmin)/layout.tsx` | Add SuperadminChatWidget |
| `src/app/(advisor)/layout.tsx` | Feature trial module check logic |
| `src/app/api/cron/daily/route.ts` | Invoice reminders, feature trial checks |
| `src/lib/email/templates.ts` | 10 new email templates |
| `package.json` | Add jspdf dependency |

## Dependencies

- `jspdf` — PDF generation (lightweight, edge-compatible)
- No other new dependencies needed (Recharts, shadcn/ui, Supabase Realtime already present)
