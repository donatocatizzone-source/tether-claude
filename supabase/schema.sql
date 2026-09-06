-- Tether — Supabase schema
-- Consolidated from the 16-migration history of the actual most-advanced
-- Tether build (see CLAUDE.md's "Ground truth" section — the `OLD/` Lovable
-- project, not the earlier single-file HTML demo). Run this in the Supabase
-- SQL editor (or via `supabase db push`) on a fresh project.
--
-- This intentionally mirrors OLD's migrations 1:1 (same table/column names,
-- same enum values, same per-action RLS policies) rather than re-designing
-- anything, so it can be validated against a codebase that was actually
-- built and tested against it.

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ENUMS ---------------------------------------------------------------------
create type public.check_in_status as enum ('idle', 'active', 'emergency');
create type public.app_role as enum ('user', 'admin', 'security_guard', 'manager');
create type public.professional_session_status as enum ('active', 'completed', 'extended', 'duress_alert', 'expired');
create type public.incident_status as enum ('new', 'acknowledged', 'resolved');
create type public.incident_severity as enum ('low', 'medium', 'high', 'critical');
create type public.incident_outcome as enum ('false_alarm', 'user_safe', 'emergency_services_called', 'test');
create type public.invitation_status as enum ('pending', 'accepted', 'expired');

-- ORGANIZATIONS ---------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subscription_tier text not null default 'free',
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;

-- PROFILES ---------------------------------------------------------------
-- 1:1 with auth.users, auto-created on signup by handle_new_user().
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade unique,
  full_name text,
  avatar_url text,
  safe_word text,
  duress_pin_hash text,
  organization_id uuid references public.organizations (id),
  job_title text default '',
  job_description text default '',
  phone text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- USER ROLES (separate table — never store roles directly on profiles) -----
-- A user can hold more than one role (e.g. invited as 'manager' still gets
-- the default 'user' row from handle_new_user_role()); has_role() checks
-- for a specific role rather than assuming one row per user.
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null default 'user',
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- TRUSTED CONTACTS ---------------------------------------------------------
create table public.trusted_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  phone text not null,
  relationship text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.trusted_contacts enable row level security;

-- CHECK-INS ---------------------------------------------------------------
create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  location_lat double precision,
  location_lng double precision,
  status public.check_in_status not null default 'idle',
  created_at timestamptz not null default now()
);

alter table public.check_ins enable row level security;

-- ACTIVE SESSIONS (Dating / Ride / Marketplace / Student) ------------------
create table public.active_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  mode_type text not null check (mode_type in ('dating', 'ride', 'marketplace', 'student')),
  details_json jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'completed', 'emergency')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.active_sessions enable row level security;

-- PROFESSIONAL SESSIONS (Pro Guard — B2B field employees) ------------------
create table public.professional_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  organization_id uuid references public.organizations (id),
  client_name text not null,
  address text not null default '',
  notes text default '',
  start_time timestamptz not null default now(),
  expected_end_time timestamptz not null,
  status public.professional_session_status not null default 'active',
  -- Geofence: if user_locations moves outside this radius while the
  -- session is active, check_geofence_breach() auto-creates a medium
  -- severity incident.
  geofence_lat double precision,
  geofence_lng double precision,
  geofence_radius_m int not null default 200,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.professional_sessions enable row level security;
alter publication supabase_realtime add table public.professional_sessions;

-- INCIDENTS -----------------------------------------------------------------
-- Fed by: geofence breaches (check_geofence_breach trigger), duress PIN
-- entry (professional_sessions.status -> 'duress_alert'), and any other
-- manual/duress-triggered insert. Managers/admins work these in Overwatch.
create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  user_id uuid not null,
  session_id uuid references public.professional_sessions (id),
  status public.incident_status not null default 'new',
  severity public.incident_severity not null default 'medium',
  acknowledged_by uuid,
  resolved_by uuid,
  outcome public.incident_outcome,
  resolution_notes text,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz
);

alter table public.incidents enable row level security;
alter publication supabase_realtime add table public.incidents;

create index idx_incidents_org_status on public.incidents (organization_id, status);
create index idx_incidents_user on public.incidents (user_id);

-- USER LOCATIONS (one row per user, upserted ~every 30s by useGeoTracking) -
create table public.user_locations (
  user_id uuid primary key,
  lat double precision not null default 0,
  lng double precision not null default 0,
  last_updated timestamptz not null default now()
);

alter table public.user_locations enable row level security;
alter publication supabase_realtime add table public.user_locations;

-- ORG INVITATIONS -----------------------------------------------------------
-- Manager/admin invites an employee by email + role; handle_invitation_on_signup()
-- auto-assigns org + role when that email signs up.
create table public.org_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  email text not null,
  role public.app_role not null default 'user',
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid not null,
  status public.invitation_status not null default 'pending',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

alter table public.org_invitations enable row level security;

-- WALK SESSIONS (Walk Home + shareable live link) ---------------------------
create table public.walk_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  destination text not null default '',
  share_token uuid not null unique default gen_random_uuid(),
  status text not null default 'active',
  duration_seconds int not null default 900,
  started_at timestamptz not null default now(),
  expected_end_at timestamptz not null default (now() + interval '15 minutes'),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.walk_sessions enable row level security;
alter publication supabase_realtime add table public.walk_sessions;

-- DATE SESSIONS (Dating Mode / Date Guard history) --------------------------
create table public.date_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  meeting_name text not null,
  location text not null default '',
  location_lat double precision,
  location_lng double precision,
  notes text default '',
  check_in_interval int not null default 30,
  status text not null default 'active',
  safety_events jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.date_sessions enable row level security;

-- MARKETPLACE SESSIONS (MarketGuard + Hire-a-Proxy) --------------------------
create table public.marketplace_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  item_name text not null,
  seller_name text not null default '',
  location text not null default '',
  location_lat double precision,
  location_lng double precision,
  price text default '',
  notes text default '',
  check_in_interval int not null default 30,
  status text not null default 'active',
  safety_events jsonb not null default '[]'::jsonb,
  proxy_requested boolean not null default false,
  proxy_notes text default '',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.marketplace_sessions enable row level security;

-- SAFE SPACES -----------------------------------------------------------
create table public.safe_spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null default '',
  description text default '',
  category text not null default 'general',
  lat double precision not null,
  lng double precision not null,
  verified boolean not null default false,
  is_business boolean not null default false,
  business_name text default '',
  business_phone text default '',
  business_website text default '',
  submitted_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.safe_spaces enable row level security;

