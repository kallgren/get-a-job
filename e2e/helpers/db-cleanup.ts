import { prisma } from "@/lib/prisma";

/**
 * Hard delete all jobs for a test user.
 * This bypasses soft delete and removes jobs completely from the database.
 * JobHistory records will cascade delete automatically.
 *
 * @param userId - The Clerk user ID to clean up jobs for
 */
export async function cleanupTestUserJobs(userId: string): Promise<void> {
  if (!userId || userId.trim() === "") {
    throw new Error("TEST_USER_ID is required but not set");
  }

  try {
    // Hard delete all jobs for this user (including soft-deleted ones)
    // JobHistory will cascade delete due to onDelete: Cascade in schema
    await prisma.job.deleteMany({
      where: { userId },
    });
  } catch (error) {
    console.error("Failed to cleanup test user jobs:", error);
    throw error;
  }
}
