import { test, expect } from "@playwright/test";

test("homepage loads", async ({ page }) => {
  await page.goto("/");
  // Basic test to ensure the app loads
  await expect(page).toHaveTitle(/Job Tracker/i);
});
