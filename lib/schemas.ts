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
