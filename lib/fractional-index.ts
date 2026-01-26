// Fractional indexing utilities for order calculations
// Uses fractional-indexing library to generate order keys that sort lexicographically
// This enables efficient reordering without updating every item's order value

import { generateKeyBetween } from "fractional-indexing";

/**
 * Calculate an order key between two existing keys.
 * Used when inserting an item between two others.
 *
 * @param before - The order key of the item before, or null if inserting at start
 * @param after - The order key of the item after, or null if inserting at end
 * @returns A new order key that sorts between before and after
 */
export function calculateOrderBetween(
  before: string | null,
  after: string | null
): string {
  return generateKeyBetween(before, after);
}

/**
 * Calculate an order key for inserting at the start of a list.
 * The new key will sort before the first item.
 *
 * @param firstItem - The order key of the current first item, or null if list is empty
 * @returns A new order key that sorts before firstItem
 */
export function calculateOrderAtStart(firstItem: string | null): string {
  return generateKeyBetween(null, firstItem);
}

/**
 * Calculate an order key for inserting at the end of a list.
 * The new key will sort after the last item.
 *
 * @param lastItem - The order key of the current last item, or null if list is empty
 * @returns A new order key that sorts after lastItem
 */
export function calculateOrderAtEnd(lastItem: string | null): string {
  return generateKeyBetween(lastItem, null);
}
