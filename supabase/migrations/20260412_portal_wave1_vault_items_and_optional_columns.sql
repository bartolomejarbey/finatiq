-- Wave 1 UI support. Do not run automatically; review and apply manually.

create table if not exists public.vault_items (
  id uuid primary key default gen_random_uuid(),
  advisor_id uuid references public.advisors(id) on delete set null,
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  type text not null default 'document',
  value text,
  file_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.investments
  add column if not exists purchase_date date;

alter table public.financial_goals
  add column if not exists priority text not null default 'medium';
