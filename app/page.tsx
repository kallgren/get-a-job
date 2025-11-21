import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";

export default async function Home() {
  const user = await currentUser();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <h1 className="text-xl font-semibold">Job Tracker</h1>
          <UserButton />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-zinc-600 dark:text-zinc-400">
          Welcome, {user?.firstName || user?.emailAddresses[0]?.emailAddress}!
        </p>
        <p className="mt-4 text-zinc-500">
          Job board and table views coming soon...
        </p>
      </main>
    </div>
  );
}