-- CIRCLE INVITATIONS + MEMBERS -----------------------------------------------
create table public.circle_invitations (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid not null,
  invited_name text,
  accepted_by uuid,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.circle_invitations enable row level security;

-- Mutual connections: accept_circle_invite() inserts BOTH directions.
create table public.circle_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  member_id uuid not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (user_id, member_id)
);

alter table public.circle_members enable row level security;

-- FUNCTIONS -------------------------------------------------------------

-- Auto-create profile on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Generic updated_at bumper, reused by every table below with an
-- updated_at column.
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

create trigger update_active_sessions_updated_at
  before update on public.active_sessions
  for each row execute function public.update_updated_at_column();

create trigger update_professional_sessions_updated_at
  before update on public.professional_sessions
  for each row execute function public.update_updated_at_column();

create trigger update_walk_sessions_updated_at
  before update on public.walk_sessions
  for each row execute function public.update_updated_at_column();

create trigger update_date_sessions_updated_at
  before update on public.date_sessions
  for each row execute function public.update_updated_at_column();

create trigger update_marketplace_sessions_updated_at
  before update on public.marketplace_sessions
  for each row execute function public.update_updated_at_column();

create trigger update_safe_spaces_updated_at
  before update on public.safe_spaces
  for each row execute function public.update_updated_at_column();

-- Auto-assign the default 'user' role on signup. Runs alongside (not
-- instead of) org-invitation role assignment below — a user invited as
-- 'manager' ends up holding BOTH 'manager' and 'user' rows, by design
-- (matches OLD's actual behavior: trigger names sort alphabetically, so
-- on_auth_user_created_invitation runs before on_auth_user_created_role).
create or replace function public.handle_new_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end;
$$;

create trigger on_auth_user_created_role
  after insert on auth.users
  for each row execute function public.handle_new_user_role();

