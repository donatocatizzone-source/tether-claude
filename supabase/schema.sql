-- Tether — Supabase schema
-- Mirrors the 8-table design documented during the Gemini/Lovable brainstorm.
-- Run this in the Supabase SQL editor (or via `supabase db push`) on a fresh project.
-- RLS policies below are a reasonable starting point — review before going to production.

create extension if not exists "uuid-ossp";

-- ORGANIZATIONS ---------------------------------------------------------
create table organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  subscription_tier text not null default 'free',
  created_at timestamptz not null default now()
);

-- PROFILES ---------------------------------------------------------------
create table profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade unique,
  full_name text,
  avatar_url text,
  safe_word text,
  duress_pin_hash text,
  role text not null default 'user' check (role in ('user', 'manager', 'admin')),
  organization_id uuid references organizations (id) on delete set null,
  default_view text,
  created_at timestamptz not null default now()
);

-- TRUSTED CONTACTS ---------------------------------------------------------
create table trusted_contacts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  phone text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

-- CHECK-INS ---------------------------------------------------------------
create table check_ins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  location_lat double precision,
  location_long double precision,
  status text not null default 'safe' check (status in ('safe', 'missed', 'duress')),
  created_at timestamptz not null default now()
);

-- ACTIVE SESSIONS (Dating / Ride / Marketplace / Student) ------------------
create table active_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mode_type text not null check (mode_type in ('dating', 'ride', 'marketplace', 'student')),
  details_json jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

-- PROFESSIONAL SESSIONS (B2B — realtors, field agents, etc.) --------------
create table professional_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid references organizations (id) on delete set null,
  client_name text,
  address text,
  notes text,
  start_time timestamptz not null default now(),
  expected_end_time timestamptz,
  status text not null default 'active'
    check (status in ('active', 'completed', 'extended', 'duress_alert', 'expired'))
);

-- USER LOCATIONS (one row per user, upserted every ~30s) -------------------
create table user_locations (
  user_id uuid primary key references auth.users (id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  last_updated timestamptz not null default now()
);

-- INCIDENTS -----------------------------------------------------------------
create table incidents (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid,
  status text not null default 'new' check (status in ('new', 'acknowledged', 'resolved')),
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  resolved_by uuid references auth.users (id),
  resolution_notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- ROW LEVEL SECURITY ----------------------------------------------------
alter table profiles enable row level security;
alter table trusted_contacts enable row level security;
alter table check_ins enable row level security;
alter table active_sessions enable row level security;
alter table professional_sessions enable row level security;
alter table organizations enable row level security;
alter table user_locations enable row level security;
alter table incidents enable row level security;

-- Users manage their own rows across the personal-data tables.
create policy "own profile" on profiles for all using (auth.uid() = user_id);
create policy "own contacts" on trusted_contacts for all using (auth.uid() = user_id);
create policy "own check-ins" on check_ins for all using (auth.uid() = user_id);
create policy "own active sessions" on active_sessions for all using (auth.uid() = user_id);
create policy "own professional sessions" on professional_sessions for all using (auth.uid() = user_id);
create policy "own location write" on user_locations for insert with check (auth.uid() = user_id);
create policy "own location update" on user_locations for update using (auth.uid() = user_id);
create policy "own incidents" on incidents for select using (auth.uid() = user_id);
create policy "own incidents insert" on incidents for insert with check (auth.uid() = user_id);

-- Managers/admins can read everyone in their organization (B2B Overwatch dashboard).
-- NOTE: relies on profiles.organization_id + profiles.role — adjust to match
-- your final auth/role model before shipping.
create policy "org managers read team locations" on user_locations for select using (
  exists (
    select 1 from profiles viewer
    join profiles target on target.user_id = user_locations.user_id
    where viewer.user_id = auth.uid()
      and viewer.role in ('manager', 'admin')
      and viewer.organization_id = target.organization_id
  )
);

create policy "org managers read team incidents" on incidents for select using (
  exists (
    select 1 from profiles viewer
    where viewer.user_id = auth.uid()
      and viewer.role in ('manager', 'admin')
      and viewer.organization_id = incidents.organization_id
  )
);

create policy "org managers resolve incidents" on incidents for update using (
  exists (
    select 1 from profiles viewer
    where viewer.user_id = auth.uid()
      and viewer.role in ('manager', 'admin')
      and viewer.organization_id = incidents.organization_id
  )
);
