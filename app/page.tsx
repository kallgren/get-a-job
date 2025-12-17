import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
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
        <div className="flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-semibold">Job Tracker</h1>
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