-- Security-definer role/org lookups (avoid RLS recursion in policies).
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create or replace function public.get_user_org_id(_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where user_id = _user_id limit 1
$$;

-- On signup, auto-accept any pending org invitation for this email:
-- assigns organization_id on the profile + the invited role, then marks
-- the invitation accepted.
create or replace function public.handle_invitation_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invite record;
begin
  select * into invite
  from public.org_invitations
  where email = new.email
    and status = 'pending'
    and expires_at > now()
  order by created_at desc
  limit 1;

  if found then
    update public.profiles
    set organization_id = invite.organization_id
    where user_id = new.id;

    insert into public.user_roles (user_id, role)
    values (new.id, invite.role)
    on conflict (user_id, role) do nothing;

    update public.org_invitations
    set status = 'accepted'
    where id = invite.id;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created_invitation
  after insert on auth.users
  for each row execute function public.handle_invitation_on_signup();

-- Haversine-distance geofence check: fires on every user_locations
-- upsert; if the user has an active professional_session with a geofence
-- and their new position is outside geofence_radius_m, auto-creates a
-- medium-severity incident (deduped to one per 5 minutes per session).
create or replace function public.check_geofence_breach()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sess record;
  dist_m double precision;
begin
  for sess in
    select id, organization_id, geofence_lat, geofence_lng, geofence_radius_m, geofence_armed_at
    from public.professional_sessions
    where user_id = new.user_id
      -- 'extended' sessions are still live and must stay monitored.
      and status in ('active', 'extended')
      and geofence_lat is not null
      and geofence_lng is not null
      -- incidents.organization_id is NOT NULL, and a null here would make the
      -- insert below throw inside a trigger on user_locations — aborting the
      -- location upsert and silently killing GPS tracking for this user.
      and organization_id is not null
  loop
    dist_m := 6371000 * 2 * asin(sqrt(
      power(sin(radians(new.lat - sess.geofence_lat) / 2), 2) +
      cos(radians(sess.geofence_lat)) * cos(radians(new.lat)) *
      power(sin(radians(new.lng - sess.geofence_lng) / 2), 2)
    ));

    if dist_m <= sess.geofence_radius_m then
      -- Arrived. Arm the fence, and record GPS-verified presence for the
      -- seller-facing showing record ("Verified on site").
      if sess.geofence_armed_at is null then
        update public.professional_sessions
          set geofence_armed_at = now()
          where id = sess.id;
      end if;

      update public.showings
        set verified_at = now()
        where session_id = sess.id and verified_at is null;

    elsif sess.geofence_armed_at is not null then
      -- Only alert once the agent has actually ARRIVED at least once.
      -- Without this guard, auto-arming a geofence from a property means
      -- every agent who starts a session from their car trips an incident
      -- immediately. Leaving mid-showing still alerts, which is the case
      -- the geofence was always meant to catch. Deduped to 1 per 5 min.
      if not exists (
        select 1 from public.incidents
        where session_id = sess.id
          and severity = 'medium'
          and created_at > now() - interval '5 minutes'
      ) then
        insert into public.incidents (user_id, organization_id, session_id, severity, status)
        values (new.user_id, sess.organization_id, sess.id, 'medium', 'new');
      end if;
    end if;
  end loop;

  return new;
end;
$$;

create trigger trg_check_geofence
  after insert or update on public.user_locations
  for each row execute function public.check_geofence_breach();

-- Accepts a circle invite by token: marks it accepted and inserts BOTH
-- directions of the mutual connection into circle_members.
create or replace function public.accept_circle_invite(_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  invite record;
begin
  select * into invite
  from public.circle_invitations
  where token = _token and status = 'pending';

  if not found then
    return false;
  end if;

  if invite.invited_by = auth.uid() then
    return false; -- can't accept your own invite
  end if;

  update public.circle_invitations
  set status = 'accepted', accepted_by = auth.uid(), updated_at = now()
  where id = invite.id;

  insert into public.circle_members (user_id, member_id)
  values (invite.invited_by, auth.uid())
  on conflict do nothing;

  insert into public.circle_members (user_id, member_id)
  values (auth.uid(), invite.invited_by)
  on conflict do nothing;

  return true;
end;
$$;

-- ROW LEVEL SECURITY POLICIES ------------------------------------------------
-- Kept as separate per-action policies (matching OLD exactly) rather than
-- collapsed into `for all`, since that's the proven, tested shape.

-- profiles
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = user_id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = user_id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = user_id);
create policy "Users can delete own profile" on public.profiles for delete using (auth.uid() = user_id);
create policy "Admins can view org profiles" on public.profiles for select to authenticated
  using (public.has_role(auth.uid(), 'admin') and organization_id = public.get_user_org_id(auth.uid()));

-- organizations
create policy "Admins can view their org" on public.organizations for select to authenticated
  using (id = public.get_user_org_id(auth.uid()));
create policy "Admins can update their org" on public.organizations for update to authenticated
  using (id = public.get_user_org_id(auth.uid()) and public.has_role(auth.uid(), 'admin'));

-- user_roles
create policy "Users can view own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid());
create policy "Admins can view org member roles" on public.user_roles for select to authenticated
  using (
    public.has_role(auth.uid(), 'admin')
    and exists (
      select 1 from public.profiles p
      where p.user_id = user_roles.user_id
        and p.organization_id = public.get_user_org_id(auth.uid())
    )
  );
create policy "Admins can manage org member roles" on public.user_roles for all to authenticated
  using (
    public.has_role(auth.uid(), 'admin')
    and exists (
      select 1 from public.profiles p
      where p.user_id = user_roles.user_id
        and p.organization_id = public.get_user_org_id(auth.uid())
    )
  );

-- trusted_contacts
create policy "Users can view own contacts" on public.trusted_contacts for select using (auth.uid() = user_id);
create policy "Users can insert own contacts" on public.trusted_contacts for insert with check (auth.uid() = user_id);
create policy "Users can update own contacts" on public.trusted_contacts for update using (auth.uid() = user_id);
create policy "Users can delete own contacts" on public.trusted_contacts for delete using (auth.uid() = user_id);

-- check_ins
create policy "Users can view own check_ins" on public.check_ins for select using (auth.uid() = user_id);
create policy "Users can insert own check_ins" on public.check_ins for insert with check (auth.uid() = user_id);
create policy "Users can update own check_ins" on public.check_ins for update using (auth.uid() = user_id);
create policy "Users can delete own check_ins" on public.check_ins for delete using (auth.uid() = user_id);
create policy "Admins can view org check_ins" on public.check_ins for select
  using (
    public.has_role(auth.uid(), 'admin')
    and exists (
      select 1 from public.profiles p
      where p.user_id = check_ins.user_id
        and p.organization_id = public.get_user_org_id(auth.uid())
    )
  );

-- active_sessions
create policy "Users can view own sessions" on public.active_sessions for select using (auth.uid() = user_id);
create policy "Users can insert own sessions" on public.active_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own sessions" on public.active_sessions for update using (auth.uid() = user_id);
create policy "Users can delete own sessions" on public.active_sessions for delete using (auth.uid() = user_id);
create policy "Admins can view org sessions" on public.active_sessions for select
  using (
    public.has_role(auth.uid(), 'admin')
    and exists (
      select 1 from public.profiles p
      where p.user_id = active_sessions.user_id
        and p.organization_id = public.get_user_org_id(auth.uid())
    )
  );

-- professional_sessions
create policy "Users can view own pro sessions" on public.professional_sessions for select using (auth.uid() = user_id);
create policy "Users can insert own pro sessions" on public.professional_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own pro sessions" on public.professional_sessions for update using (auth.uid() = user_id);
create policy "Users can delete own pro sessions" on public.professional_sessions for delete using (auth.uid() = user_id);
create policy "Managers can view org pro sessions" on public.professional_sessions for select
  using (public.has_role(auth.uid(), 'manager') and organization_id = public.get_user_org_id(auth.uid()));
create policy "Admins can view org pro sessions" on public.professional_sessions for select
  using (public.has_role(auth.uid(), 'admin') and organization_id = public.get_user_org_id(auth.uid()));

-- incidents
create policy "Users can view own incidents" on public.incidents for select to authenticated using (user_id = auth.uid());
create policy "Users can insert own incidents" on public.incidents for insert to authenticated with check (user_id = auth.uid());
create policy "Managers can view org incidents" on public.incidents for select to authenticated
  using (
    organization_id = public.get_user_org_id(auth.uid())
    and (public.has_role(auth.uid(), 'manager') or public.has_role(auth.uid(), 'admin'))
  );
create policy "Managers can update org incidents" on public.incidents for update to authenticated
  using (
    organization_id = public.get_user_org_id(auth.uid())
    and (public.has_role(auth.uid(), 'manager') or public.has_role(auth.uid(), 'admin'))
  );

-- user_locations
create policy "Users can insert own location" on public.user_locations for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own location" on public.user_locations for update to authenticated using (auth.uid() = user_id);
create policy "Users can view own location" on public.user_locations for select to authenticated using (auth.uid() = user_id);
create policy "Managers can view org locations" on public.user_locations for select to authenticated
  using (
    (public.has_role(auth.uid(), 'manager') or public.has_role(auth.uid(), 'admin'))
    and exists (
      select 1 from public.profiles p
      where p.user_id = user_locations.user_id
        and p.organization_id = public.get_user_org_id(auth.uid())
    )
  );
create policy "Circle members can view each other locations" on public.user_locations for select to authenticated
  using (
    exists (
      select 1 from public.circle_members
      where circle_members.user_id = auth.uid()
        and circle_members.member_id = user_locations.user_id
        and circle_members.status = 'active'
    )
  );

-- org_invitations
create policy "Managers can view org invitations" on public.org_invitations for select to authenticated
  using (
    organization_id = public.get_user_org_id(auth.uid())
    and (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'manager'))
  );
create policy "Managers can create org invitations" on public.org_invitations for insert to authenticated
  with check (
    organization_id = public.get_user_org_id(auth.uid())
    and (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'manager'))
  );
create policy "Managers can update org invitations" on public.org_invitations for update to authenticated
  using (
    organization_id = public.get_user_org_id(auth.uid())
    and (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'manager'))
  );
-- Public token lookup so the /invite/:token accept page works signed-out.
create policy "Anyone can read invitation by token" on public.org_invitations for select using (true);

