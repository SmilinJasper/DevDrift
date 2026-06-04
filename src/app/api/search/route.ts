import { type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateEmbedding } from "@/lib/embeddings";

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== "string") {
      return Response.json({ error: "Invalid query" }, { status: 400 });
    }

    const embedding = await generateEmbedding(query);
    const embeddingString = `[${embedding.join(",")}]`;

    const supabase = await createSupabaseServerClient();

    const { data: results, error } = await supabase.rpc("match_listings", {
      query_embedding: embeddingString,
      match_threshold: 0.5,
      match_count: 5,
    });

    if (error) {
      console.error("[search] RPC Error:", error);
      return Response.json({ error: "Failed to perform search" }, { status: 500 });
    }

    return Response.json({ results });
  } catch (error) {
    console.error("[search] Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
