// Drag-and-drop helper functions for job board
// Extracted for testability

import { Job, JobStatus } from "@prisma/client";
import {
  calculateOrderBetween,
  calculateOrderAtStart,
  calculateOrderAtEnd,
} from "@/lib/fractional-index";

// All valid job statuses for column detection
export const JOB_STATUSES: JobStatus[] = [
  "WISHLIST",
  "APPLIED",
  "INTERVIEW",
  "OFFER",
  "ACCEPTED",
  "REJECTED",
];

/**
 * Check if an id is a column (JobStatus) or a card (job id)
 */
export function isColumnId(id: string | number): id is JobStatus {
  return JOB_STATUSES.includes(id as JobStatus);
}

/**
 * Sort jobs by order field (asc), falling back to createdAt (desc) for ties
 */
export function getSortedJobsForStatus(
  status: JobStatus,
  jobList: Job[]
): Job[] {
  return jobList
    .filter((j) => j.status === status)
    .sort((a, b) => {
      // Sort by order ascending using simple string comparison
      // IMPORTANT: Don't use localeCompare - fractional-indexing uses base62
      // (0-9, A-Z, a-z) which requires ASCII ordering
      if (a.order < b.order) return -1;
      if (a.order > b.order) return 1;
      // Tie-breaker: createdAt descending (newer first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

/**
 * Result of calculating a drop operation
 */
export interface DropResult {
  targetStatus: JobStatus;
  newOrder: string;
  statusChanged: boolean;
  orderChanged: boolean;
}

/**
 * Calculate the result of dropping a job at a specific position
 *
 * @param job - The job being dragged (use original values from drag start)
 * @param overId - The id of the element being dropped on (column or card)
 * @param jobs - Current list of all jobs
 * @returns The target status and new order, or null if drop target not found
 */
export function calculateDropResult(
  job: { id: number; status: JobStatus; order: string },
  overId: string | number,
  jobs: Job[]
): DropResult | null {
  let targetStatus: JobStatus;
  let targetIndex: number;

  // Determine target status
  if (isColumnId(overId)) {
    // Dropped on a column
    targetStatus = overId;
  } else {
    // Dropped on a card - get its column
    const overJobId = Number(overId);
    const overJob = jobs.find((j) => j.id === overJobId);
    if (!overJob) return null;
    targetStatus = overJob.status;
  }

  // Get sorted jobs in the target column (excluding the dragged job)
  // IMPORTANT: Must exclude the dragged job to get correct index calculations
  const columnJobsWithoutActive = getSortedJobsForStatus(
    targetStatus,
    jobs
  ).filter((j) => j.id !== job.id);

  // Calculate target index from the filtered list
  if (isColumnId(overId)) {
    // Dropped on column = end of list
    targetIndex = columnJobsWithoutActive.length;
  } else {
    // Dropped on a card - find its position in the filtered list
    const overJobId = Number(overId);
    targetIndex = columnJobsWithoutActive.findIndex((j) => j.id === overJobId);
    // If the card we dropped on isn't found, default to end
    if (targetIndex === -1) {
      targetIndex = columnJobsWithoutActive.length;
    }
  }

  // Calculate the new order value
  let newOrder: string;
  if (columnJobsWithoutActive.length === 0) {
    // Empty column - generate first order
    newOrder = calculateOrderBetween(null, null);
  } else if (targetIndex <= 0) {
    // Insert at start
    newOrder = calculateOrderAtStart(columnJobsWithoutActive[0].order);
  } else if (targetIndex >= columnJobsWithoutActive.length) {
    // Insert at end
    newOrder = calculateOrderAtEnd(
      columnJobsWithoutActive[columnJobsWithoutActive.length - 1].order
    );
  } else {
    // Insert between two items
    const beforeJob = columnJobsWithoutActive[targetIndex - 1];
    const afterJob = columnJobsWithoutActive[targetIndex];

    // Handle edge case: if both jobs have the same order (e.g., all "0"),
    // we can't calculate between them. Insert before the afterJob instead.
    if (beforeJob.order >= afterJob.order) {
      newOrder = calculateOrderAtStart(afterJob.order);
    } else {
      newOrder = calculateOrderBetween(beforeJob.order, afterJob.order);
    }
  }

  const statusChanged = job.status !== targetStatus;
  const orderChanged = job.order !== newOrder;

  return {
    targetStatus,
    newOrder,
    statusChanged,
    orderChanged,
  };
}
