-- FUEL · esquema do Supabase (sincronização entre aparelhos)
--
-- Como aplicar: Supabase → SQL Editor → New query → cole TUDO isto → Run.
-- Pode rodar de novo sem problema (é idempotente).
--
-- Modelo: o app guarda tudo no aparelho (offline) e sincroniza em duas tabelas:
--   app_config  → 1 linha por usuário: perfil, alimentos, dieta e lista de compras (JSON)
--   daily_logs  → 1 linha por usuário e por dia: refeições marcadas, água e pesagem (JSON)
-- `modified_ms` é o horário da última edição (milissegundos); vence a edição mais recente.

create table if not exists public.app_config (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  data         jsonb  not null,
  modified_ms  bigint not null,
  updated_at   timestamptz not null default now()
);

create table if not exists public.daily_logs (
  user_id      uuid not null references auth.users (id) on delete cascade,
  date         date not null,
  data         jsonb  not null,
  modified_ms  bigint not null,
  updated_at   timestamptz not null default now(),
  primary key (user_id, date)
);

create index if not exists daily_logs_modified_idx
  on public.daily_logs (user_id, modified_ms);

-- Segurança: cada pessoa só enxerga e altera as próprias linhas (RLS).
alter table public.app_config enable row level security;
alter table public.daily_logs enable row level security;

drop policy if exists "own config" on public.app_config;
create policy "own config" on public.app_config
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "own logs" on public.daily_logs;
create policy "own logs" on public.daily_logs
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
