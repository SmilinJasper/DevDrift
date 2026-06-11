const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('http://127.0.0.1:54321', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IkRldkRyaWZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTgxMTUyMDAsImV4cCI6MjAyOTY3NTIwMH0.something'); // Using anon key from env or similar. Actually I'll read it from .env.local

require('dotenv').config({ path: '.env.local' });

const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testSignup() {
  const { data, error } = await client.auth.signUp({
    email: `test-${Date.now()}@devdrift.com`,
    password: 'password123',
  });
  console.log('Error:', error);
  console.log('Data:', data);
}
testSignup();
