"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function NavbarClient({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className="md:hidden p-2 text-foreground"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Menu"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {isOpen && (
        <div className="absolute top-16 left-0 right-0 border-b border-border bg-background p-4 space-y-4 md:hidden shadow-lg">
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
          {isAuthenticated ? (
            <Link
              href="/profile"
              className="block text-sm font-medium text-dd-accent hover:text-dd-accent/80 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Profile
            </Link>
          ) : (
            <Link
              href="/login"
              className="block text-sm font-medium text-dd-accent hover:text-dd-accent/80 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Sign In
            </Link>
          )}
        </div>
      )}
    </>
  );
}
