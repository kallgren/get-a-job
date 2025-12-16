"use client";

import { Job } from "@prisma/client";
import { useDraggable } from "@dnd-kit/core";

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
      className="cursor-grab rounded-md border border-border bg-card p-4 shadow-sm hover:shadow-md active:cursor-grabbing"
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
