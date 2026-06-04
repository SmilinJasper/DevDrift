"use client";

import Link from "next/link";
import { Compass, Menu, X } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-dd-gradient p-1.5 rounded-lg text-white shadow-[0_0_15px_var(--color-dd-accent-glow)] group-hover:shadow-[0_0_20px_var(--color-dd-accent-glow)] transition-shadow">
              <Compass className="w-5 h-5" />
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
          <div className="hidden md:block">
            {/* Dark mode is enforced for this phase */}
            <span className="text-xs font-semibold px-2 py-1 bg-muted rounded-md border text-muted-foreground">
              Dark Mode
            </span>
          </div>

          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle Menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-b border-border bg-background p-4 space-y-4">
          <Link
            href="/"
            className="block text-sm font-medium hover:text-dd-accent transition-colors"
            onClick={() => setIsOpen(false)}
          >
            Home Feed
          </Link>
          <Link
            href="/discover"
            className="block text-sm font-medium hover:text-dd-accent transition-colors"
            onClick={() => setIsOpen(false)}
          >
            Discovery
          </Link>
        </div>
      )}
    </nav>
  );
}
