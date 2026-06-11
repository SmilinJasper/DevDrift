require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // We need the service_role key to bypass rate limits
);

async function seedUser() {
  console.log('Seeding user...');
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: 'demo@devdrift.com',
    password: 'password123',
    email_confirm: true,
    user_metadata: {
      username: 'demo_user',
      full_name: 'Demo User',
    }
  });

  if (error) {
    if (error.message.includes('already exists')) {
      console.log('User already exists, skipping admin creation.');
    } else {
      console.error('Error creating user via Admin API:', error);
    }
  } else {
    console.log('Successfully created user via Admin API:', data.user.id);
  }
}

seedUser();
