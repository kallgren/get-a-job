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

  async function handleDragEnd(event: DragEndEvent) {
    setActiveJob(null);

    const { active, over } = event;

    if (!over) return;

    const jobId = Number(active.id);
    const newStatus = over.id as JobStatus;
    const job = jobs.find((j) => j.id === jobId);

    if (!job || job.status === newStatus) return;

    // Optimistic update
    const oldStatus = job.status;
    setJobs((prevJobs) =>
      prevJobs.map((j) => (j.id === jobId ? { ...j, status: newStatus } : j))
    );

    try {
      // Call API to update status
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update job status");
      }

      // Refresh server data to ensure consistency
      router.refresh();
    } catch (error) {
      // Revert optimistic update on error
      setJobs((prevJobs) =>
        prevJobs.map((j) => (j.id === jobId ? { ...j, status: oldStatus } : j))
      );
      console.error("Error updating job:", error);
      // TODO: Show error toast
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
