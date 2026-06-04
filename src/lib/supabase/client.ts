import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client configured for browser-side usage
 * in Client Components.
 *
 * Uses the public anon key — all queries are subject to
 * Row Level Security policies on the Supabase side.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
