import { test, expect } from "@playwright/test";
import { cleanupTestUserJobs } from "./helpers/db-cleanup";
import { EXPORT_FILENAME_PATTERN } from "@/lib/export-import";
import { ExportedJob } from "@/lib/schemas";
import * as fs from "fs";
import * as path from "path";

test.describe("Export/Import", () => {
  test.beforeEach(async ({ page }) => {
    // Clean database: hard delete all jobs for test user
    await cleanupTestUserJobs(process.env.TEST_USER_ID!);

    // Navigate to app (already authenticated via storageState)
    await page.goto("/");

    // Wait for page to load
    await expect(
      page.getByRole("heading", { name: "Get a Job", level: 1 })
    ).toBeVisible();
  });

  test.describe("Export functionality", () => {
    test("exports multiple jobs as JSON with correct format", async ({
      page,
    }) => {
      // Arrange
      // Create job with ALL fields populated
      await page.getByRole("button", { name: "Add job to Wishlist" }).click();
      await page.getByLabel(/company/i).fill("Full Details Company");
      await page.getByLabel(/title/i).fill("Senior Developer");
      await page.getByLabel(/location/i).fill("Stockholm, Sweden");
      await page.getByLabel(/job posting url/i).fill("https://example.com/job");
      await page
        .getByLabel(/job posting text/i)
        .fill("Full job description here");
      await page.getByLabel(/notes/i).fill("Very interested in this role");
      await page.getByLabel(/contact person/i).fill("Jane Doe");
      await page.getByLabel(/date applied/i).fill("2025-01-15");
      await page.getByRole("button", { name: /add job/i }).click();
      await expect(page.getByRole("dialog")).not.toBeVisible();

      // Create job with minimal fields in different status
      await page.getByRole("button", { name: "Add job to Applied" }).click();
      await page.getByLabel(/company/i).fill("Minimal Company");
      await page.getByLabel(/title/i).fill("Developer");
      await page.getByRole("button", { name: /add job/i }).click();
      await expect(page.getByRole("dialog")).not.toBeVisible();

      // Act
      // Export all jobs
      await page.getByRole("button", { name: /export and import/i }).click();
      await expect(page.getByRole("dialog")).toBeVisible();

      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: /export all jobs/i }).click();
      const download = await downloadPromise;

      // Assert
      // Verify filename format
      const filename = download.suggestedFilename();
      expect(filename).toMatch(EXPORT_FILENAME_PATTERN);

      // Verify file contents
      const downloadPath = await download.path();
      const content = fs.readFileSync(downloadPath!, "utf-8");
      const data = JSON.parse(content);

      // Verify array structure
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(2);

      // Verify fully-populated job
      const fullJob = data.find(
        (j: ExportedJob) => j.company === "Full Details Company"
      );
      expect(fullJob).toBeDefined();
      expect(fullJob.title).toBe("Senior Developer");
      expect(fullJob.location).toBe("Stockholm, Sweden");
      expect(fullJob.jobPostingUrl).toBe("https://example.com/job");
      expect(fullJob.jobPostingText).toBe("Full job description here");
      expect(fullJob.notes).toBe("Very interested in this role");
      expect(fullJob.contactPerson).toBe("Jane Doe");
      expect(fullJob.dateApplied).toBe("2025-01-15");
      expect(fullJob.status).toBe("WISHLIST");

      // Verify minimal job
      const minimalJob = data.find(
        (j: ExportedJob) => j.company === "Minimal Company"
      );
      expect(minimalJob).toBeDefined();
      expect(minimalJob.title).toBe("Developer");
      expect(minimalJob.status).toBe("APPLIED");

      // Verify excluded internal fields for both jobs
      for (const job of data) {
        expect(job).not.toHaveProperty("id");
        expect(job).not.toHaveProperty("userId");
        expect(job).not.toHaveProperty("createdAt");
        expect(job).not.toHaveProperty("updatedAt");
        expect(job).not.toHaveProperty("deletedAt");
      }
    });
  });

  test.describe("Import functionality", () => {
    test("imports jobs and replaces existing data", async ({ page }) => {
      // Arrange
      // Create existing job
      await page.getByRole("button", { name: "Add job to Wishlist" }).click();
      await page.getByLabel(/company/i).fill("Old Job");
      await page.getByRole("button", { name: /add job/i }).click();
      await expect(page.getByRole("dialog")).not.toBeVisible();
      await expect(page.getByText("Old Job")).toBeVisible();

      // Create import file with new jobs
      const newJobs = [
        {
          company: "New Job 1",
          title: "Position 1",
          status: "WISHLIST",
          order: "a0",
        },
        {
          company: "New Job 2",
          title: "Position 2",
          status: "APPLIED",
          order: "a1",
        },
      ];

      const exportPath = path.join(__dirname, "fixtures", "import-test.json");
      fs.mkdirSync(path.dirname(exportPath), { recursive: true });
      fs.writeFileSync(exportPath, JSON.stringify(newJobs));

      try {
        // Act
        // Open modal and upload file
        await page.getByRole("button", { name: /export and import/i }).click();
        await page
          .getByRole("dialog")
          .locator('input[type="file"]')
          .setInputFiles(exportPath);

        // Verify preview shows correct counts
        await expect(page.getByText(/ready to import 2 jobs/i)).toBeVisible();
        await expect(page.getByText("import-test.json")).toBeVisible();

        // Handle confirmation dialog
        page.once("dialog", (dialog) => {
          expect(dialog.message()).toContain("Importing will replace");
          expect(dialog.message()).toContain("1 job"); // Current count
          expect(dialog.message()).toContain("2 job"); // New count
          void dialog.accept();
        });

        // Trigger import
        await page.getByRole("button", { name: /^import jobs$/i }).click();

        // Assert
        // Verify modal closes
        await expect(page.getByRole("dialog")).not.toBeVisible();

        // Verify old job is gone and new jobs appear
        await expect(page.getByText("Old Job")).not.toBeVisible();
        await expect(page.getByText("New Job 1")).toBeVisible();
        await expect(page.getByText("New Job 2")).toBeVisible();
      } finally {
        // Cleanup
        if (fs.existsSync(exportPath)) {
          fs.unlinkSync(exportPath);
        }
      }
    });

    test("shows error for invalid JSON file", async ({ page }) => {
      // Arrange
      const invalidPath = path.join(__dirname, "fixtures", "invalid.json");
      fs.mkdirSync(path.dirname(invalidPath), { recursive: true });
      fs.writeFileSync(invalidPath, "not valid json{");

      try {
        // Act
        await page.getByRole("button", { name: /export and import/i }).click();
        await page
          .getByRole("dialog")
          .locator('input[type="file"]')
          .setInputFiles(invalidPath);

        // Assert
        await expect(page.getByText(/invalid json file/i)).toBeVisible();
      } finally {
        if (fs.existsSync(invalidPath)) {
          fs.unlinkSync(invalidPath);
        }
      }
    });

    test("does not import when user cancels confirmation", async ({ page }) => {
      // Arrange
      // Create existing job
      await page.getByRole("button", { name: "Add job to Wishlist" }).click();
      await page.getByLabel(/company/i).fill("Existing Job");
      await page.getByRole("button", { name: /add job/i }).click();
      await expect(page.getByRole("dialog")).not.toBeVisible();

      const testJobs = [
        { company: "Should Not Import", status: "WISHLIST", order: "0" },
      ];

      const exportPath = path.join(__dirname, "fixtures", "cancel-test.json");
      fs.mkdirSync(path.dirname(exportPath), { recursive: true });
      fs.writeFileSync(exportPath, JSON.stringify(testJobs));

      try {
        await page.getByRole("button", { name: /export and import/i }).click();
        await page
          .getByRole("dialog")
          .locator('input[type="file"]')
          .setInputFiles(exportPath);

        // Act
        // Cancel the confirmation
        page.once("dialog", (dialog) => {
          void dialog.dismiss();
        });

        await page.getByRole("button", { name: /^import jobs$/i }).click();

        // Assert
        // Modal should still be open
        await expect(page.getByRole("dialog")).toBeVisible();

        // Close modal manually by clicking close button
        await page.getByRole("button", { name: /close/i }).click();
        await expect(page.getByRole("dialog")).not.toBeVisible();

        // Verify original job still exists, new job not imported
        await expect(page.getByText("Existing Job")).toBeVisible();
        await expect(page.getByText("Should Not Import")).not.toBeVisible();
      } finally {
        if (fs.existsSync(exportPath)) {
          fs.unlinkSync(exportPath);
        }
      }
    });
  });

  test.describe("Keyboard accessibility", () => {
    test("opens modal when Export button activated with Enter", async ({
      page,
    }) => {
      // Arrange
      // Find and focus the Export button
      const exportButton = page.getByRole("button", {
        name: /export and import/i,
      });
      await exportButton.focus();

      // Act
      await page.keyboard.press("Enter");

      // Assert
      await expect(page.getByRole("dialog")).toBeVisible();
    });

    test("closes modal with Escape key", async ({ page }) => {
      // Arrange
      await page.getByRole("button", { name: /export and import/i }).click();
      await expect(page.getByRole("dialog")).toBeVisible();

      // Act
      await page.keyboard.press("Escape");

      // Assert
      await expect(page.getByRole("dialog")).not.toBeVisible();
    });

    test("traps focus within modal", async ({ page }) => {
      // Arrange
      await page.getByRole("button", { name: /export and import/i }).click();

      // Act
      // Tab through all focusable elements in modal
      const modalButtons = await page
        .getByRole("dialog")
        .getByRole("button")
        .all();

      // Tab through all buttons plus one more cycle
      for (let i = 0; i < modalButtons.length + 1; i++) {
        await page.keyboard.press("Tab");
      }

      // Assert
      const focusIsInDialog = await page.evaluate(() => {
        return document.activeElement?.closest('[role="dialog"]') !== null;
      });

      expect(focusIsInDialog).toBe(true);
    });

    test("has proper ARIA labels on modal", async ({ page }) => {
      // Act
      await page.getByRole("button", { name: /export and import/i }).click();

      // Assert
      const dialog = page.getByRole("dialog");
      await expect(dialog).toHaveAttribute("aria-labelledby");
    });

    test("downloads file when Export button activated with Enter", async ({
      page,
    }) => {
      // Arrange
      await page.getByRole("button", { name: /export and import/i }).click();

      const exportButton = page.getByRole("button", {
        name: /export all jobs/i,
      });
      await exportButton.focus();

      // Act
      const downloadPromise = page.waitForEvent("download");
      await page.keyboard.press("Enter");
      const download = await downloadPromise;

      // Assert
      expect(download.suggestedFilename()).toMatch(/\.json$/);
    });
  });

  test.describe("Round-trip (export then import)", () => {
    test("successfully exports and re-imports jobs", async ({ page }) => {
      // Arrange
      // Create test jobs
      const jobs = [
        { company: "Round Trip A", title: "Dev A" },
        { company: "Round Trip B", title: "Dev B" },
      ];

      for (const job of jobs) {
        await page.getByRole("button", { name: "Add job to Wishlist" }).click();
        await page.getByLabel(/company/i).fill(job.company);
        await page.getByLabel(/title/i).fill(job.title);
        await page.getByRole("button", { name: /add job/i }).click();
        await expect(page.getByRole("dialog")).not.toBeVisible();
      }

      const exportPath = path.join(
        __dirname,
        "fixtures",
        "round-trip-export.json"
      );
      fs.mkdirSync(path.dirname(exportPath), { recursive: true });

      try {
        // Act
        // Export
        await page.getByRole("button", { name: /export and import/i }).click();
        const downloadPromise = page.waitForEvent("download");
        await page.getByRole("button", { name: /export all jobs/i }).click();
        const download = await downloadPromise;

        // Save to a specific path with .json extension
        await download.saveAs(exportPath);

        // Close modal
        await page.keyboard.press("Escape");

        // Delete jobs
        await cleanupTestUserJobs(process.env.TEST_USER_ID!);
        await page.reload();
        await expect(
          page.getByRole("heading", { name: "Get a Job", level: 1 })
        ).toBeVisible();

        // Verify no jobs
        await expect(page.getByText("Round Trip A")).not.toBeVisible();

        // Re-import
        await page.getByRole("button", { name: /export and import/i }).click();
        await page
          .getByRole("dialog")
          .locator('input[type="file"]')
          .setInputFiles(exportPath);

        page.once("dialog", (dialog) => {
          void dialog.accept();
        });

        await page.getByRole("button", { name: /^import jobs$/i }).click();

        // Assert
        // Verify modal closes
        await expect(page.getByRole("dialog")).not.toBeVisible();

        // Verify jobs are back
        await expect(page.getByText("Round Trip A")).toBeVisible();
        await expect(page.getByText("Round Trip B")).toBeVisible();
      } finally {
        // Cleanup
        if (fs.existsSync(exportPath)) {
          fs.unlinkSync(exportPath);
        }
      }
    });
  });
});
