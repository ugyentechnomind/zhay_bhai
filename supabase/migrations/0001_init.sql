-- Zhay Bhai AI: initial schema
-- Profiles, Google account connections, synced calendar events, generated excuses,
-- and personal access tokens used by the browser extension.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: one row per authenticated app user (mirrors auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- connected_accounts: Google OAuth tokens (calendar.readonly + gmail.send).
-- Only ever read/written via the Next.js server using the service role key,
-- so RLS is enabled with NO policies -> inaccessible to the anon/authenticated
-- roles, including the row owner.
-- ---------------------------------------------------------------------------
create table if not exists public.connected_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  google_email text not null,
  refresh_token text not null,
  access_token text,
  access_token_expires_at timestamptz,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.connected_accounts enable row level security;

-- ---------------------------------------------------------------------------
-- calendar_events: synced window of +/- 5 days around "now"
-- ---------------------------------------------------------------------------
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  google_event_id text not null,
  title text not null default '(no title)',
  description text,
  organizer_email text,
  organizer_name text,
  location text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'needsAction'
    check (status in ('needsAction', 'accepted', 'declined', 'tentative', 'bunked')),
  html_link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, google_event_id)
);

create index if not exists calendar_events_user_time_idx
  on public.calendar_events (user_id, start_time);

alter table public.calendar_events enable row level security;

create policy "calendar_events_select_own" on public.calendar_events
  for select using (auth.uid() = user_id);

create policy "calendar_events_modify_own" on public.calendar_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- excuses: generated (and optionally sent) excuse text per event
-- ---------------------------------------------------------------------------
create table if not exists public.excuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id uuid not null references public.calendar_events (id) on delete cascade,
  tone text not null,
  subject text not null,
  body text not null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists excuses_user_idx on public.excuses (user_id, created_at desc);

alter table public.excuses enable row level security;

create policy "excuses_select_own" on public.excuses
  for select using (auth.uid() = user_id);

create policy "excuses_modify_own" on public.excuses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- extension_tokens: personal access tokens the browser extension uses to call
-- the web app's API on the user's behalf (never store the raw token, only its
-- hash). RLS enabled, no client-facing policies -> service role only.
-- ---------------------------------------------------------------------------
create table if not exists public.extension_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null unique,
  name text not null default 'Browser extension',
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

alter table public.extension_tokens enable row level security;