-- walk_sessions
create policy "Users can insert own walk sessions" on public.walk_sessions for insert with check (auth.uid() = user_id);
create policy "Users can view own walk sessions" on public.walk_sessions for select using (auth.uid() = user_id);
create policy "Users can update own walk sessions" on public.walk_sessions for update using (auth.uid() = user_id);
create policy "Users can delete own walk sessions" on public.walk_sessions for delete using (auth.uid() = user_id);
-- Public share access so /walk/share/:token works signed-out.
create policy "Anyone can view walk session by share token" on public.walk_sessions for select to anon, authenticated using (true);
create policy "Managers can view org walk sessions" on public.walk_sessions for select to authenticated
  using (
    (public.has_role(auth.uid(), 'manager') or public.has_role(auth.uid(), 'admin'))
    and exists (
      select 1 from public.profiles p
      where p.user_id = walk_sessions.user_id
        and p.organization_id = public.get_user_org_id(auth.uid())
    )
  );

-- date_sessions
create policy "Users can insert own date sessions" on public.date_sessions for insert with check (auth.uid() = user_id);
create policy "Users can view own date sessions" on public.date_sessions for select using (auth.uid() = user_id);
create policy "Users can update own date sessions" on public.date_sessions for update using (auth.uid() = user_id);
create policy "Users can delete own date sessions" on public.date_sessions for delete using (auth.uid() = user_id);

-- marketplace_sessions
create policy "Users can view own marketplace sessions" on public.marketplace_sessions for select using (auth.uid() = user_id);
create policy "Users can insert own marketplace sessions" on public.marketplace_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own marketplace sessions" on public.marketplace_sessions for update using (auth.uid() = user_id);
create policy "Users can delete own marketplace sessions" on public.marketplace_sessions for delete using (auth.uid() = user_id);

-- safe_spaces (public read, since Safe Spaces is meant to be browseable signed-out)
create policy "Anyone can view safe spaces" on public.safe_spaces for select using (true);
create policy "Authenticated users can suggest safe spaces" on public.safe_spaces for insert to authenticated
  with check (auth.uid() = submitted_by);
create policy "Admins can update safe spaces" on public.safe_spaces for update to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can delete safe spaces" on public.safe_spaces for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- circle_invitations
create policy "Anyone can read invitation by token" on public.circle_invitations for select using (true);
create policy "Users can create own invitations" on public.circle_invitations for insert to authenticated
  with check (auth.uid() = invited_by);
create policy "Users can update own invitations" on public.circle_invitations for update to authenticated
  using (auth.uid() = invited_by or auth.uid() = accepted_by);

-- circle_members
create policy "Users can view own circle members" on public.circle_members for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own circle members" on public.circle_members for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can delete own circle members" on public.circle_members for delete to authenticated using (auth.uid() = user_id);

-- SEED DATA -------------------------------------------------------------
-- A handful of default Safe Spaces (NYC-area) so the map isn't empty
-- before real Google Places results / user submissions come in.
insert into public.safe_spaces (name, address, category, lat, lng, verified, description) values
  ('NYPD 6th Precinct', '233 W 10th St, New York, NY', 'police_station', 40.7340, -74.0027, true, 'Police station — 24/7 safe meetup point'),
  ('FDNY Engine 24', '227 6th Ave, New York, NY', 'fire_station', 40.7295, -73.9990, true, 'Fire station — public safe zone'),
  ('Jefferson Market Library', '425 6th Ave, New York, NY', 'library', 40.7340, -73.9981, true, 'Public library with security cameras'),
  ('Union Square Safe Exchange Zone', 'Union Square, New York, NY', 'exchange_zone', 40.7359, -73.9911, true, 'Designated safe exchange zone with surveillance'),
  ('Starbucks - Astor Place', '13 Astor Pl, New York, NY', 'business', 40.7299, -73.9912, true, 'Well-lit business with public Wi-Fi and cameras');


-- =====================================================================
-- REAL-ESTATE B2B (mirrors supabase/migrations/0001_realestate.sql)
-- =====================================================================
-- Kept in sync with that migration by hand — edit both in the same commit.
-- Appended rather than interleaved above: every dependency (organizations,
-- professional_sessions, profiles, auth.users) is already defined by this
-- point, so a fresh project still builds correctly from this one file.
-- The check_geofence_breach() rewrite is NOT repeated here — it was folded
-- into that function in place above.


-- ---------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------
do $$ begin
  create type public.property_status as enum ('active','pending','sold','off_market','withdrawn');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.showing_status as enum
    ('scheduled','confirmed','in_progress','completed','cancelled','no_show');
exception when duplicate_object then null; end $$;

-- Values deliberately match the `value` strings already hardcoded in
-- TeamMemberView's ACTIVITY_PRESETS, so that array becomes the label map
-- for this enum with no value changes on the client.
do $$ begin
  create type public.session_activity as enum
    ('showing','open_house','appraisal','client_meeting','inspection','listing_appointment','other');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 2. properties
-- ---------------------------------------------------------------------
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,

  address_line1 text not null,
  address_line2 text not null default '',
  city text not null default '',
  state text not null default '',
  postal_code text not null default '',
  lat double precision,
  lng double precision,
  geofence_radius_m int not null default 150,

  beds numeric(3,1),
  baths numeric(3,1),
  sqft int,
  list_price numeric(12,2),
  mls_number text not null default '',
  image_url text not null default '',
  status public.property_status not null default 'active',

  seller_name text not null default '',
  seller_email text not null default '',
  -- Lockbox / alarm codes. NEVER exposed by the public seller RPC below.
  access_notes text not null default '',

  -- Seller-facing share link. Token exists from creation but is inert until
  -- a manager explicitly enables sharing.
  share_token uuid not null unique default gen_random_uuid(),
  share_enabled boolean not null default false,
  share_expires_at timestamptz,
  -- Publishing FUTURE showings reveals the occupancy schedule of a possibly
  -- vacant house, so it is opt-in per property and defaults to off.
  share_include_upcoming boolean not null default false,

  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_properties_org_status on public.properties (organization_id, status);

-- ---------------------------------------------------------------------
-- 3. property_assignments
-- ---------------------------------------------------------------------
create table if not exists public.property_assignments (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'showing_agent'
    check (role in ('listing_agent','co_listing_agent','showing_agent')),
  assigned_by uuid,
  created_at timestamptz not null default now(),
  unique (property_id, user_id)
);

create index if not exists idx_property_assignments_user on public.property_assignments (user_id);

