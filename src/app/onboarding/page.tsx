import { saveOnboarding } from "./actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function OnboardingPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams;
  const error = searchParams?.error as string | undefined;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Complete your profile</CardTitle>
          <CardDescription>
            Tell us about your interests to get personalized recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveOnboarding} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" placeholder="dev_ninja" required minLength={3} maxLength={40} />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" name="fullName" placeholder="John Doe" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="interests">Interests (comma separated)</Label>
              <Input id="interests" name="interests" placeholder="React, AI, Open Source, Hackathons" required />
              <p className="text-xs text-muted-foreground">
                We'll use these tags to tailor your feed using semantic search.
              </p>
            </div>

            {error && <div className="text-sm text-red-500 font-medium">{error}</div>}

            <Button type="submit" className="mt-4">
              Save and Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
