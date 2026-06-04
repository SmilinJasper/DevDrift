import Link from "next/link";
import Image from "next/image";
import { User } from "lucide-react";
import { NavbarClient } from "./NavbarClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function Navbar() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const isAuthenticated = !!user;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden shadow-[0_0_15px_var(--color-dd-accent-glow)] group-hover:shadow-[0_0_20px_var(--color-dd-accent-glow)] transition-shadow">
              <Image 
                src="/logo.png" 
                alt="DevDrift Logo" 
                fill 
                className="object-cover"
              />
            </div>
            <span className="font-bold text-xl tracking-tight hidden sm:inline-block">
              Dev<span className="text-dd-gradient">Drift</span>
            </span>
          </Link>

          <div className="hidden md:flex gap-6">
            <Link
              href="/"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Home Feed
            </Link>
            <Link
              href="/discover"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Discovery
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4">
            <span className="text-xs font-semibold px-2 py-1 bg-muted rounded-md border text-muted-foreground">
              Dark Mode
            </span>
            
            {isAuthenticated ? (
              <Link
                href="/profile"
                className="flex items-center gap-1.5 text-sm font-medium text-dd-accent hover:text-dd-accent/80 transition-colors px-3 py-1.5 rounded-full bg-dd-accent/10"
              >
                <User className="w-4 h-4" />
                Profile
              </Link>
            ) : (
              <Link
                href="/login"
                className="text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-1.5 rounded-full transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>

          <NavbarClient isAuthenticated={isAuthenticated} />
        </div>
      </div>
    </nav>
  );
}
