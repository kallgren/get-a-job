import { prisma } from "@/lib/prisma";
import { Job, JobStatus } from "@prisma/client";

/**
 * Fetch all non-deleted jobs for a user, ordered by position then creation date
 */
export async function getJobsByUserId(userId: string) {
  return await prisma.job.findMany({
    where: {
      userId,
      deletedAt: null,
    },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });
}

/**
 * Safe wrapper for getJobsByUserId that returns error as value instead of throwing
 * Use this in Server Components for proper error handling
 */
export async function getJobsByUserIdSafe(userId: string) {
  try {
    const data = await getJobsByUserId(userId);
    return { data, error: null };
  } catch (error) {
    console.error("Database error fetching jobs:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to fetch jobs",
    };
  }
}

/**
 * Fetch a single job by ID
 * Note: Caller must check userId for authorization
 */
export async function getJobById(id: number) {
  return await prisma.job.findUnique({
    where: { id },
  });
}

/**
 * Create a new job
 */
export type CreateJobInput = Omit<
  Job,
  "id" | "createdAt" | "updatedAt" | "deletedAt"
>;

export async function createJob(data: CreateJobInput) {
  return await prisma.job.create({
    data,
  });
}

/**
 * Update an existing job
 * Note: Caller must check userId for authorization
 */
export type UpdateJobInput = Partial<
  Omit<Job, "id" | "userId" | "createdAt" | "updatedAt" | "deletedAt">
>;

export async function updateJob(id: number, data: UpdateJobInput) {
  return await prisma.job.update({
    where: { id },
    data,
  });
}

/**
 * Soft delete a job
 * Note: Caller must check userId for authorization
 */
export async function deleteJob(id: number) {
  return await prisma.job.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    },
  });
}

/**
 * Get the order value of the first job in a column (by status)
 * Used for calculating order when adding new jobs at the top of a column
 */
export async function getFirstJobOrderInColumn(
  userId: string,
  status: JobStatus
): Promise<string | null> {
  const firstJob = await prisma.job.findFirst({
    where: { userId, status, deletedAt: null },
    orderBy: { order: "asc" },
    select: { order: true },
  });
  return firstJob?.order ?? null;
}
