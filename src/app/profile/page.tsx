import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "./actions";
import { Button } from "@/components/ui/button";
import { MapPin, LogOut } from "lucide-react";
import { ListingCard } from "@/components/ListingCard";

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch profile data
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return <div className="p-8 text-center text-red-500">Error loading profile data.</div>;
  }

  // Fetch saved listings
  const { data: savedInteractions } = await supabase
    .from("interactions")
    .select("listing_id")
    .eq("user_id", user.id)
    .eq("kind", "save");

  let savedListings: any[] = [];
  if (savedInteractions && savedInteractions.length > 0) {
    const listingIds = savedInteractions.map(i => i.listing_id);
    const { data: listings } = await supabase
      .from("listings")
      .select("*")
      .in("id", listingIds);
    savedListings = listings || [];
  }

  return (
    <div className="container max-w-4xl mx-auto py-10 px-4">
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-card p-6 rounded-2xl border border-border">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-dd-gradient flex items-center justify-center text-3xl font-bold text-white uppercase shadow-lg">
            {profile.full_name?.[0] || profile.username?.[0] || "?"}
          </div>
          <div>
            <h1 className="text-3xl font-bold">{profile.full_name || profile.username}</h1>
            <p className="text-muted-foreground">@{profile.username}</p>
            {profile.location && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-2">
                <MapPin className="w-4 h-4" />
                <span>{profile.location}</span>
              </div>
            )}
          </div>
        </div>

        <form action={signOut}>
          <Button variant="outline" className="text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/20">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </form>
      </div>

      {/* Interests */}
      {profile.interests && profile.interests.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Your Interests</h2>
          <div className="flex flex-wrap gap-2">
            {profile.interests.map((tag: string) => (
              <span key={tag} className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Saved Listings */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Saved Opportunities</h2>
        {savedListings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedListings.map(listing => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isSaved={true}
              />
            ))}
          </div>
        ) : (
          <div className="text-center p-12 bg-card rounded-2xl border border-border border-dashed">
            <h3 className="text-lg font-medium text-foreground mb-2">No saved opportunities yet</h3>
            <p className="text-muted-foreground">Browse the home feed and click the bookmark icon to save listings here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
