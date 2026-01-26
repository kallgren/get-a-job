import { describe, expect, it } from "vitest";
import {
  calculateOrderBetween,
  calculateOrderAtStart,
  calculateOrderAtEnd,
} from "./fractional-index";

describe("fractional-index utilities", () => {
  describe("calculateOrderBetween", () => {
    it("generates a key between two values", () => {
      // Generate two valid keys using the library
      const before = calculateOrderBetween(null, null);
      const after = calculateOrderAtEnd(before);
      const between = calculateOrderBetween(before, after);

      expect(between > before).toBe(true);
      expect(between < after).toBe(true);
    });

    it("generates a key when before is null (start of list)", () => {
      // Generate a valid key to insert before
      const after = calculateOrderBetween(null, null);
      const result = calculateOrderBetween(null, after);

      expect(result < after).toBe(true);
    });

    it("generates a key when after is null (end of list)", () => {
      // Generate a valid key to insert after
      const before = calculateOrderBetween(null, null);
      const result = calculateOrderBetween(before, null);

      expect(result > before).toBe(true);
    });

    it("generates a key when both are null (empty list)", () => {
      const result = calculateOrderBetween(null, null);

      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("generates unique keys for sequential insertions", () => {
      // Simulate inserting multiple items at the end
      let lastKey: string | null = null;
      const keys: string[] = [];

      for (let i = 0; i < 5; i++) {
        const newKey = calculateOrderBetween(lastKey, null);
        keys.push(newKey);
        lastKey = newKey;
      }

      // All keys should be unique
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(5);

      // Keys should be in ascending order
      for (let i = 0; i < keys.length - 1; i++) {
        expect(keys[i] < keys[i + 1]).toBe(true);
      }
    });

    it("generates keys between close positions", () => {
      // Generate two adjacent keys and then insert between them multiple times
      const a = calculateOrderBetween(null, null);
      const b = calculateOrderBetween(a, null);

      const left = a;
      let right = b;

      // Insert between a and b 10 times
      for (let i = 0; i < 10; i++) {
        const middle = calculateOrderBetween(left, right);
        expect(middle > left).toBe(true);
        expect(middle < right).toBe(true);
        // Move the boundary for next iteration
        right = middle;
      }
    });
  });

  describe("calculateOrderAtStart", () => {
    it("generates a key before the first item", () => {
      // Generate a valid key to use as first item
      const firstItem = calculateOrderBetween(null, null);
      const result = calculateOrderAtStart(firstItem);

      expect(result < firstItem).toBe(true);
    });

    it("generates a key when list is empty (null)", () => {
      const result = calculateOrderAtStart(null);

      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("can generate multiple keys at the start", () => {
      // Start with a valid key
      let currentFirst: string | null = calculateOrderBetween(null, null);
      const keys: string[] = [];

      // Insert 5 items at the start
      for (let i = 0; i < 5; i++) {
        const newKey = calculateOrderAtStart(currentFirst);
        keys.push(newKey);
        currentFirst = newKey;
      }

      // All keys should be unique
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(5);

      // Keys should be in descending order (each new one is smaller)
      for (let i = 0; i < keys.length - 1; i++) {
        expect(keys[i] > keys[i + 1]).toBe(true);
      }
    });
  });

  describe("calculateOrderAtEnd", () => {
    it("generates a key after the last item", () => {
      // Generate a valid key to use as last item
      const lastItem = calculateOrderBetween(null, null);
      const result = calculateOrderAtEnd(lastItem);

      expect(result > lastItem).toBe(true);
    });

    it("generates a key when list is empty (null)", () => {
      const result = calculateOrderAtEnd(null);

      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("can generate multiple keys at the end", () => {
      // Start with a valid key
      let currentLast: string | null = calculateOrderBetween(null, null);
      const keys: string[] = [];

      // Insert 5 items at the end
      for (let i = 0; i < 5; i++) {
        const newKey = calculateOrderAtEnd(currentLast);
        keys.push(newKey);
        currentLast = newKey;
      }

      // All keys should be unique
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(5);

      // Keys should be in ascending order (each new one is larger)
      for (let i = 0; i < keys.length - 1; i++) {
        expect(keys[i] < keys[i + 1]).toBe(true);
      }
    });
  });

  describe("integration scenarios", () => {
    it("maintains correct order after mixed operations", () => {
      // Create initial items
      const first = calculateOrderBetween(null, null);
      const second = calculateOrderAtEnd(first);
      const third = calculateOrderAtEnd(second);

      // Insert between first and second
      const betweenFirstSecond = calculateOrderBetween(first, second);

      // Insert at start
      const newFirst = calculateOrderAtStart(first);

      // Verify all items sort correctly
      const allItems = [first, second, third, betweenFirstSecond, newFirst];
      const sorted = [...allItems].sort();

      expect(sorted[0]).toBe(newFirst);
      expect(sorted[1]).toBe(first);
      expect(sorted[2]).toBe(betweenFirstSecond);
      expect(sorted[3]).toBe(second);
      expect(sorted[4]).toBe(third);
    });

    it("handles many sequential insertions at start without key exhaustion", () => {
      // Stress test: insert many items at the start
      let currentFirst: string | null = null;
      const keys: string[] = [];

      for (let i = 0; i < 100; i++) {
        const newKey = calculateOrderAtStart(currentFirst);
        keys.push(newKey);
        currentFirst = newKey;
      }

      // All 100 keys should be unique
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(100);

      // All keys should sort in descending order (most recent first)
      const sorted = [...keys].sort();
      expect(sorted[0]).toBe(keys[keys.length - 1]); // Last inserted is smallest
      expect(sorted[sorted.length - 1]).toBe(keys[0]); // First inserted is largest
    });
  });
});
