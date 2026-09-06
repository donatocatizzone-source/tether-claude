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
    select id, organization_id, geofence_lat, geofence_lng, geofence_radius_m
    from public.professional_sessions
    where user_id = new.user_id
      and status = 'active'
      and geofence_lat is not null
      and geofence_lng is not null
  loop
    dist_m := 6371000 * 2 * asin(sqrt(
      power(sin(radians(new.lat - sess.geofence_lat) / 2), 2) +
      cos(radians(sess.geofence_lat)) * cos(radians(new.lat)) *
      power(sin(radians(new.lng - sess.geofence_lng) / 2), 2)
    ));

    if dist_m > sess.geofence_radius_m then
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
