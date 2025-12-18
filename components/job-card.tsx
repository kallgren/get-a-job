"use client";

import { Job } from "@prisma/client";
import { useDraggable } from "@dnd-kit/core";
import { getStatusColor } from "@/lib/utils";

interface JobCardProps {
  job: Job;
  onClick?: (job: Job) => void;
}

export function JobCard({ job, onClick }: JobCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: job.id,
    data: { job },
  });

  const style = {
    // transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    borderStyle: isDragging ? "dashed" : "solid",
  };

  const handleClick = () => {
    onClick?.(job);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative cursor-grab rounded-md border border-border bg-card p-4 shadow-sm hover:shadow-md active:cursor-grabbing overflow-hidden`}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Status color stripe */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 bg-${getStatusColor(
          job.status
        )}`}
        aria-hidden="true"
      />
      <h3 className="font-medium text-card-foreground">{job.company}</h3>
      <p className="text-sm text-card-foreground">{job.title}</p>
      {job.location && (
        <p className="mt-1 text-xs text-muted-foreground">{job.location}</p>
      )}
      {job.dateApplied && (
        <p className="mt-2 text-xs text-muted-foreground">
          Applied: {new Date(job.dateApplied).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
