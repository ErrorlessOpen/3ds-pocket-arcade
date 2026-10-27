-- Run this in the Supabase SQL Editor. The table contains encrypted save bytes.
create table if not exists public.emulator_saves (
  user_id uuid not null references auth.users (id) on delete cascade,
  game_key text not null check (length(game_key) = 64),
  salt text not null,
  iv text not null,
  ciphertext text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, game_key)
);

alter table public.emulator_saves enable row level security;

revoke all on public.emulator_saves from anon;
grant select, insert, update, delete on public.emulator_saves to authenticated;

drop policy if exists "Users can read their own saves" on public.emulator_saves;
create policy "Users can read their own saves"
  on public.emulator_saves for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own saves" on public.emulator_saves;
create policy "Users can create their own saves"
  on public.emulator_saves for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own saves" on public.emulator_saves;
create policy "Users can update their own saves"
  on public.emulator_saves for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own saves" on public.emulator_saves;
create policy "Users can delete their own saves"
  on public.emulator_saves for delete to authenticated
  using ((select auth.uid()) = user_id);
