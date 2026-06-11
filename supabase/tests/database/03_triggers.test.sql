BEGIN;
select plan(2);

-- Test 1: The handle_new_user trigger correctly creates a profile when an auth.user is inserted
insert into auth.users (id, aud, role, email, raw_user_meta_data)
values (
  '99999999-9999-9999-9999-999999999999', 
  'authenticated', 
  'authenticated', 
  'trigger_test@example.com',
  '{"username": "trigger_bot", "full_name": "Trigger Bot"}'
);

select results_eq(
  $$select id from public.profiles where id = '99999999-9999-9999-9999-999999999999'$$,
  ARRAY['99999999-9999-9999-9999-999999999999'::uuid],
  'A profile should be created automatically for a new auth.user'
);

-- Test 2: The metadata is correctly mapped to the profile
select results_eq(
  $$select username from public.profiles where id = '99999999-9999-9999-9999-999999999999'$$,
  ARRAY['trigger_bot'::text],
  'The profile username should be populated from raw_user_meta_data'
);

select * from finish();
ROLLBACK;