-- ---------------------------------------------------------------------
-- 4. showings
-- ---------------------------------------------------------------------
create table if not exists public.showings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,

  -- `set null`, NOT cascade: an agent leaving the brokerage must not erase
  -- the seller's historical record. agent_display_name is the durable
  -- snapshot, and also keeps the public RPC from having to join profiles.
  agent_id uuid references auth.users (id) on delete set null,
  agent_display_name text not null default 'Agent',

  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  status public.showing_status not null default 'scheduled',
  activity_type public.session_activity not null default 'showing',

  buyer_name text not null default '',          -- internal only, never public
  buyer_agent_brokerage text not null default '',
  notes text not null default '',               -- internal only, never public
  feedback text not null default '',            -- optional, seller-visible

  session_id uuid references public.professional_sessions (id) on delete set null,
  actual_start timestamptz,
  actual_end timestamptz,
  -- Timestamp rather than a boolean: "GPS-confirmed on site at 2:07 PM" is
  -- strictly more informative, and the boolean is just `verified_at is not null`.
  verified_at timestamptz,
  cancelled_reason text not null default '',

  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint showings_time_order check (scheduled_end > scheduled_start)
);

create index if not exists idx_showings_org_start on public.showings (organization_id, scheduled_start);
create index if not exists idx_showings_agent_start on public.showings (agent_id, scheduled_start);
create index if not exists idx_showings_property_start on public.showings (property_id, scheduled_start desc);

-- Double-booking: PREVENT at agent level (one person cannot be in two places,
-- so a hard error is the honest answer) but only DETECT at property level
-- (two agents at one house is sometimes deliberate — open house, dual agency —
-- so the broker wants it visible, not blocked; that is a client-side metric).
create extension if not exists btree_gist;

do $$ begin
  alter table public.showings add constraint showings_no_agent_overlap
    exclude using gist (
      agent_id with =,
      tstzrange(scheduled_start, scheduled_end) with &&
    ) where (status in ('scheduled','confirmed','in_progress'));
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 5. Columns on existing tables
-- ---------------------------------------------------------------------

-- professional_sessions.client_name was overloaded three different ways:
-- the real client name (ProGuardSetup), the activity label (TeamMemberView),
-- and the literal string 'Admin-initiated session' (OverwatchDashboard).
-- activity_type gives per-activity rollups a real column to group on.
alter table public.professional_sessions
  add column if not exists activity_type public.session_activity not null default 'other',
  add column if not exists property_id uuid references public.properties (id) on delete set null,
  -- Without this, average showing duration is uncomputable. updated_at is not
  -- a proxy: extending a session bumps it.
  add column if not exists actual_end_time timestamptz,
  -- Set the first time the agent is seen INSIDE the geofence. See the trigger
  -- rewrite below for why breach alerts must wait for this.
  add column if not exists geofence_armed_at timestamptz;

-- One-time backfill of the overloaded column. 'Admin-initiated session'
-- correctly stays 'other'.
update public.professional_sessions set activity_type = 'showing'
  where activity_type = 'other' and lower(client_name) like '%showing%';
update public.professional_sessions set activity_type = 'open_house'
  where activity_type = 'other' and lower(client_name) like '%open house%';
update public.professional_sessions set activity_type = 'appraisal'
  where activity_type = 'other' and lower(client_name) like '%appraisal%';
update public.professional_sessions set activity_type = 'client_meeting'
  where activity_type = 'other' and lower(client_name) like '%client meeting%';

-- Brokerage identity for the seller-facing page, plus the timezone and
-- workday that on-time rate and utilization both depend on. Hardcoding these
-- in TypeScript would be a silent correctness bug for any brokerage outside
-- the developer's own timezone.
alter table public.organizations
  add column if not exists logo_url text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists website text not null default '',
  add column if not exists license_number text not null default '',
  add column if not exists timezone text not null default 'America/Chicago',
  add column if not exists business_hours_start smallint not null default 9,
  add column if not exists business_hours_end smallint not null default 18;

-- ---------------------------------------------------------------------
-- 6. updated_at triggers (reuses the existing shared function)
-- ---------------------------------------------------------------------
drop trigger if exists update_properties_updated_at on public.properties;
create trigger update_properties_updated_at
  before update on public.properties
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_showings_updated_at on public.showings;
create trigger update_showings_updated_at
  before update on public.showings
  for each row execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- 7. set_showing_org() — cross-tenant guard
-- ---------------------------------------------------------------------
-- A manager could otherwise insert a showing carrying their OWN
-- organization_id while pointing at ANOTHER org's property_id; the RLS
-- `with check` only inspects the org column, so it would pass. Deriving the
-- org from the property server-side closes that.
create or replace function public.set_showing_org()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select p.organization_id into new.organization_id
  from public.properties p
  where p.id = new.property_id;

  if new.organization_id is null then
    raise exception 'property % not found', new.property_id;
  end if;

  new.agent_display_name := coalesce(
    nullif((select full_name from public.profiles where user_id = new.agent_id), ''),
    nullif(new.agent_display_name, ''),
    'Agent'
  );

  return new;
end;
$$;

drop trigger if exists trg_set_showing_org on public.showings;
create trigger trg_set_showing_org
  before insert or update of property_id, agent_id on public.showings
  for each row execute function public.set_showing_org();

-- ---------------------------------------------------------------------
-- 9. sync_showing_from_session()
-- ---------------------------------------------------------------------
-- Mirrors session completion onto the linked showing server-side, so a client
-- that navigates away mid-flow cannot leave the seller's record half-written.
create or replace function public.sync_showing_from_session()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status
     and new.status in ('completed', 'expired', 'duress_alert') then

    if new.actual_end_time is null then
      new.actual_end_time := now();
    end if;

    update public.showings
      set actual_end = coalesce(actual_end, now()),
          status = case when status = 'in_progress' then 'completed'::public.showing_status else status end
      where session_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_showing_from_session on public.professional_sessions;
create trigger trg_sync_showing_from_session
  before update of status on public.professional_sessions
  for each row execute function public.sync_showing_from_session();

-- ---------------------------------------------------------------------
-- 10. RLS
-- ---------------------------------------------------------------------
alter table public.properties enable row level security;
alter table public.property_assignments enable row level security;
alter table public.showings enable row level security;

-- Fail-closed note: get_user_org_id() returns NULL for a user with no org, and
-- `organization_id = NULL` evaluates to NULL (not true), so those users match
-- no rows. Both tables are `organization_id not null`, so there is no
-- null-equals-null hole.

