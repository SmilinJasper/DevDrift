"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateEmbedding } from "@/lib/embeddings";
import { redirect } from "next/navigation";

export async function saveOnboarding(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const username = formData.get("username") as string;
  const fullName = formData.get("fullName") as string;
  const rawInterests = formData.get("interests") as string;
  
  const interests = rawInterests
    .split(",")
    .map(i => i.trim())
    .filter(i => i.length > 0);

  // Generate vector from interests (combined as a comma-separated string)
  const interest_embedding = await generateEmbedding(interests.join(", "));

  // We serialize the vector array as a string for pgvector format: '[0.1, 0.2, ...]'
  const embeddingString = `[${interest_embedding.join(",")}]`;

  const { error } = await supabase
    .from("profiles")
    .update({
      username,
      full_name: fullName,
      interests,
      interest_embedding: embeddingString
    })
    .eq("id", user.id);

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/");
}
