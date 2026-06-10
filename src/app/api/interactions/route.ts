import { type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const MOCK_USER_ID = "00000000-0000-0000-0000-000000000000";

export async function POST(request: NextRequest) {
  try {
    const { listing_id, kind } = await request.json();

    if (!listing_id || (kind !== "view" && kind !== "save")) {
      return Response.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // If anonymous, allow views under mock user ID.
    // Saves still require authentication.
    if (!user && kind === "save") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const targetUserId = user ? user.id : MOCK_USER_ID;

    // Always use service role client to bypass RLS missing policies on interactions
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Upsert or insert the interaction
    // The DB trigger will automatically update popularity_score
    const { error } = await client
      .from("interactions")
      .insert({
        user_id: targetUserId,
        listing_id,
        kind,
      });

    // We can ignore duplicate key errors (e.g. unique constraint hits)
    if (error && error.code !== '23505') {
      console.error("[interactions] Error logging interaction:", error);
      return Response.json({ error: "Failed to log interaction" }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("[interactions] Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { listing_id, kind } = await request.json();

    if (!listing_id || (kind !== "view" && kind !== "save")) {
      return Response.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user && kind === "save") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const targetUserId = user ? user.id : MOCK_USER_ID;

    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await client
      .from("interactions")
      .delete()
      .eq("listing_id", listing_id)
      .eq("user_id", targetUserId)
      .eq("kind", kind);

    if (error) {
      console.error("[interactions] Error removing interaction:", error);
      return Response.json({ error: "Failed to remove interaction" }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("[interactions] Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

