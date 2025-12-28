import { Job } from "@prisma/client";
import { ExportedJob } from "./schemas";

/** Application name prefix for export files */
export const EXPORT_FILENAME_PREFIX = "get-a-job-export";

/** Regex pattern for validating export filenames */
export const EXPORT_FILENAME_PATTERN =
  /^get-a-job-export-\d{4}-\d{2}-\d{2}\.json$/;

/**
 * Transform Job from database to exportable format.
 * Removes auto-generated fields (id, userId, timestamps, deletedAt).
 * Keeps null values
 *
 * @param job - The job object from the database
 * @returns Exportable job object with only user-editable fields
 */
export function jobToExportedJob(job: Job): ExportedJob {
  return {
    company: job.company,
    title: job.title ?? null,
    location: job.location ?? null,
    status: job.status,
    order: job.order,
    dateApplied: job.dateApplied
      ? (typeof job.dateApplied === "string"
          ? job.dateApplied
          : job.dateApplied.toISOString()
        ).split("T")[0]
      : null,
    jobPostingUrl: job.jobPostingUrl ?? null,
    jobPostingText: job.jobPostingText ?? null,
    notes: job.notes ?? null,
    resumeUrl: job.resumeUrl ?? null,
    coverLetterUrl: job.coverLetterUrl ?? null,
    contactPerson: job.contactPerson ?? null,
  };
}

/**
 * Generate export filename with current date.
 * Format: get-a-job-export-YYYY-MM-DD.json
 *
 * @returns Filename string with current date
 */
export function generateExportFilename(): string {
  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return `${EXPORT_FILENAME_PREFIX}-${date}.json`;
}

/**
 * Trigger browser download of JSON data.
 * Creates a Blob and uses a temporary anchor element to trigger download.
 *
 * @param data - The data to download as JSON
 * @param filename - The filename for the download
 */
export function downloadJSON(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Cleanup - defer to allow download to start
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Read and parse JSON file from File object.
 * Returns a promise that resolves with the parsed data or rejects with an error.
 *
 * @param file - The File object to read
 * @returns Promise that resolves with parsed JSON data
 */
export async function parseJSONFile<T>(file: File): Promise<T> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text) as T;
        resolve(data);
      } catch {
        reject(new Error("Invalid JSON file"));
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}
