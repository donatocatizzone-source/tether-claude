-- =====================================================================
-- bootstrap_org.sql — one-time: give yourself an organization + manager role
-- =====================================================================
--
-- NOT part of the schema. Run once, by hand, in the Supabase SQL Editor.
--
-- Why this is needed: every org-scoped RLS policy resolves through
-- get_user_org_id(auth.uid()), which reads profiles.organization_id. A fresh
-- signup gets organization_id = NULL and only the 'user' role, so without
-- this you would pass auth, reach /business/admin, and then see empty screens
-- with no error — RLS would be filtering every row out. There is also no
-- INSERT policy on `organizations`, so the client genuinely cannot create one;
-- it has to happen here.
--
-- Change the email below if you want to bootstrap a different account.

do $$
declare
  _email text := 'donato.catizzone@gmail.com';
  _org_name text := 'Tether Realty';
  _uid uuid;
  _org_id uuid;
begin
  select id into _uid from auth.users where email = _email;
  if _uid is null then
    raise exception 'No auth user with email %. Sign up first.', _email;
  end if;

  -- Reuse the org if this has already been run.
  select organization_id into _org_id from public.profiles where user_id = _uid;

  if _org_id is null then
    insert into public.organizations (name, subscription_tier)
    values (_org_name, 'brokerage')
    returning id into _org_id;
  end if;

  -- Insert-or-update, not update. handle_new_user() only started creating
  -- profiles when schema.sql was first applied, so an account that signed up
  -- before that has no row — and a plain UPDATE would match nothing, raise
  -- nothing, and let this script print "Bootstrapped..." having done nothing.
  insert into public.profiles (user_id, organization_id, job_title)
  values (_uid, _org_id, 'Managing Broker')
  on conflict (user_id) do update
    set organization_id = excluded.organization_id,
        job_title = coalesce(nullif(public.profiles.job_title, ''), 'Managing Broker');

  if not exists (
    select 1 from public.profiles where user_id = _uid and organization_id = _org_id
  ) then
    raise exception 'Failed to attach profile to org % — aborting', _org_id;
  end if;

  -- user_roles is (user_id, role) unique, so a user can hold several.
  insert into public.user_roles (user_id, role) values (_uid, 'manager')
    on conflict (user_id, role) do nothing;
  insert into public.user_roles (user_id, role) values (_uid, 'admin')
    on conflict (user_id, role) do nothing;

  raise notice 'Bootstrapped % into org % (%)', _email, _org_name, _org_id;
end $$;

-- Verify:
select p.full_name, p.organization_id, o.name as org, array_agg(ur.role) as roles
from public.profiles p
left join public.organizations o on o.id = p.organization_id
left join public.user_roles ur on ur.user_id = p.user_id
where p.user_id = (select id from auth.users where email = 'donato.catizzone@gmail.com')
group by p.full_name, p.organization_id, o.name;
