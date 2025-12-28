import { z } from "zod";

export const jobSchema = z.object({
  company: z.string().min(1, "Company name is required"),
  title: z.string().optional(),
  location: z.string().optional(),
  jobPostingUrl: z.url({ message: "Invalid URL" }).or(z.literal("")).optional(),
  jobPostingText: z.string().optional(),
  status: z
    .enum(["WISHLIST", "APPLIED", "INTERVIEW", "OFFER", "ACCEPTED", "REJECTED"])
    .default("WISHLIST"),
  notes: z.string().optional(),
  contactPerson: z.string().optional(),
  resumeUrl: z.url({ message: "Invalid URL" }).or(z.literal("")).optional(),
  coverLetterUrl: z
    .url({ message: "Invalid URL" })
    .or(z.literal(""))
    .optional(),
  dateApplied: z.iso.date().or(z.literal("")).optional(),
  order: z.string().default("0"),
});

export const createJobSchema = jobSchema.partial({
  dateApplied: true,
});

export const updateJobSchema = jobSchema.partial();

// Export types for use in forms and API routes
// Use z.output for forms because react-hook-form expects the OUTPUT type
// (where .default() values are applied and fields become required)
export type JobFormData = z.output<typeof jobSchema>;
export type CreateJobData = z.output<typeof createJobSchema>;
export type UpdateJobData = z.output<typeof updateJobSchema>;

// Export/Import schemas
// jobSchema already contains only user-editable fields (no id, userId, timestamps)
// so we can reuse it directly for import validation
export const jobImportSchema = z.preprocess(
  // Convert null to undefined for optional fields (exported JSON uses null for clarity)
  (data) => {
    if (typeof data !== "object" || data === null) return data;
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        value === null ? undefined : value,
      ])
    );
  },
  jobSchema.strict()
);

export const importRequestSchema = z.object({
  jobs: z.array(jobImportSchema),
});

// Manually define ExportedJob type to explicitly show null values in JSON format
// This is the format we create when exporting. The jobImportSchema validates this format during import.
export type ExportedJob = {
  company: string;
  title?: string | null;
  location?: string | null;
  status:
    | "WISHLIST"
    | "APPLIED"
    | "INTERVIEW"
    | "OFFER"
    | "ACCEPTED"
    | "REJECTED";
  order: string;
  dateApplied?: string | null;
  jobPostingUrl?: string | null;
  jobPostingText?: string | null;
  notes?: string | null;
  resumeUrl?: string | null;
  coverLetterUrl?: string | null;
  contactPerson?: string | null;
};
export type ImportRequest = z.input<typeof importRequestSchema>;
