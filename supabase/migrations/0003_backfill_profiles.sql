-- =====================================================================
-- 0003_backfill_profiles.sql — repair accounts with no profiles row,
--                              and stop org creation failing silently
-- =====================================================================
--
-- THE CAUSE. handle_new_user() creates a public.profiles row from a trigger on
-- auth.users. That trigger only came into existence when schema.sql was first
-- applied (2026-09-06). Anyone who signed up BEFORE that has an auth.users row
-- and no profile — the trigger wasn't there to fire.
--
-- THE SYMPTOM, and why it was so hard to see. Both create_organization() and
-- bootstrap_org.sql did:
--
--     update public.profiles set organization_id = ... where user_id = _uid;
--
-- With no row to match, that updates ZERO rows and raises nothing. Both then
-- reported success. The app said "brokerage created", the script printed
-- "Bootstrapped...", and the user stayed locked out of both consoles with no
-- error anywhere to explain it. An UPDATE that matches nothing is not an
-- error in SQL, which is exactly what made this invisible.
--
-- THE FIX, in three parts:
--   1. backfill the missing profiles rows
--   2. make create_organization() insert-or-update instead of assuming a row
--   3. have it verify it actually wrote, so this can never fail quietly again

begin;

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

commit;

-- Verify: every auth user should now have exactly one profile.
select u.email,
       p.id is not null as has_profile,
       p.organization_id,
       (select count(*) from public.user_roles r where r.user_id = u.id) as role_count
from auth.users u
left join public.profiles p on p.user_id = u.id
order by u.created_at;
