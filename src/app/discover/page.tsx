import { Navbar } from "@/components/Navbar";
import { DiscoveryClient } from "./DiscoveryClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Discovery — DevDrift",
  description: "Browse all hackathons, jobs, and internships.",
};

export default function DiscoveryPage() {
  return (
    <>
      <Navbar />
      
      <main className="flex-1 flex flex-col bg-muted/20 min-h-screen">
        <div className="container mx-auto max-w-6xl px-4 py-8 md:py-12">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Discovery</h1>
            <p className="text-muted-foreground">
              Browse and filter all available opportunities globally.
            </p>
          </div>
          
          <DiscoveryClient />
        </div>
      </main>
    </>
  );
}
