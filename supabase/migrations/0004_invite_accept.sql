-- =====================================================================
-- 0004_invite_accept.sql — redeemable org invitations, and closing the
--                          blanket public read on org_invitations
-- =====================================================================
--
-- TWO PROBLEMS.
--
-- 1. Invitations could be created but never redeemed by anyone who already had
--    an account. handle_invitation_on_signup() is an `after insert on
--    auth.users` trigger, so it fires exactly once, at signup, matching on
--    email. Invite an existing user and nothing happens — they would have to
--    delete their account and sign up again. Since accounts now exist before
--    invitations are sent, that is the common case, not the edge case.
--
-- 2. `"Anyone can read invitation by token"` is
--    `for select using (true)` with no TO clause, so it applies to PUBLIC —
--    including `anon`. The token was only ever a secret in the client's WHERE
--    clause; nothing stopped `select *`. Any holder of the anon key could
--    enumerate every invitee email, their role, the organisation id, and the
--    token itself. Those organisation ids are also what made the
--    profiles.organization_id escalation (fixed in 0002) exploitable.
--
-- THE FIX for both: two security-definer functions that take the token and
-- return only what the caller needs, then drop the blanket policy. Same shape
-- as get_property_showing_record() and accept_circle_invite(), which this
-- schema already relies on.

begin;

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

commit;
