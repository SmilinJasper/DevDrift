import { createSupabaseBrowserClient } from "./client";

/**
 * Inserts a save interaction for a listing optimistically.
 */
export async function saveListingOptimistic(listingId: string, userId: string): Promise<boolean> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("interactions").insert({
    listing_id: listingId,
    user_id: userId,
    kind: "save",
  });
  
  if (error) {
    console.error("Error saving listing:", error);
    return false;
  }
  return true;
}

/**
 * Removes a save interaction for a listing optimistically.
 */
export async function unsaveListingOptimistic(listingId: string, userId: string): Promise<boolean> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from("interactions")
    .delete()
    .eq("listing_id", listingId)
    .eq("user_id", userId)
    .eq("kind", "save");
    
  if (error) {
    console.error("Error unsaving listing:", error);
    return false;
  }
  return true;
}

/**
 * Fetches all saved listing IDs for a given user.
 */
export async function getSavedListingIds(userId: string): Promise<string[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("interactions")
    .select("listing_id")
    .eq("user_id", userId)
    .eq("kind", "save");
    
  if (error) {
    console.error("Error fetching saved listing IDs:", error);
    return [];
  }
  
  return data.map((interaction) => interaction.listing_id);
}
