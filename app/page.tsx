import { auth } from "@clerk/nextjs/server";
import { Briefcase, ThumbsUp } from "lucide-react";
import { JobBoard } from "@/components/job-board";
import { HeaderActions } from "@/app/_components/header-actions";
import { getJobsByUserIdSafe } from "@/lib/queries/jobs";

export default async function Home() {
  const { userId } = await auth();

  const { data: jobs, error } = await getJobsByUserIdSafe(userId!);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center rounded-full bg-brand-blue p-3">
              <Briefcase className="h-6 w-6 text-brand-blue-foreground" />
              <div className="absolute -right-1 -top-1 rounded-full bg-background p-1">
                <ThumbsUp className="h-4 w-4 rotate-12 text-brand-blue" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-semibold">Get a Job</h1>
              <p className="text-sm text-muted-foreground">
                Simple Kanban for your job search
              </p>
            </div>
          </div>
          <HeaderActions />
        </div>
      </header>
      <main className="flex flex-1 flex-col pt-2">
        {error ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-destructive">
              Whoops, something went wrong here. Please try again later.
            </p>
          </div>
        ) : (
          <JobBoard jobs={jobs || []} />
        )}
      </main>
    </div>
  );
}
