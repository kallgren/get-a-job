import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
