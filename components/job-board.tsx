"use client";

import { useState, useEffect, useRef } from "react";
import { Job, JobStatus } from "@prisma/client";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import { BoardView } from "@/components/board-view";
import { JobModal } from "@/components/job-modal";
import { JobCard } from "@/components/job-card";
import { toast } from "sonner";
import type { ExtractedJobData } from "@/lib/schemas";
import {
  calculateOrderBetween,
  calculateOrderAtStart,
  calculateOrderAtEnd,
} from "@/lib/fractional-index";

// All valid job statuses for column detection
const JOB_STATUSES: JobStatus[] = [
  "WISHLIST",
  "APPLIED",
  "INTERVIEW",
  "OFFER",
  "ACCEPTED",
  "REJECTED",
];

interface JobBoardProps {
  jobs: Job[];
}

export function JobBoard({ jobs: initialJobs }: JobBoardProps) {
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | undefined>(undefined);
  const [initialStatus, setInitialStatus] = useState<JobStatus | undefined>(
    undefined
  );
  const [extractedJobData, setExtractedJobData] = useState<
    Partial<ExtractedJobData> | undefined
  >(undefined);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Track the target position during drag - this is updated in handleDragOver
  // and used in handleDragEnd to determine where to place the item
  const dragTargetRef = useRef<{
    status: JobStatus;
    overItemId: number | null; // null means end of column
    insertAfter: boolean; // true = insert after overItem, false = insert before
  } | null>(null);

  // Only render DnD on client to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync local state when server data updates
  useEffect(() => {
    setJobs(initialJobs);
  }, [initialJobs]);

  // Trello-style behavior: 1px threshold
  // ≥2px movement = drag, <2px = click
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1,
      },
    })
  );

  function handleNewJob(status: JobStatus) {
    setSelectedJob(undefined);
    setInitialStatus(status);
    setIsModalOpen(true);
  }

  function handleJobClick(job: Job) {
    setSelectedJob(job);
    setIsModalOpen(true);
  }

  function handleModalClose() {
    setIsModalOpen(false);
    // Small delay before clearing selectedJob and initialStatus to avoid visual flash
    setTimeout(() => {
      setSelectedJob(undefined);
      setInitialStatus(undefined);
      setExtractedJobData(undefined);
    }, 200);
  }

  async function handlePasteUrl(url: string) {
    toast.info("We're getting your job details...", {
      description: "This will just take a moment",
    });

    try {
      const response = await fetch("/api/jobs/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("All done!", {
          description: "Review and save the job when ready",
        });
        // Open modal with extracted data
        setExtractedJobData(result.data);
        setInitialStatus("WISHLIST");
        setIsModalOpen(true);
      } else {
        toast.warning("Couldn't extract job details", {
          description: "Full error message available in the console",
        });

        // Log error to console for debugging
        console.error("Extraction error:", result.error);

        // Open modal with just URL
        setExtractedJobData({ jobPostingUrl: url });
        setIsModalOpen(true);
      }
    } catch (error) {
      toast.warning("Something went wrong", {
        description: "Full error message available in the console",
      });
      console.error("Extraction failed:", error);
      // Fallback: open with URL only
      setExtractedJobData({ jobPostingUrl: url });
      setIsModalOpen(true);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const job = event.active.data.current?.job as Job | undefined;
    if (job) {
      setActiveJob(job);
    }

    console.log("DRAG START:", {
      activeId: event.active.id,
      company: job?.company,
      order: job?.order,
    });
  }

  // Handler for drag over events
  // 1. Moves items between columns (status change) so ghost appears in right column
  // 2. Tracks the target position in a ref for use in handleDragEnd
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;

    if (!over) return;

    const activeId = Number(active.id);
    const activeJob = jobs.find((j) => j.id === activeId);
    if (!activeJob) return;

    // Determine target column and position
    let overStatus: JobStatus;
    let overItemId: number | null = null;
    let insertAfter = false;

    if (isColumnId(over.id)) {
      overStatus = over.id;
      overItemId = null; // End of column
      insertAfter = false; // Doesn't matter for column drops
    } else {
      overItemId = Number(over.id);
      const overJob = jobs.find((j) => j.id === overItemId);
      if (!overJob) return;
      overStatus = overJob.status;

      // Determine if we should insert before or after the over item
      // For within-column: compare positions
      if (activeJob.status === overStatus) {
        // Within same column - check if moving down or up by comparing order values
        insertAfter = activeJob.order < overJob.order; // Moving down = insert after
      } else {
        // Cross-column: Check if overJob is the last item in its column
        // If so, user probably wants to insert after it (at the end)
        const columnJobs = getSortedJobsForStatus(overStatus, jobs);
        const isLastInColumn =
          columnJobs.length > 0 &&
          columnJobs[columnJobs.length - 1].id === overJob.id;
        insertAfter = isLastInColumn;
      }
    }

    // Update the target ref - this is what we'll use in handleDragEnd
    dragTargetRef.current = { status: overStatus, overItemId, insertAfter };

    // If moving to a different column, update status so ghost appears there
    if (activeJob.status !== overStatus) {
      setJobs((prevJobs) =>
        prevJobs.map((j) =>
          j.id === activeId ? { ...j, status: overStatus } : j
        )
      );
    }
  }

  // Helper to check if an id is a column (JobStatus) or a card (job id)
  function isColumnId(id: string | number): id is JobStatus {
    return JOB_STATUSES.includes(id as JobStatus);
  }

  // Sort jobs by order field (asc), falling back to createdAt (desc) for ties
  // IMPORTANT: Use simple string comparison, not localeCompare, because
  // fractional-indexing uses base62 (0-9, A-Z, a-z) which requires ASCII ordering
  function getSortedJobsForStatus(status: JobStatus, jobList: Job[]): Job[] {
    return jobList
      .filter((j) => j.status === status)
      .sort((a, b) => {
        // Sort by order ascending using simple string comparison
        if (a.order < b.order) return -1;
        if (a.order > b.order) return 1;
        // Tie-breaker: createdAt descending (newer first)
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    // console.log("DROP EVENT:", {
    //   activeId: active.id,
    //   overId: over?.id,
    //   overData: over?.data?.current,
    //   activeData: active.data?.current,
    //   dragTargetRef: dragTargetRef.current,
    // });

    // If drag was cancelled (dropped outside valid area), revert any status changes
    // made by handleDragOver and reset activeJob
    if (!over) {
      if (activeJob) {
        // Revert the job to its original status (before dragOver changed it)
        setJobs((prevJobs) =>
          prevJobs.map((j) =>
            j.id === activeJob.id ? { ...j, status: activeJob.status } : j
          )
        );
      }
      setActiveJob(null);
      dragTargetRef.current = null;
      return;
    }

    // Clear activeJob at the end, not beginning, so we can access original values
    const activeJobSnapshot = activeJob;
    setActiveJob(null);

    const jobId = Number(active.id);
    const job = jobs.find((j) => j.id === jobId);

    if (!job) {
      dragTargetRef.current = null;
      return;
    }

    // Use activeJobSnapshot for original status since handleDragOver may have changed job.status
    const originalStatus = activeJobSnapshot?.status ?? job.status;
    const originalOrder = activeJobSnapshot?.order ?? job.order;

    // Determine target status and position from the drop event
    // Use over.id directly - it's the most current, accurate position at drop time
    let targetStatus: JobStatus;
    const overId = over.id;

    if (isColumnId(overId)) {
      // Dropped on a column
      targetStatus = overId;
    } else {
      // Dropped on a card - get its column
      const overJobId = Number(overId);
      const overJob = jobs.find((j) => j.id === overJobId);
      if (!overJob) {
        dragTargetRef.current = null;
        return;
      }
      targetStatus = overJob.status;
    }

    // Get sorted jobs in the target column (excluding the dragged job)
    const columnJobsWithoutActive = getSortedJobsForStatus(
      targetStatus,
      jobs
    ).filter((j) => j.id !== jobId);

    // console.log("COLUMN JOBS (without active):", {
    //   targetStatus,
    //   jobs: columnJobsWithoutActive.map((j) => ({
    //     id: j.id,
    //     company: j.company,
    //     order: j.order,
    //   })),
    // });

    console.log(
      "COLUMN JOBS (without active):",
      columnJobsWithoutActive.map((j) => j.order)
    );

    // Calculate the new order value based on where we dropped
    // Note: We use dragTargetRef which was set in handleDragOver
    let newOrder: string;

    if (isColumnId(overId)) {
      // Dropped on column background = insert at end
      if (columnJobsWithoutActive.length === 0) {
        newOrder = calculateOrderBetween(null, null);
        console.log("Empty column, newOrder:", newOrder);
      } else {
        newOrder = calculateOrderAtEnd(
          columnJobsWithoutActive[columnJobsWithoutActive.length - 1].order
        );
        console.log(
          "Insert at END, after:",
          columnJobsWithoutActive[columnJobsWithoutActive.length - 1].order,
          "newOrder:",
          newOrder
        );
      }
    } else {
      // Dropped on a specific card - insert BEFORE it
      const overJobId = Number(overId);
      const overJob = jobs.find((j) => j.id === overJobId);

      if (!overJob) {
        console.log("Over job NOT FOUND, defaulting to end");
        // Shouldn't happen, but fallback to end
        newOrder =
          columnJobsWithoutActive.length > 0
            ? calculateOrderAtEnd(
                columnJobsWithoutActive[columnJobsWithoutActive.length - 1]
                  .order
              )
            : calculateOrderBetween(null, null);
      } else {
        // Check if we should insert before or after (tracked from handleDragOver)
        const insertAfter = dragTargetRef.current?.insertAfter ?? false;

        console.log("Dropped on CARD:", {
          overJobId,
          overJob: overJob.company,
          overJobOrder: overJob.order,
          insertAfter,
        });

        if (insertAfter) {
          // Insert AFTER the over item
          const jobsAfterOver = columnJobsWithoutActive.filter(
            (j) => j.order > overJob.order
          );

          if (jobsAfterOver.length === 0) {
            // No jobs after = insert at end
            newOrder = calculateOrderAtEnd(overJob.order);
            console.log("Insert AFTER (at end):", overJob.order);
          } else {
            // Insert between overJob and the next job
            const afterJob = jobsAfterOver[0];
            console.log(
              "Insert BETWEEN:",
              overJob.order,
              "and",
              afterJob.order
            );

            if (overJob.order >= afterJob.order) {
              newOrder = calculateOrderAtEnd(overJob.order);
            } else {
              newOrder = calculateOrderBetween(overJob.order, afterJob.order);
            }
          }
        } else {
          // Insert BEFORE the over item
          const jobsBeforeOver = columnJobsWithoutActive.filter(
            (j) => j.order < overJob.order
          );

          if (jobsBeforeOver.length === 0) {
            // No jobs before = insert at start
            newOrder = calculateOrderAtStart(overJob.order);
            console.log("Insert BEFORE (at start):", overJob.order);
          } else {
            // Insert between the last job before and the overJob
            const beforeJob = jobsBeforeOver[jobsBeforeOver.length - 1];
            console.log(
              "Insert BETWEEN:",
              beforeJob.order,
              "and",
              overJob.order
            );

            if (beforeJob.order >= overJob.order) {
              newOrder = calculateOrderAtStart(overJob.order);
            } else {
              newOrder = calculateOrderBetween(beforeJob.order, overJob.order);
            }
          }
        }
      }
    }

    // Clear the drag target ref now that we've used it
    dragTargetRef.current = null;

    // Check if anything actually changed (compare to original, not current after dragOver)
    const statusChanged = originalStatus !== targetStatus;
    const orderChanged = originalOrder !== newOrder;

    if (!statusChanged && !orderChanged) {
      // No change - dropped in same position
      return;
    }

    // For reverting on error, use original values
    const oldStatus = originalStatus;
    const oldOrder = originalOrder;

    setJobs((prevJobs) => {
      // Update the job with new status and order
      const updatedJobs = prevJobs.map((j) =>
        j.id === jobId ? { ...j, status: targetStatus, order: newOrder } : j
      );

      // If moving within the same column, use arrayMove for visual reordering
      if (originalStatus === targetStatus) {
        const columnJobs = getSortedJobsForStatus(targetStatus, updatedJobs);
        const oldIndex = columnJobs.findIndex((j) => j.id === jobId);
        const newIndex = columnJobs.findIndex((j) => j.order === newOrder);
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          // The order update already happened, no need for arrayMove
          // The jobs will re-sort based on order
        }
      }

      return updatedJobs;
    });

    try {
      // Call API to update status and order
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus, order: newOrder }),
      });

      if (!response.ok) {
        throw new Error("Failed to update job");
      }

      // Refresh server data to ensure consistency
      router.refresh();
    } catch (error) {
      // Revert optimistic update on error
      setJobs((prevJobs) =>
        prevJobs.map((j) =>
          j.id === jobId ? { ...j, status: oldStatus, order: oldOrder } : j
        )
      );
      console.error("Error updating job:", error);
      toast.error("Couldn't move that card", {
        description: "Something went wrong, please try again",
      });
    }
  }

  const boardView = (
    <BoardView
      jobs={jobs}
      onJobClick={handleJobClick}
      onAddClick={handleNewJob}
      onPasteUrl={handlePasteUrl}
    />
  );

  return (
    <div className="flex flex-1">
      {isMounted ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {boardView}
          <DragOverlay>
            {activeJob ? (
              <div className="cursor-grabbing rotate-[5deg]">
                <JobCard job={activeJob} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        boardView
      )}

      <JobModal
        open={isModalOpen}
        onOpenChange={handleModalClose}
        job={selectedJob}
        initialStatus={initialStatus}
        initialData={extractedJobData}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
