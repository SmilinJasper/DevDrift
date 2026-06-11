BEGIN;
select plan(4);

-- 1. Create mock users
insert into auth.users (id, aud, role, email)
values
  ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'user1@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'user2@example.com');

-- (Profiles are auto-created by the handle_new_user trigger)

-- 2. Create a mock listing
insert into public.listings (id, title, description, type, created_by)
values
  ('33333333-3333-3333-3333-333333333333', 'Test Listing', 'Desc', 'job', '11111111-1111-1111-1111-111111111111');

-- 3. Act as User 1 and save the listing
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

insert into public.interactions (user_id, listing_id, kind)
values ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'save');

-- Test 1: User 1 can see their own saved listing
select results_eq(
  'select user_id from public.interactions where kind = ''save''',
  ARRAY['11111111-1111-1111-1111-111111111111'::uuid],
  'User 1 should see their own saved listing'
);

-- Test 2: User 1 cannot save a listing for User 2 (due to WITH CHECK auth.uid() = user_id)
select throws_ok(
  $$insert into public.interactions (user_id, listing_id, kind) values ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'save')$$,
  'new row violates row-level security policy for table "interactions"',
  'User 1 cannot insert a saved listing for User 2'
);

-- 4. Act as User 2
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

-- Test 3: User 2 cannot see User 1's saved listing
select is_empty(
  'select * from public.interactions where kind = ''save''',
  'User 2 should not be able to read User 1''s saved listing'
);

-- Test 4: User 2 cannot delete User 1's saved listing
delete from public.interactions where listing_id = '33333333-3333-3333-3333-333333333333' and kind = 'save';

set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select results_eq(
  'select count(*)::int from public.interactions where kind = ''save''',
  ARRAY[1],
  'User 1''s saved listing should still exist after User 2 attempted to delete it'
);

select * from finish();
ROLLBACK;
