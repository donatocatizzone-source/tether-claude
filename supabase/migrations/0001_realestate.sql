-- =====================================================================
-- 0001_realestate.sql — real-estate B2B: properties, assignments, showings
-- =====================================================================
--
-- Phase 1 of refocusing the B2B side on realtors + brokerages.
--
-- This is the first file in supabase/migrations/. Until now the repo carried
-- only supabase/schema.sql, a "run this against a fresh project" snapshot —
-- but the project is already live and populated, so re-running it is not an
-- option. Going forward: schema.sql stays the consolidated snapshot, and each
-- ordered delta lands here too. Edit both in the same commit, never one alone.
--
-- Written to be idempotent and additive: safe to re-run, and it never drops
-- or rewrites existing data.
--
-- Design note — why `showings` is its own table rather than a new status on
-- professional_sessions:
--   * OverwatchAnalytics counts professional_sessions with no status filter,
--     so scheduled-but-not-started rows would silently inflate "Total Sessions".
--   * RLS on professional_sessions is `auth.uid() = user_id`, so a coordinator
--     could not schedule *for* an agent without widening write access to the
--     table that carries duress state.
--   * A no-show is a showing with NO session. Modelling it as a session that
--     never started makes "session" meaningless.
-- So: showings = intent (the calendar + the seller-facing record),
--     professional_sessions = execution (was the agent there, were they safe).

begin;

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
-- 8. check_geofence_breach() — arm on arrival, and stamp verified_at
-- ---------------------------------------------------------------------
-- Two fixes to the original, both load-bearing:
--
--   (a) The original alerted on ANY out-of-radius reading. Nothing armed a
--       geofence from the field UI, so it never fired. The moment sessions
--       start copying a geofence from the property, every agent tapping
--       "Start" from their car would generate an incident instantly. Breach
--       alerts now require geofence_armed_at — i.e. the agent has actually
--       arrived at least once. Leaving mid-showing still alerts, which is
--       what the geofence was always meant to catch.
--
--   (b) Sessions with status 'extended' are still live and must stay
--       monitored; the original watched only 'active'.
--
-- Arriving inside the radius also stamps showings.verified_at, which is the
-- claim backing the "Verified on site" badge on the seller-facing record.
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
      -- Arrived. Arm the fence and record GPS-verified presence.
      if sess.geofence_armed_at is null then
        update public.professional_sessions
          set geofence_armed_at = now()
          where id = sess.id;
      end if;

      update public.showings
        set verified_at = now()
        where session_id = sess.id and verified_at is null;

    elsif sess.geofence_armed_at is not null then
      -- Left the property after having arrived. Dedupe to 1 per 5 min.
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

commit;
