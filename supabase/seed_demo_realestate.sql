-- =====================================================================
-- seed_demo_realestate.sql — OPTIONAL demo data for the agent view
-- =====================================================================
--
-- Not part of the schema. Run by hand in the Supabase SQL Editor when you
-- want /business/member to show a real schedule and real assigned properties
-- instead of its (correct, but empty) empty states.
--
-- Requires bootstrap_org.sql to have been run first — it needs an account
-- with an organization_id.
--
-- Safe to re-run: it clears its own previously-seeded rows first, matched on
-- the mls_number prefix 'DEMO-'. It never touches rows it didn't create.

do $$
declare
  _email text := 'donato.catizzone@gmail.com';
  _uid uuid;
  _org uuid;
  _name text;
  _p1 uuid; _p2 uuid; _p3 uuid;
  _today date := (now() at time zone 'America/Chicago')::date;
begin
  select id into _uid from auth.users where email = _email;
  if _uid is null then
    raise exception 'No auth user with email %.', _email;
  end if;

  select organization_id, coalesce(nullif(full_name, ''), 'Agent')
    into _org, _name
  from public.profiles where user_id = _uid;

  if _org is null then
    raise exception 'Profile for % has no organization_id — run bootstrap_org.sql first.', _email;
  end if;

  -- Clear only previously seeded demo rows (showings/assignments cascade).
  delete from public.properties
    where organization_id = _org and mls_number like 'DEMO-%';

  insert into public.properties
    (organization_id, address_line1, city, state, postal_code, lat, lng,
     beds, baths, sqft, list_price, mls_number, image_url, status,
     seller_name, seller_email, access_notes, created_by)
  values
    (_org, '123 Maple Street', 'Austin', 'TX', '78701', 30.2711, -97.7437,
     3, 2, 1850, 625000, 'DEMO-1001',
     'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&h=300&fit=crop',
     'active', 'Marta Reyes', 'seller1@example.com', 'Lockbox 4417 — side gate', _uid)
    returning id into _p1;

  insert into public.properties
    (organization_id, address_line1, city, state, postal_code, lat, lng,
     beds, baths, sqft, list_price, mls_number, image_url, status,
     seller_name, seller_email, access_notes, created_by)
  values
    (_org, '456 Oak Avenue', 'Austin', 'TX', '78704', 30.2500, -97.7594,
     4, 3, 2400, 890000, 'DEMO-1002',
     'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&h=300&fit=crop',
     'active', 'Devin Cole', 'seller2@example.com', 'Alarm code 2280', _uid)
    returning id into _p2;

  insert into public.properties
    (organization_id, address_line1, city, state, postal_code, lat, lng,
     beds, baths, sqft, list_price, mls_number, image_url, status,
     seller_name, seller_email, created_by)
  values
    (_org, '789 Cedar Lane', 'Austin', 'TX', '78745', 30.2180, -97.7920,
     2, 1, 1200, 410000, 'DEMO-1003',
     'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=300&fit=crop',
     'pending', 'Priya Nair', 'seller3@example.com', _uid)
    returning id into _p3;

  insert into public.property_assignments (property_id, user_id, role, assigned_by)
  values (_p1, _uid, 'listing_agent', _uid),
         (_p2, _uid, 'showing_agent', _uid),
         (_p3, _uid, 'showing_agent', _uid);

  -- Today's schedule. organization_id and agent_display_name are filled in by
  -- the set_showing_org() trigger, so they're deliberately omitted here.
  insert into public.showings
    (property_id, agent_id, scheduled_start, scheduled_end, status,
     activity_type, buyer_name, buyer_agent_brokerage, notes, created_by)
  values
    -- Already finished, GPS-verified: shows a completed row with a duration.
    (_p1, _uid, _today + time '09:30', _today + time '10:15', 'completed',
     'showing', 'The Alvarez family', 'Keller Williams', '', _uid),
    -- Later today: the row with a live "Start Showing" button.
    (_p2, _uid, _today + time '14:00', _today + time '14:45', 'confirmed',
     'showing', 'J. Whitfield', 'Compass', 'Buyer is bringing an inspector', _uid),
    (_p3, _uid, _today + time '16:30', _today + time '17:15', 'scheduled',
     'open_house', '', '', '', _uid);

  -- Give the completed one realistic actuals so duration/on-time/verified
  -- all render rather than showing dashes.
  update public.showings
    set actual_start = _today + time '09:34',
        actual_end   = _today + time '10:08',
        verified_at  = _today + time '09:36'
    where property_id = _p1 and agent_id = _uid and status = 'completed';

  raise notice 'Seeded 3 properties + 3 showings for % in org %', _email, _org;
end $$;

-- Enable the seller-facing share link on the first demo property and print
-- the URL to open. Sharing is off by default, so this is an explicit opt-in.
update public.properties
  set share_enabled = true
  where mls_number = 'DEMO-1001';

select 'http://localhost:8080/property/share/' || share_token as seller_link,
       address_line1, share_enabled
from public.properties
where mls_number = 'DEMO-1001';
