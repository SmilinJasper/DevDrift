-- Seed Data for DevDrift

-- 1. Insert Mock User into auth.users (This triggers profile creation)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'demo@devdrift.com',
    '$2a$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm',
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"username":"demo_user","full_name":"Demo User"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    '{"sub":"00000000-0000-0000-0000-000000000000","email":"demo@devdrift.com"}'::jsonb,
    'email',
    now(),
    now(),
    now()
) ON CONFLICT (provider_id, provider) DO NOTHING;

-- 2. Update the auto-generated profile with extra metadata
UPDATE public.profiles
SET 
    bio = 'Just testing out DevDrift!',
    interests = ARRAY['react', 'nextjs', 'typescript', 'frontend'],
    location = 'San Francisco, CA'
WHERE id = '00000000-0000-0000-0000-000000000000';

-- 3. Insert Mock Listings
INSERT INTO public.listings (title, description, type, tags, location, is_remote, starts_at, ends_at, application_url, popularity_score, is_published, created_by)
VALUES 
    (
        'Global AI Hackathon 2026',
        'Build the next generation of AI agents using open-source models. $50k prize pool.',
        'hackathon',
        ARRAY['ai', 'machine learning', 'python', 'llm'],
        'San Francisco, CA',
        true,
        '2026-07-01 00:00:00+00',
        '2026-07-03 00:00:00+00',
        'https://devpost.com/global-ai-hackathon',
        95.5,
        true,
        '00000000-0000-0000-0000-000000000000'
    ),
    (
        'Frontend Developer at Vercel',
        'Join the team building Next.js and the Vercel dashboard. Focus on React and TypeScript.',
        'job',
        ARRAY['react', 'nextjs', 'typescript', 'frontend'],
        'Remote',
        true,
        NULL,
        NULL,
        'https://vercel.com/careers',
        98.2,
        true,
        '00000000-0000-0000-0000-000000000000'
    ),
    (
        'Software Engineering Intern - Supabase',
        'Summer 2026 internship working on the open-source Firebase alternative.',
        'internship',
        ARRAY['postgres', 'typescript', 'backend', 'open-source'],
        'Singapore',
        true,
        '2026-06-01 00:00:00+00',
        '2026-08-31 00:00:00+00',
        'https://supabase.com/careers',
        88.0,
        true,
        '00000000-0000-0000-0000-000000000000'
    ),
    (
        'Web3 Builders Hackathon India',
        'The largest blockchain hackathon in India. Build dApps, DeFi protocols, and more.',
        'hackathon',
        ARRAY['web3', 'solidity', 'blockchain', 'ethereum'],
        'Bengaluru, India',
        false,
        '2026-08-15 00:00:00+00',
        '2026-08-17 00:00:00+00',
        'https://ethindia.co',
        91.3,
        true,
        '00000000-0000-0000-0000-000000000000'
    ),
    (
        'Backend Engineer - Stripe',
        'Build financial infrastructure for the internet using Ruby and Go.',
        'job',
        ARRAY['ruby', 'go', 'backend', 'api'],
        'Seattle, WA',
        false,
        NULL,
        NULL,
        'https://stripe.com/jobs',
        94.1,
        true,
        '00000000-0000-0000-0000-000000000000'
    ),
    (
        'React Native Mobile Intern',
        'Help us build our new mobile application from the ground up.',
        'internship',
        ARRAY['react-native', 'mobile', 'ios', 'android'],
        'London, UK',
        true,
        '2026-07-01 00:00:00+00',
        '2026-09-30 00:00:00+00',
        'https://careers.mobile-app.com',
        76.5,
        true,
        '00000000-0000-0000-0000-000000000000'
    );
