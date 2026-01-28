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
  // We only need this for cross-column moves to make the ghost appear in the right column
  const dragTargetRef = useRef<{
    status: JobStatus;
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

  }

  // Handler for drag over events
  // Moves items between columns (status change) so ghost appears in right column
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;

    if (!over) return;

    const activeId = Number(active.id);
    const activeJob = jobs.find((j) => j.id === activeId);
    if (!activeJob) return;

    // Determine target column
    let overStatus: JobStatus;
    if (isColumnId(over.id)) {
      overStatus = over.id;
    } else {
      const overJob = jobs.find((j) => j.id === Number(over.id));
      if (!overJob) return;
      overStatus = overJob.status;
    }

    // Track the target status for handleDragEnd
    dragTargetRef.current = { status: overStatus };

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

    // Get the target index from dnd-kit's sortable data
    // This is where the ghost appears - the source of truth!
    // NOTE: sortable.index appears to be an internal implementation detail, not a documented API.
    // It works reliably but may break in future dnd-kit versions.
    // Alternative: use items.indexOf(over.id) pattern from official examples.
    // TODO: Consider refactoring to use documented API if this breaks.
    const sortableData = over.data.current?.sortable;
    const targetIndex = sortableData?.index;

    // Calculate the new order value based on the target index
    let newOrder: string;

    if (
      targetIndex === undefined ||
      targetIndex === null ||
      columnJobsWithoutActive.length === 0
    ) {
      // No sortable data or empty column - insert at end
      if (columnJobsWithoutActive.length === 0) {
        newOrder = calculateOrderBetween(null, null);
      } else {
        newOrder = calculateOrderAtEnd(
          columnJobsWithoutActive[columnJobsWithoutActive.length - 1].order
        );
      }
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

      // Handle edge case: if both jobs have the same order
      if (beforeJob.order >= afterJob.order) {
        newOrder = calculateOrderAtStart(afterJob.order);
      } else {
        newOrder = calculateOrderBetween(beforeJob.order, afterJob.order);
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
