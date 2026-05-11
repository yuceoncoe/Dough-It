create table if not exists public.user_app_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  routines jsonb not null default '{"weekday":[],"weekend":[]}'::jsonb,
  tasks_by_date jsonb not null default '{}'::jsonb,
  skipped_rating_task_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_app_state enable row level security;

create policy "Users can view their own app state"
on public.user_app_state
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own app state"
on public.user_app_state
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own app state"
on public.user_app_state
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
