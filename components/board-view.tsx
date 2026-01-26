"use client";

import { Job, JobStatus } from "@prisma/client";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { JobCard } from "@/components/job-card";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { getStatusColor } from "@/lib/utils";
import { useEffect } from "react";

const JOB_STATUSES: { value: JobStatus; label: string }[] = [
  { value: "WISHLIST", label: "Wishlist" },
  { value: "APPLIED", label: "Applied" },
  { value: "INTERVIEW", label: "Interview" },
  { value: "OFFER", label: "Offer" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
];

interface BoardViewProps {
  jobs: Job[];
  onJobClick: (job: Job) => void;
  onAddClick: (status: JobStatus) => void;
  onPasteUrl?: (url: string) => void;
}

function DroppableColumn({
  status,
  jobs,
  onJobClick,
  onAddClick,
}: {
  status: { value: JobStatus; label: string };
  jobs: Job[];
  onJobClick: (job: Job) => void;
  onAddClick: (status: JobStatus) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status.value,
  });

  return (
    <div
      ref={setNodeRef}
      data-testid={`column-${status.value}`}
      className={`flex ${jobs.length > 0 ? "min-w-[300px]" : ""} flex-1 flex-col rounded-md ${
        isOver ? "bg-card" : "bg-card/65"
      }`}
    >
      <div className="flex items-center justify-between gap-2 p-4">
        <div className="flex items-center gap-2">
          <span
            className={`size-2.5 rounded-full ${getStatusColor(status.value)}`}
            aria-hidden="true"
          />
          <h2 className="font-semibold text-card-foreground">{status.label}</h2>
          {jobs.length > 0 && (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
              {jobs.length}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAddClick(status.value)}
          aria-label={`Add job to ${status.label}`}
        >
          <PlusIcon className="size-4" />
        </Button>
      </div>
      <div className="flex-1 space-y-2 px-4 pb-4 transition-colors">
        <SortableContext
          items={jobs.map((job) => job.id)}
          strategy={verticalListSortingStrategy}
        >
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onClick={onJobClick} />
          ))}
        </SortableContext>
        {jobs.length === 0 && isOver && (
          <div className="flex h-32 items-center justify-center rounded-md border-2 border-dashed border-border text-sm text-muted-foreground">
            Drop jobs here
          </div>
        )}
      </div>
    </div>
  );
}

export function BoardView({
  jobs,
  onJobClick,
  onAddClick,
  onPasteUrl,
}: BoardViewProps) {
  // Paste event listener for URL extraction
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // Ignore paste events in input fields or textareas
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      try {
        const text = await navigator.clipboard.readText();

        // Validate that pasted text is a URL
        new URL(text);

        // Call the paste handler if provided
        onPasteUrl?.(text);
      } catch {
        // Not a valid URL or clipboard read failed - ignore silently
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [onPasteUrl]);

  // Sort jobs by order (asc), then by createdAt (desc) for ties
  const sortedJobs = [...jobs].sort((a, b) => {
    const orderCompare = a.order.localeCompare(b.order);
    if (orderCompare !== 0) return orderCompare;
    // Tie-breaker: createdAt descending (newer first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const jobsByStatus = JOB_STATUSES.reduce(
    (acc, status) => {
      acc[status.value] = sortedJobs.filter(
        (job) => job.status === status.value
      );
      return acc;
    },
    {} as Record<JobStatus, Job[]>
  );

  return (
    <div className="flex flex-1 items-start gap-4 overflow-x-auto p-4">
      {JOB_STATUSES.map((status) => (
        <DroppableColumn
          key={status.value}
          status={status}
          jobs={jobsByStatus[status.value]}
          onJobClick={onJobClick}
          onAddClick={onAddClick}
        />
      ))}
    </div>
  );
}
