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

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.push_subscriptions enable row level security;

create policy "Users can manage their own push subscriptions"
on public.push_subscriptions
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.scheduled_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id text not null,
  event_type text not null check (event_type in ('start', 'end')),
  title text not null,
  body text not null,
  scheduled_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed')),
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists scheduled_notifications_due_idx
on public.scheduled_notifications (status, scheduled_at);

delete from public.scheduled_notifications older
using public.scheduled_notifications newer
where older.user_id = newer.user_id
  and older.task_id = newer.task_id
  and older.event_type = newer.event_type
  and older.created_at < newer.created_at;

create unique index if not exists scheduled_notifications_task_event_idx
on public.scheduled_notifications (user_id, task_id, event_type);

alter table public.scheduled_notifications enable row level security;

create policy "Users can manage their own scheduled notifications"
on public.scheduled_notifications
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
