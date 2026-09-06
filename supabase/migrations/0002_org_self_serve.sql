-- =====================================================================
-- 0002_org_self_serve.sql — create a brokerage from inside the app,
--                           and stop clients rewriting their own org
-- =====================================================================
--
-- Two things, both about organisation membership.
--
-- 1. THE LOCKOUT. There was no way to obtain an organisation from inside the
--    product. `organizations` has SELECT and UPDATE policies but no INSERT;
--    `user_roles`' only INSERT path requires you to already be an admin of the
--    org you are joining; and handle_invitation_on_signup() is an
--    `after insert on auth.users` trigger, so it never fires for someone who
--    already has an account. The only route in was the hand-run
--    bootstrap_org.sql. Since the workspace gates now derive from real profile
--    data, that left every new signup permanently confined to the consumer app.
--
--    Fixed with a security-definer RPC rather than an INSERT policy, because
--    policies cannot express the other two writes safely:
--      - `user_roles`: a self-insert policy permissive enough to break the
--        chicken-and-egg would let ANY user grant themselves 'admin', which
--        ~12 org-wide policies trust.
--      - atomicity: three tables, one operation. A partial failure leaves a
--        user pointing at an org where they hold no role — exactly the
--        silently-empty-console state bootstrap_org.sql exists to prevent.
--    Same shape as has_role(), get_user_org_id(), accept_circle_invite() and
--    start_showing_session(), which this schema already relies on.
--
-- 2. A PRIVILEGE ESCALATION. "Users can update own profile" is
--    `for update using (auth.uid() = user_id)` with no `with check` and no
--    column restriction, so any authenticated user could set their own
--    profiles.organization_id to any other organisation's id. Org ids are not
--    secret — org_invitations carries one per row and has a
--    `for select using (true)` policy with no TO clause, so anon can read
--    them. get_user_org_id() would then return the hijacked org and every
--    org-scoped SELECT policy opens up, including properties.access_notes:
--    lockbox and alarm codes, which 0001_realestate.sql documents as never
--    public.
--
--    NOTE ON THE FIX: `revoke update (organization_id)` on its own would be a
--    NO-OP here. Postgres treats a table-level UPDATE grant as covering every
--    column, and Supabase grants table-level UPDATE to `authenticated`. The
--    table-level grant has to be revoked and replaced with an explicit
--    column list.

begin;

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

commit;
