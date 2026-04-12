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

alter table public.vault_items enable row level security;

drop policy if exists "Clients read own vault items" on public.vault_items;
create policy "Clients read own vault items" on public.vault_items
  for select using (auth.uid() = (select user_id from public.clients where id = client_id));

drop policy if exists "Clients insert own vault items" on public.vault_items;
create policy "Clients insert own vault items" on public.vault_items
  for insert with check (auth.uid() = (select user_id from public.clients where id = client_id));

drop policy if exists "Clients update own vault items" on public.vault_items;
create policy "Clients update own vault items" on public.vault_items
  for update using (auth.uid() = (select user_id from public.clients where id = client_id));

drop policy if exists "Clients delete own vault items" on public.vault_items;
create policy "Clients delete own vault items" on public.vault_items
  for delete using (auth.uid() = (select user_id from public.clients where id = client_id));

-- Storage bucket needed by AddVaultItemModal. Review before applying.
insert into storage.buckets (id, name, public)
values ('vault-items', 'vault-items', false)
on conflict (id) do nothing;

-- Storage policies depend on the project's preferred folder convention.
-- Current UI uploads to: {client_id}/{timestamp}_{filename}
-- Recommended policy shape: allow authenticated clients to access objects whose
-- first folder segment matches their clients.id.
