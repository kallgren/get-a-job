import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { JobStatus } from "@prisma/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the complete Tailwind background color class for a job status
 * Returns complete class names so Tailwind's JIT compiler can detect them
 */
export function getStatusColor(status: JobStatus): string {
  const colorMap: Record<JobStatus, string> = {
    WISHLIST: "bg-status-wishlist",
    APPLIED: "bg-status-applied",
    INTERVIEW: "bg-status-interview",
    OFFER: "bg-status-offer",
    ACCEPTED: "bg-status-accepted",
    REJECTED: "bg-status-rejected",
  };
  return colorMap[status];
}

/**
 * Convert empty strings and undefined to null for Prisma
 * Prisma expects null for optional fields (PostgreSQL standard)
 *
 * This function converts:
 * - Empty strings ("") to null
 * - undefined to null
 * - All other values pass through unchanged
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toNullable<T extends Record<string, any>>(obj: T): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = {};
  for (const key in obj) {
    const value = obj[key];
    result[key] = value === "" || value === undefined ? null : value;
  }
  return result;
}
