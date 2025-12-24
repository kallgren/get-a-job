import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Briefcase } from "lucide-react";
import { JobBoard } from "@/components/job-board";
import { ThemeToggle } from "@/components/theme-toggle";
import { getJobsByUserIdSafe } from "@/lib/queries/jobs";

export default async function Home() {
  const { userId } = await auth();

  const { data: jobs, error } = await getJobsByUserIdSafe(userId!);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-destructive">
          Failed to load jobs. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-lg bg-brand-blue p-2">
              <Briefcase className="h-7 w-7 text-brand-blue-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Get a Job</h1>
              <p className="text-sm text-muted-foreground">
                Simple Kanban for your job search
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserButton />
          </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col pt-2">
        <JobBoard jobs={jobs || []} />
      </main>
    </div>
  );
}