-- properties ----------------------------------------------------------
-- SELECT is org-wide rather than assignment-scoped on purpose: agents need to
-- browse the roster to schedule, cover for each other, and see coverage gaps.
drop policy if exists "Org members can view org properties" on public.properties;
create policy "Org members can view org properties" on public.properties for select to authenticated
  using (organization_id = public.get_user_org_id(auth.uid()));

drop policy if exists "Managers can insert org properties" on public.properties;
create policy "Managers can insert org properties" on public.properties for insert to authenticated
  with check (
    organization_id = public.get_user_org_id(auth.uid())
    and (public.has_role(auth.uid(), 'manager') or public.has_role(auth.uid(), 'admin'))
  );

drop policy if exists "Managers can update org properties" on public.properties;
create policy "Managers can update org properties" on public.properties for update to authenticated
  using (
    organization_id = public.get_user_org_id(auth.uid())
    and (public.has_role(auth.uid(), 'manager') or public.has_role(auth.uid(), 'admin'))
  );

drop policy if exists "Managers can delete org properties" on public.properties;
create policy "Managers can delete org properties" on public.properties for delete to authenticated
  using (
    organization_id = public.get_user_org_id(auth.uid())
    and (public.has_role(auth.uid(), 'manager') or public.has_role(auth.uid(), 'admin'))
  );

-- property_assignments ------------------------------------------------
drop policy if exists "Org members can view org assignments" on public.property_assignments;
create policy "Org members can view org assignments" on public.property_assignments for select to authenticated
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_assignments.property_id
        and p.organization_id = public.get_user_org_id(auth.uid())
    )
  );

drop policy if exists "Managers can manage org assignments" on public.property_assignments;
create policy "Managers can manage org assignments" on public.property_assignments for all to authenticated
  using (
    (public.has_role(auth.uid(), 'manager') or public.has_role(auth.uid(), 'admin'))
    and exists (
      select 1 from public.properties p
      where p.id = property_assignments.property_id
        and p.organization_id = public.get_user_org_id(auth.uid())
    )
  )
  with check (
    (public.has_role(auth.uid(), 'manager') or public.has_role(auth.uid(), 'admin'))
    and exists (
      select 1 from public.properties p
      where p.id = property_assignments.property_id
        and p.organization_id = public.get_user_org_id(auth.uid())
    )
  );

-- showings ------------------------------------------------------------
drop policy if exists "Org members can view org showings" on public.showings;
create policy "Org members can view org showings" on public.showings for select to authenticated
  using (organization_id = public.get_user_org_id(auth.uid()));

drop policy if exists "Managers or self can insert showings" on public.showings;
create policy "Managers or self can insert showings" on public.showings for insert to authenticated
  with check (
    exists (
      select 1 from public.properties p
      where p.id = showings.property_id
        and p.organization_id = public.get_user_org_id(auth.uid())
    )
    and (
      public.has_role(auth.uid(), 'manager')
      or public.has_role(auth.uid(), 'admin')
      or agent_id = auth.uid()
    )
  );

drop policy if exists "Managers or self can update showings" on public.showings;
create policy "Managers or self can update showings" on public.showings for update to authenticated
  using (
    organization_id = public.get_user_org_id(auth.uid())
    and (
      public.has_role(auth.uid(), 'manager')
      or public.has_role(auth.uid(), 'admin')
      or agent_id = auth.uid()
    )
  );

drop policy if exists "Managers can delete showings" on public.showings;
create policy "Managers can delete showings" on public.showings for delete to authenticated
  using (
    organization_id = public.get_user_org_id(auth.uid())
    and (public.has_role(auth.uid(), 'manager') or public.has_role(auth.uid(), 'admin'))
  );

