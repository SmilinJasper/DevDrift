import { Navbar } from "@/components/Navbar";
import { HomeFeed } from "@/components/HomeFeed";

export default function Home() {
  return (
    <>
      <Navbar />
      
      <main className="flex-1 flex flex-col">
        {/* Hero Section */}
        <div className="bg-background border-b border-border/40 py-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-dd-gradient opacity-[0.03]"></div>
          
          <div className="container mx-auto max-w-6xl px-4 relative z-10">
            <div className="max-w-2xl">
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
                Discover Your Next <br />
                <span className="text-dd-gradient">Opportunity</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-lg leading-relaxed">
                Personalized hackathons, jobs, and internships tailored to your skills and interests.
              </p>
            </div>
          </div>
        </div>

        {/* Feed Section */}
        <div className="flex-1 bg-muted/20">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="py-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight">Recommended for you</h2>
            </div>
            <HomeFeed />
          </div>
        </div>
      </main>
    </>
  );
}
