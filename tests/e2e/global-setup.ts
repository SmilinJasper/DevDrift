import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function globalSetup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase credentials for global setup');
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  console.log('Global Setup: Seeding E2E test user...');

  // Use Admin API to create user. This bypasses GoTrue rate limits!
  const { error } = await supabaseAdmin.auth.admin.createUser({
    email: 'e2e-tester@devdrift.com',
    password: 'password123',
    email_confirm: true,
    user_metadata: {
      username: 'e2e_tester',
      full_name: 'E2E Tester',
    }
  });

  if (error && !error.message.includes('already exists')) {
    console.error('Failed to create E2E user:', error);
    throw error;
  }
}

export default globalSetup;
