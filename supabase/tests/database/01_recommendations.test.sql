BEGIN;

-- Plan the tests
SELECT plan(1);

-- Test 1: Check if the recommendation RPC exists and has the correct signature
SELECT has_function(
  'public', 
  'recommend_listings_for_user', 
  ARRAY['uuid', 'double precision', 'integer', 'double precision', 'uuid'], 
  'Function recommend_listings_for_user should exist to power the discovery feed'
);

-- Note: We can add further tests here by creating mock users and mock listings 
-- with dummy pgvector embeddings to test the similarity match output.

-- Finish the tests and clean up
SELECT * FROM finish();

ROLLBACK;
