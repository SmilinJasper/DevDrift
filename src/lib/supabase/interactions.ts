import { createSupabaseBrowserClient } from "./client";

const MOCK_USER_ID = "00000000-0000-0000-0000-000000000000";
const LOCAL_STORAGE_KEY = "orbit_saved_listings";

/**
 * Inserts a save interaction for a listing optimistically.
 */
export async function saveListingOptimistic(listingId: string, userId: string): Promise<boolean> {
  if (userId === MOCK_USER_ID && typeof window !== "undefined") {
    try {
      const saved = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
      if (!saved.includes(listingId)) {
        saved.push(listingId);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(saved));
      }
      return true;
    } catch {
      return false;
    }
  }

  try {
    const res = await fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listing_id: listingId, kind: "save" }),
    });
    return res.ok;
  } catch (error) {
    console.error("Error saving listing:", error);
    return false;
  }
}

/**
 * Removes a save interaction for a listing optimistically.
 */
export async function unsaveListingOptimistic(listingId: string, userId: string): Promise<boolean> {
  if (userId === MOCK_USER_ID && typeof window !== "undefined") {
    try {
      let saved = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
      saved = saved.filter((id: string) => id !== listingId);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(saved));
      return true;
    } catch {
      return false;
    }
  }

  try {
    const res = await fetch("/api/interactions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listing_id: listingId, kind: "save" }),
    });
    return res.ok;
  } catch (error) {
    console.error("Error unsaving listing:", error);
    return false;
  }
}

/**
 * Fetches all saved listing IDs for a given user.
 */
export async function getSavedListingIds(userId: string): Promise<string[]> {
  if (userId === MOCK_USER_ID && typeof window !== "undefined") {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

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