-- ---------------------------------------------------------------------
-- 11. Realtime
-- ---------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.showings;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 12. start_showing_session()
-- ---------------------------------------------------------------------
-- Creating the session server-side makes two whole classes of bug
-- structurally impossible rather than relying on every client remembering
-- four fields: a session can no longer be created without its organization_id
-- (which the geofence trigger needs, see above) or without the geofence
-- copied from the property.
create or replace function public.start_showing_session(_showing_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  sh record;
  prop record;
  new_session_id uuid;
begin
  select * into sh from public.showings where id = _showing_id;
  if not found then
    raise exception 'showing not found';
  end if;

  select * into prop from public.properties where id = sh.property_id;
  if not found then
    raise exception 'property not found';
  end if;

  if not (
    sh.agent_id = auth.uid()
    or (
      sh.organization_id = public.get_user_org_id(auth.uid())
      and (public.has_role(auth.uid(), 'manager') or public.has_role(auth.uid(), 'admin'))
    )
  ) then
    raise exception 'not authorised to start this showing';
  end if;

  insert into public.professional_sessions (
    user_id, organization_id, client_name, address, notes,
    expected_end_time, status, activity_type, property_id,
    geofence_lat, geofence_lng, geofence_radius_m
  ) values (
    coalesce(sh.agent_id, auth.uid()),
    sh.organization_id,
    nullif(sh.buyer_name, ''),
    trim(both ' ' from concat_ws(', ',
      nullif(prop.address_line1, ''), nullif(prop.city, ''), nullif(prop.state, ''))),
    sh.notes,
    greatest(sh.scheduled_end, now() + interval '5 minutes'),
    'active',
    sh.activity_type,
    prop.id,
    prop.lat,
    prop.lng,
    coalesce(prop.geofence_radius_m, 150)
  )
  returning id into new_session_id;

  update public.showings
    set session_id = new_session_id,
        status = 'in_progress',
        actual_start = now()
    where id = _showing_id;

  return new_session_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 13. start_adhoc_showing_session()
-- ---------------------------------------------------------------------
-- Walk-in / unscheduled showings. Without this they would never reach the
-- seller's record, and the public page would silently under-report — which
-- would undermine the one promise it makes.
create or replace function public.start_adhoc_showing_session(
  _property_id uuid,
  _activity_type public.session_activity default 'showing',
  _client_name text default '',
  _duration_min int default 45
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  prop record;
  new_showing_id uuid;
begin
  select * into prop from public.properties where id = _property_id;
  if not found then
    raise exception 'property not found';
  end if;

  if prop.organization_id is distinct from public.get_user_org_id(auth.uid()) then
    raise exception 'not authorised for this property';
  end if;

  insert into public.showings (
    property_id, agent_id, scheduled_start, scheduled_end,
    status, activity_type, buyer_name, created_by
  ) values (
    _property_id,
    auth.uid(),
    now(),
    now() + make_interval(mins => greatest(_duration_min, 5)),
    'scheduled',
    _activity_type,
    coalesce(_client_name, ''),
    auth.uid()
  )
  returning id into new_showing_id;

  return public.start_showing_session(new_showing_id);
end;
$$;

-- ---------------------------------------------------------------------
-- 14. get_property_showing_record() — the public seller-facing record
-- ---------------------------------------------------------------------
-- SECURITY: this function is the ENTIRE access-control surface for the
-- seller link. It deliberately does NOT follow the pattern used by
-- walk_sessions / org_invitations / circle_invitations, which grant
-- `for select using (true)` to anon and treat the token as a secret only in
-- the client's WHERE clause — meaning anyone holding the anon key can select
-- every row of those tables. Copying that here would expose every property,
-- seller name and email, lockbox code in access_notes, and buyer name.
--
-- properties / showings / property_assignments grant anon NOTHING. This
-- function is the only way out, and it hand-picks columns.
--
-- Returns NULL identically for a bad token, a disabled share, and an expired
-- share, so it leaks nothing about which properties exist.
--
-- NEVER add to the payload: anything from user_locations (live or historical
-- GPS, fuzzed or not), agent user_id / phone / email, access_notes, internal
-- notes, buyer_name, list_price, or anything from incidents / duress state.
create or replace function public.get_property_showing_record(_token uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  prop record;
  result jsonb;
begin
  select p.id, p.address_line1, p.city, p.state, p.postal_code, p.image_url,
         p.organization_id, p.share_enabled, p.share_expires_at, p.share_include_upcoming
    into prop
  from public.properties p
  where p.share_token = _token;

  if not found
     or not prop.share_enabled
     or (prop.share_expires_at is not null and prop.share_expires_at < now())
  then
    return null;
  end if;

  select jsonb_build_object(
    'property', jsonb_build_object(
      'address', prop.address_line1,
      'city', prop.city,
      'state', prop.state,
      'postal_code', prop.postal_code,
      'image_url', prop.image_url
    ),
    'brokerage', (
      select jsonb_build_object(
        'name', o.name, 'logo_url', o.logo_url,
        'phone', o.phone, 'website', o.website
      )
      from public.organizations o where o.id = prop.organization_id
    ),
    'showings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'scheduled_start', s.scheduled_start,
        'actual_start', s.actual_start,
        'actual_end', s.actual_end,
        'duration_min', case
          when s.actual_start is not null and s.actual_end is not null
          then round(extract(epoch from (s.actual_end - s.actual_start)) / 60)::int
        end,
        'status', s.status,
        'verified_at', s.verified_at,
        'agent_name', s.agent_display_name,
        'agent_brokerage', nullif(s.buyer_agent_brokerage, ''),
        'feedback', nullif(s.feedback, '')
      ) order by s.scheduled_start desc)
      from public.showings s
      where s.property_id = prop.id
        and (
          s.status in ('completed', 'no_show', 'in_progress')
          or (prop.share_include_upcoming and s.status in ('scheduled', 'confirmed'))
        )
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_property_showing_record(uuid) from public;
grant execute on function public.get_property_showing_record(uuid) to anon, authenticated;



-- =====================================================================
-- ORG SELF-SERVE (mirrors supabase/migrations/0002_org_self_serve.sql)
-- =====================================================================
-- Kept in sync with that migration by hand — edit both in the same commit.
-- See that file for the full reasoning: why this is an RPC rather than an
-- INSERT policy, and why the profiles UPDATE grant had to be narrowed.


-- ---------------------------------------------------------------------
-- 1. create_organization()
-- ---------------------------------------------------------------------
create or replace function public.create_organization(_name text, _job_title text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _clean_name text := btrim(coalesce(_name, ''));
  _existing uuid;
  _org_id uuid;
begin
  if _uid is null then
    raise exception 'Not signed in';
  end if;

  if length(_clean_name) < 2 then
    raise exception 'Organisation name must be at least 2 characters';
  end if;

  -- One org per user: get_user_org_id() returns a single uuid, and the whole
  -- RLS model is built on that. Fail loudly rather than silently moving
  -- someone out of a brokerage they are already in.
  select organization_id into _existing from public.profiles where user_id = _uid;
  if _existing is not null then
    raise exception 'You already belong to an organisation';
  end if;

  insert into public.organizations (name, subscription_tier)
  values (_clean_name, 'free')
  returning id into _org_id;

  update public.profiles
    set organization_id = _org_id,
        job_title = coalesce(nullif(btrim(_job_title), ''), job_title)
    where user_id = _uid;

  -- Both roles, matching bootstrap_org.sql. Several policies check 'manager'
  -- specifically while others check 'admin', so the creator needs both to
  -- exercise the whole console.
  insert into public.user_roles (user_id, role) values (_uid, 'admin')
    on conflict (user_id, role) do nothing;
  insert into public.user_roles (user_id, role) values (_uid, 'manager')
    on conflict (user_id, role) do nothing;

  return _org_id;
end;
$$;

revoke all on function public.create_organization(text, text) from public;
grant execute on function public.create_organization(text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 2. Make profiles.organization_id non-writable by clients
-- ---------------------------------------------------------------------
-- Load-bearing. Do not "restore" the table-level grant: it is what allowed a
-- client to move itself into another brokerage and read its lockbox codes.
-- The only profile UPDATE in the app writes full_name/job_title/
-- job_description/phone (see TeamMemberView), all of which stay granted.
-- Membership changes go through create_organization() and the invitation
-- flow, both security definer, which run as owner and are unaffected.
revoke update on public.profiles from authenticated;
revoke update on public.profiles from anon;

grant update (
  full_name,
  avatar_url,
  safe_word,
  duress_pin_hash,
  job_title,
  job_description,
  phone,
  updated_at
) on public.profiles to authenticated;



-- =====================================================================
-- PROFILE BACKFILL + SAFE create_organization()
-- (mirrors supabase/migrations/0003_backfill_profiles.sql)
-- =====================================================================
-- Supersedes the create_organization() defined above. See that migration for
-- why: the original only UPDATEd public.profiles, so an account with no
-- profile row got an organisation it was never attached to, with no error.


-- ---------------------------------------------------------------------
-- 1. Backfill
-- ---------------------------------------------------------------------
insert into public.profiles (user_id, full_name)
select u.id, coalesce(u.raw_user_meta_data ->> 'full_name', '')
from auth.users u
where not exists (select 1 from public.profiles p where p.user_id = u.id);

-- Everyone should hold at least the base role, same as handle_new_user_role().
insert into public.user_roles (user_id, role)
select u.id, 'user'
from auth.users u
where not exists (select 1 from public.user_roles r where r.user_id = u.id)
on conflict (user_id, role) do nothing;

-- ---------------------------------------------------------------------
-- 2 + 3. create_organization(), no longer assuming the profile exists
-- ---------------------------------------------------------------------
create or replace function public.create_organization(_name text, _job_title text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _clean_name text := btrim(coalesce(_name, ''));
  _existing uuid;
  _org_id uuid;
  _rows int;
begin
  if _uid is null then
    raise exception 'Not signed in';
  end if;

  if length(_clean_name) < 2 then
    raise exception 'Organisation name must be at least 2 characters';
  end if;

  -- One org per user: get_user_org_id() returns a single uuid and the whole
  -- RLS model is built on that. Fail loudly rather than silently moving
  -- someone out of a brokerage they already belong to.
  select organization_id into _existing from public.profiles where user_id = _uid;
  if _existing is not null then
    raise exception 'You already belong to an organisation';
  end if;

  insert into public.organizations (name, subscription_tier)
  values (_clean_name, 'free')
  returning id into _org_id;

  -- Insert-or-update. The previous version only updated, so an account whose
  -- profile predated the handle_new_user() trigger got an organisation it was
  -- never actually attached to.
  insert into public.profiles (user_id, organization_id, job_title)
  values (_uid, _org_id, coalesce(nullif(btrim(_job_title), ''), ''))
  on conflict (user_id) do update
    set organization_id = excluded.organization_id,
        job_title = coalesce(nullif(excluded.job_title, ''), public.profiles.job_title);

  -- Belt and braces: if the write somehow still matched nothing, abort the
  -- whole transaction rather than hand back an org id that leads nowhere.
  select count(*) into _rows
  from public.profiles
  where user_id = _uid and organization_id = _org_id;

  if _rows = 0 then
    raise exception 'Failed to attach profile to the new organisation';
  end if;

  insert into public.user_roles (user_id, role) values (_uid, 'admin')
    on conflict (user_id, role) do nothing;
  insert into public.user_roles (user_id, role) values (_uid, 'manager')
    on conflict (user_id, role) do nothing;

  return _org_id;
end;
$$;

revoke all on function public.create_organization(text, text) from public;
grant execute on function public.create_organization(text, text) to authenticated;



-- =====================================================================
-- INVITE ACCEPT (mirrors supabase/migrations/0004_invite_accept.sql)
-- =====================================================================
-- Also DROPS the "Anyone can read invitation by token" policy created above:
-- it was for select using (true) with no TO clause, so anon could enumerate
-- every invitee email, role, org id and token. Both readers now go through
-- the security-definer functions below.


-- ---------------------------------------------------------------------
-- 1. get_invitation_preview() — safe to call signed out
-- ---------------------------------------------------------------------
-- Deliberately returns a MASKED email. The page needs to show who the invite
-- is for so a signed-in user can tell whether they are the right person, but
-- a token in a forwarded message should not disclose a full address.
-- Returns null for unknown, expired and already-accepted tokens alike, so it
-- cannot be used to probe which tokens exist.
create or replace function public.get_invitation_preview(_token uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  inv record;
  masked text;
begin
  select i.email, i.role, i.organization_id, i.status, i.expires_at
    into inv
  from public.org_invitations i
  where i.token = _token;

  if not found or inv.status <> 'pending' or inv.expires_at < now() then
    return null;
  end if;

  -- a***@example.com
  masked := left(inv.email, 1) || '***' || substring(inv.email from position('@' in inv.email));

  return jsonb_build_object(
    'organization_name', (select o.name from public.organizations o where o.id = inv.organization_id),
    'email_masked', masked,
    'role', inv.role
  );
end;
$$;

revoke all on function public.get_invitation_preview(uuid) from public;
grant execute on function public.get_invitation_preview(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. accept_org_invitation()
-- ---------------------------------------------------------------------
create or replace function public.accept_org_invitation(_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  inv record;
  _rows int;
begin
  if _uid is null then
    raise exception 'Not signed in';
  end if;

  select * into inv from public.org_invitations where token = _token;

  if not found then
    raise exception 'That invitation link is not valid';
  end if;
  if inv.status <> 'pending' then
    raise exception 'That invitation has already been used';
  end if;
  if inv.expires_at < now() then
    raise exception 'That invitation has expired';
  end if;

  -- The token alone must not be enough. Invite links get forwarded, pasted
  -- into group chats and logged by mail scanners; without this check anyone
  -- holding the string could join the brokerage.
  if lower(inv.email) <> _email then
    raise exception 'This invitation was sent to a different email address';
  end if;

  -- Insert-or-update: an account created before handle_new_user() existed has
  -- no profiles row, and a plain UPDATE would match nothing and report success
  -- (see 0003 for the same bug in create_organization).
  insert into public.profiles (user_id, organization_id)
  values (_uid, inv.organization_id)
  on conflict (user_id) do update
    set organization_id = excluded.organization_id;

  select count(*) into _rows
  from public.profiles
  where user_id = _uid and organization_id = inv.organization_id;

  if _rows = 0 then
    raise exception 'Failed to join the organisation';
  end if;

  insert into public.user_roles (user_id, role) values (_uid, inv.role)
    on conflict (user_id, role) do nothing;
  insert into public.user_roles (user_id, role) values (_uid, 'user')
    on conflict (user_id, role) do nothing;

  update public.org_invitations set status = 'accepted' where token = _token;

  return jsonb_build_object(
    'organization_id', inv.organization_id,
    'organization_name', (select o.name from public.organizations o where o.id = inv.organization_id),
    'role', inv.role
  );
end;
$$;

revoke all on function public.accept_org_invitation(uuid) from public;
grant execute on function public.accept_org_invitation(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 3. Drop the blanket public read
-- ---------------------------------------------------------------------
-- Everything that needed it now goes through the two functions above.
-- Managers keep their own org-scoped SELECT policy (schema.sql), so the
-- Invitations console view is unaffected.
drop policy if exists "Anyone can read invitation by token" on public.org_invitations;

