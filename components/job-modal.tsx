"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Job, JobStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import {
  AlignLeft,
  MapPin as MapPinIcon,
  User as UserIcon,
  Pencil,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { jobSchema, type JobFormData } from "@/lib/schemas";
import { formatJobDate, getStatusColor } from "@/lib/utils";
import type { z } from "zod";

const JOB_STATUSES: { value: JobStatus; label: string }[] = [
  { value: "WISHLIST", label: "Wishlist" },
  { value: "APPLIED", label: "Applied" },
  { value: "INTERVIEW", label: "Interview" },
  { value: "OFFER", label: "Offer" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
];

interface JobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job?: Job;
  onSuccess?: () => void;
  initialStatus?: JobStatus;
}

type ModalMode = "view" | "edit";

// Convert ISO datetime string or Date to date-only format (YYYY-MM-DD)
// Handles both cases since dates can be Date objects or strings depending on the data source
function isoToDate(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  // Handle Date objects (from some code paths) and strings (from serialization)
  const isoString = iso instanceof Date ? iso.toISOString() : iso;
  return isoString.slice(0, 10); // "2024-11-26T14:30:00.000Z" -> "2024-11-26"
}

export function JobModal({
  open,
  onOpenChange,
  job,
  onSuccess,
  initialStatus,
}: JobModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ModalMode>("edit");
  const isEditing = !!job;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<z.input<typeof jobSchema>, any, JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      company: "",
      title: "",
      location: "",
      jobPostingUrl: "",
      jobPostingText: "",
      status: "WISHLIST",
      notes: "",
      contactPerson: "",
      resumeUrl: "",
      coverLetterUrl: "",
      dateApplied: undefined,
    },
  });

  // Reset form when job changes or modal opens/closes
  useEffect(() => {
    if (open) {
      // Set mode: view for existing jobs, edit for new jobs
      setMode(job ? "view" : "edit");

      if (job) {
        form.reset({
          company: job.company,
          title: job.title ?? "",
          location: job.location ?? "",
          jobPostingUrl: job.jobPostingUrl ?? "",
          jobPostingText: job.jobPostingText ?? "",
          status: job.status,
          notes: job.notes ?? "",
          contactPerson: job.contactPerson ?? "",
          resumeUrl: job.resumeUrl ?? "",
          coverLetterUrl: job.coverLetterUrl ?? "",
          dateApplied: isoToDate(job.dateApplied),
        });
      } else {
        form.reset({
          company: "",
          title: "",
          location: "",
          jobPostingUrl: "",
          jobPostingText: "",
          status: initialStatus ?? "WISHLIST",
          notes: "",
          contactPerson: "",
          resumeUrl: "",
          coverLetterUrl: "",
          dateApplied: "",
        });
      }
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, job, initialStatus]);

  async function onSubmit(data: JobFormData) {
    setIsSubmitting(true);
    setError(null);

    try {
      // dateApplied is already in YYYY-MM-DD format from the date input
      const payload = data;

      const url = isEditing ? `/api/jobs/${job.id}` : "/api/jobs";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save job");
      }

      // Success - refresh the page data and close modal
      router.refresh();
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!job?.id) return;

    // Native browser confirm dialog
    const jobTitle = job.title || "Untitled";
    const confirmed = window.confirm(
      `Delete ${job.company} - ${jobTitle}?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/jobs/${job.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete job");
      }

      // Success - close modal and refresh
      onOpenChange(false);
      router.refresh();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsDeleting(false);
    }
  }

  // Display view component for read-only job details
  function DisplayView({ job }: { job: Job }) {
    const [isJobPostingExpanded, setIsJobPostingExpanded] = useState(false);

    return (
      <div className="space-y-4">
        {/* Job Posting URL (if exists) */}
        {job.jobPostingUrl && (
          <div>
            <a
              href={job.jobPostingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline break-all"
            >
              {job.jobPostingUrl}
            </a>
          </div>
        )}

        {/* Row 3: Resume and Cover Letter URLs (inline) */}
        {(job.resumeUrl || job.coverLetterUrl) && (
          <div className="flex flex-col gap-2 text-sm">
            {job.resumeUrl && (
              <a
                href={job.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline break-all"
              >
                {job.resumeUrl}
              </a>
            )}
            {job.coverLetterUrl && (
              <a
                href={job.coverLetterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline break-all"
              >
                {job.coverLetterUrl}
              </a>
            )}
          </div>
        )}

        {/* Row 4: Location and Contact Person (with icons) */}
        {(job.location || job.contactPerson) && (
          <div className="flex gap-4 text-sm text-muted-foreground">
            {job.location && (
              <div className="flex items-center gap-1.5">
                <MapPinIcon className="size-4" aria-hidden="true" />
                <span>{job.location}</span>
              </div>
            )}
            {job.contactPerson && (
              <div className="flex items-center gap-1.5">
                <UserIcon className="size-4" aria-hidden="true" />
                <span>{job.contactPerson}</span>
              </div>
            )}
          </div>
        )}

        {/* Row 5: Status and Date Applied */}
        <div className="flex gap-4 text-sm items-center">
          <span
            className={`${getStatusColor(job.status)} px-3 py-1 rounded-md font-medium text-card-foreground`}
          >
            {JOB_STATUSES.find((s) => s.value === job.status)?.label ??
              job.status}
          </span>
          {job.dateApplied && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-card-foreground">Applied:</span>
              <span className="text-muted-foreground">
                {formatJobDate(job.dateApplied)}
              </span>
            </div>
          )}
        </div>

        {/* Notes (if exists) - styled like a paper note */}
        {job.notes && job.notes.trim() && (
          <div className="bg-card border border-border shadow-md p-4 space-y-2">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-card-foreground">
              Personal Notes
              <AlignLeft className="size-4" aria-hidden="true" />
            </h3>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {job.notes}
            </p>
          </div>
        )}

        {/* Job Posting Text (if exists) */}
        {job.jobPostingText && job.jobPostingText.trim() && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-card-foreground">
              Description
            </h3>
            <div>
              <p
                className={`whitespace-pre-wrap text-sm text-muted-foreground ${
                  !isJobPostingExpanded ? "line-clamp-6" : ""
                }`}
              >
                {job.jobPostingText}
              </p>
              <button
                type="button"
                onClick={() => setIsJobPostingExpanded(!isJobPostingExpanded)}
                className="mt-2 text-sm text-primary hover:underline cursor-pointer"
              >
                {isJobPostingExpanded ? "Show less" : "Show more"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        aria-describedby={undefined}
        onEscapeKeyDown={(e) => {
          // If editing an existing job, Esc goes back to view mode
          if (mode === "edit" && isEditing) {
            e.preventDefault();
            setMode("view");
          }
          // Otherwise, allow default behavior (close modal)
        }}
      >
        <DialogHeader>
          {mode === "view" && job ? (
            <div className="flex items-center justify-between">
              <DialogTitle>
                {job.company}
                {job.title && ` - ${job.title}`}
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMode("edit")}
                className="mr-8"
                aria-label="Edit job"
              >
                <Pencil className="size-4" />
              </Button>
            </div>
          ) : (
            <DialogTitle>{isEditing ? "Edit Job" : "New Job"}</DialogTitle>
          )}
        </DialogHeader>

        {mode === "view" && job ? (
          <DisplayView job={job} />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Row 1: Company, Title */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company *</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Inc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Senior Developer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 2: Location, Contact Person */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Stockholm, Sweden" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person</FormLabel>
                      <FormControl>
                        <Input placeholder="Jane Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 3: Status, Date Applied */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {JOB_STATUSES.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateApplied"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date Applied</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 4: Job Posting URL (full width) */}
              <FormField
                control={form.control}
                name="jobPostingUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Posting URL</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://company.com/jobs/123"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Row 5: Notes (full width) */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      Personal Notes
                      <AlignLeft className="size-4" aria-hidden="true" />
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Notes about the company, interview prep, etc."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Row 6: Job Posting Text (full width) */}
              <FormField
                control={form.control}
                name="jobPostingText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Paste the full job posting here..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Row 7: Resume URL, Cover Letter URL */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="resumeUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resume URL</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://drive.google.com/..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="coverLetterUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cover Letter URL</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://drive.google.com/..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <DialogFooter className="sm:justify-between">
                {isEditing && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isSubmitting || isDeleting}
                    className="sm:mr-auto"
                  >
                    Delete
                  </Button>
                )}
                <div className="flex gap-2 sm:ml-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (isEditing) {
                        // If editing existing job, go back to view mode
                        setMode("view");
                      } else {
                        // If creating new job, close modal
                        onOpenChange(false);
                      }
                    }}
                    disabled={isSubmitting || isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting || isDeleting}>
                    {isSubmitting
                      ? "Saving..."
                      : isEditing
                        ? "Update Job"
                        : "Add Job"}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
