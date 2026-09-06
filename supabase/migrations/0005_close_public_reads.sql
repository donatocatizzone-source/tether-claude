-- =====================================================================
-- 0005_close_public_reads.sql — remove the last two blanket public reads
-- =====================================================================
--
-- walk_sessions and circle_invitations both carry a `for select using (true)`
-- policy. The token was only ever a secret in the client's WHERE clause;
-- nothing stopped `select *`. With the anon key — which ships in the browser
-- bundle of every deployment — anyone could enumerate:
--
--   walk_sessions       every user's walk destination, their share token, and
--                       when they are expected home. For an app whose entire
--                       premise is "someone knows where I am", a list of who
--                       is walking home alone and where to is the single worst
--                       table to leak.
--   circle_invitations  every pending invite token, which accept_circle_invite()
--                       will redeem for whoever presents it.
--
-- They looked harmless because both tables are empty and both consuming pages
-- (/walk/share/:token, the Circle invite flow) are still ScreenStubs. That is
-- exactly why this is the moment to fix it: nothing has to be rewritten.
--
-- Same treatment as org_invitations in 0004 and properties in 0001 — a
-- security-definer function that takes the token and returns only what the
-- page needs, then drop the policy.

begin;

-- ---------------------------------------------------------------------
-- 1. walk_sessions
-- ---------------------------------------------------------------------
-- Deliberately does NOT return user_id or share_token. The recipient of a
-- Walk Home link needs to know where their friend is heading and whether they
-- have arrived; they do not need an id they could correlate across sessions.
create or replace function public.get_walk_share(_token uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  w record;
begin
  select ws.destination, ws.status, ws.started_at, ws.expected_end_at,
         ws.completed_at, ws.user_id
    into w
  from public.walk_sessions ws
  where ws.share_token = _token;

  if not found then
    return null;
  end if;

  -- A finished walk stops being a live location feed. Once completed, the
  -- link reports the outcome and nothing more.
  return jsonb_build_object(
    'destination', w.destination,
    'status', w.status,
    'started_at', w.started_at,
    'expected_end_at', w.expected_end_at,
    'completed_at', w.completed_at,
    'walker_name', coalesce(
      nullif((select p.full_name from public.profiles p where p.user_id = w.user_id), ''),
      'Your friend'
    )
  );
end;
$$;

revoke all on function public.get_walk_share(uuid) from public;
grant execute on function public.get_walk_share(uuid) to anon, authenticated;

drop policy if exists "Anyone can view walk session by share token" on public.walk_sessions;

-- ---------------------------------------------------------------------
-- 2. circle_invitations
-- ---------------------------------------------------------------------
-- Only who is inviting. accept_circle_invite() already does the redemption
-- and is already security definer, so nothing needs table-level read access.
create or replace function public.get_circle_invitation_preview(_token uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  inv record;
begin
  select ci.invited_by, ci.invited_name, ci.status
    into inv
  from public.circle_invitations ci
  where ci.token = _token;

  if not found or inv.status <> 'pending' then
    return null;
  end if;

  return jsonb_build_object(
    'inviter_name', coalesce(
      nullif((select p.full_name from public.profiles p where p.user_id = inv.invited_by), ''),
      'Someone'
    ),
    'invited_name', inv.invited_name
  );
end;
$$;

revoke all on function public.get_circle_invitation_preview(uuid) from public;
grant execute on function public.get_circle_invitation_preview(uuid) to anon, authenticated;

drop policy if exists "Anyone can read invitation by token" on public.circle_invitations;

commit;
