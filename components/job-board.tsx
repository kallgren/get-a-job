"use client";

import { useState, useEffect } from "react";
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

  // Handler for drag over events - dnd-kit's sortable uses this internally
  // for reordering. Could be extended for additional visual feedback if needed.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleDragOver(_event: DragOverEvent) {
    // Currently handled by SortableContext for reordering
  }

  // Helper to check if an id is a column (JobStatus) or a card (job id)
  function isColumnId(id: string | number): id is JobStatus {
    return JOB_STATUSES.includes(id as JobStatus);
  }

  // Sort jobs by order field (asc), falling back to createdAt (desc) for ties
  function getSortedJobsForStatus(status: JobStatus, jobList: Job[]): Job[] {
    return jobList
      .filter((j) => j.status === status)
      .sort((a, b) => {
        // Sort by order ascending
        const orderCompare = a.order.localeCompare(b.order);
        if (orderCompare !== 0) return orderCompare;
        // Tie-breaker: createdAt descending (newer first)
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveJob(null);

    const { active, over } = event;

    if (!over) return;

    const jobId = Number(active.id);
    const job = jobs.find((j) => j.id === jobId);

    if (!job) return;

    // Determine target status and index
    let targetStatus: JobStatus;
    let targetIndex: number;

    const overId = over.id;

    if (isColumnId(overId)) {
      // Dropped on a column - add to end of that column
      targetStatus = overId;
      const columnJobs = getSortedJobsForStatus(targetStatus, jobs);
      targetIndex = columnJobs.length;
    } else {
      // Dropped on a card - find which column and position
      const overJobId = Number(overId);
      const overJob = jobs.find((j) => j.id === overJobId);

      if (!overJob) return;

      targetStatus = overJob.status;
      const columnJobs = getSortedJobsForStatus(targetStatus, jobs);
      targetIndex = columnJobs.findIndex((j) => j.id === overJobId);

      // If dragging within the same column and the active job is before the target,
      // we need to account for the removal of the active job
      if (job.status === targetStatus) {
        const activeIndex = columnJobs.findIndex((j) => j.id === jobId);
        if (activeIndex < targetIndex) {
          // The card will be removed from before the target, so don't adjust index
          // arrayMove handles this, but for order calculation we need the final position
        }
      }
    }

    // Get sorted jobs in the target column (excluding the dragged job)
    const columnJobsWithoutActive = getSortedJobsForStatus(
      targetStatus,
      jobs
    ).filter((j) => j.id !== jobId);

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
      newOrder = calculateOrderBetween(beforeJob.order, afterJob.order);
    }

    // Check if anything actually changed
    const statusChanged = job.status !== targetStatus;
    const orderChanged = job.order !== newOrder;

    if (!statusChanged && !orderChanged) {
      // No change - dropped in same position
      return;
    }

    // Optimistic update
    const oldStatus = job.status;
    const oldOrder = job.order;

    setJobs((prevJobs) => {
      // Update the job with new status and order
      const updatedJobs = prevJobs.map((j) =>
        j.id === jobId ? { ...j, status: targetStatus, order: newOrder } : j
      );

      // If moving within the same column, use arrayMove for visual reordering
      if (job.status === targetStatus) {
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
