require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testLogin() {
  const { data, error } = await client.auth.signInWithPassword({
    email: 'demo@devdrift.com',
    password: 'password123',
  });
  console.log('Error:', error);
  console.log('Data:', data);
}
testLogin();
