import { test, expect } from "@playwright/test";
import { cleanupTestUserJobs } from "./helpers/db-cleanup";

test.describe("Job Board", () => {
  test.beforeEach(async ({ page }) => {
    // Clean database: hard delete all jobs for test user
    await cleanupTestUserJobs(process.env.TEST_USER_ID!);

    // Navigate to app (already authenticated via storageState)
    await page.goto("/");

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Get a Job")');
  });

  test("creates a new job with all fields in correct column", async ({
    page,
  }) => {
    const companyValue = `Acme Corp ${Date.now()}`;
    const titleValue = "Senior Developer";
    const locationValue = "Stockholm";
    const jobPostingUrlValue = "https://jobs.acme.com/123";
    const jobPostingTextValue = "This is the original job posting text";
    const notesValue = "These are some personal notes";
    const contactPersonValue = "Important Person";
    const resumeUrlValue = "https://drive.google.com/files/resume.pdf";
    const coverletterUrlValue =
      "https://drive.google.com/files/coverletter.pdf";
    const dateAppliedValue = "2025-12-15";
    const formattedDateAppliedValue = "15/12 2025";

    // Arrange
    await test.step('open "add job" modal', async () => {
      await page.getByRole("button", { name: "Add job to Applied" }).click();

      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "New Job" })
      ).toBeVisible();
    });

    // Act
    await test.step("fill form and submit", async () => {
      await page.getByLabel(/company/i).fill(companyValue);
      await page.getByLabel(/title/i).fill(titleValue);
      await page.getByLabel(/location/i).fill(locationValue);
      await page.getByLabel(/job posting url/i).fill(jobPostingUrlValue);
      await page.getByLabel(/description/i).fill(jobPostingTextValue);
      await page.getByLabel(/personal notes/i).fill(notesValue);
      await page.getByLabel(/contact person/i).fill(contactPersonValue);
      await page.getByLabel(/resume url/i).fill(resumeUrlValue);
      await page.getByLabel(/cover letter url/i).fill(coverletterUrlValue);
      await page.getByLabel(/date applied/i).fill(dateAppliedValue);

      const statusTrigger = page.getByRole("combobox", { name: /status/i });
      await expect(statusTrigger).toContainText("Applied");

      await page.getByRole("button", { name: "Add Job" }).click();
      await expect(page.getByRole("dialog")).not.toBeVisible();
    });

    // Assert
    await test.step("verify the job card appears in the correct column", async () => {
      const appliedColumn = page.getByTestId("column-APPLIED");
      await expect(
        appliedColumn.getByText(companyValue, { exact: true })
      ).toBeVisible();
      await expect(appliedColumn.getByText(titleValue)).toBeVisible();

      const wishlistColumn = page.getByTestId("column-WISHLIST");
      await expect(
        wishlistColumn.getByText(companyValue, { exact: true })
      ).not.toBeVisible();
    });

    await test.step("reopen the job and verify all the data is displayed", async () => {
      await page.getByText(companyValue).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText(companyValue)).toBeVisible();
      await expect(dialog.getByText(titleValue)).toBeVisible();
      await expect(dialog.getByText(locationValue)).toBeVisible();
      await expect(dialog.getByText(jobPostingUrlValue)).toBeVisible();
      await expect(dialog.getByText(jobPostingTextValue)).toBeVisible();
      await expect(dialog.getByText(notesValue)).toBeVisible();
      await expect(dialog.getByText(contactPersonValue)).toBeVisible();
      await expect(dialog.getByText(resumeUrlValue)).toBeVisible();
      await expect(dialog.getByText(coverletterUrlValue)).toBeVisible();
      await expect(dialog.getByText(formattedDateAppliedValue)).toBeVisible();
    });
  });

  test("edits a job and saves changes", async ({ page }) => {
    const companyValue = `Edit Test Co ${Date.now()}`;
    const updatedCompanyValue = `${companyValue} Updated`;
    const titleValue = "Senior Developer";

    // Arrange
    await test.step("create a new job", async () => {
      await page.getByRole("button", { name: "Add job to Wishlist" }).click();

      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "New Job" })
      ).toBeVisible();
      await page.getByLabel(/company/i).fill(companyValue);
      await page.getByLabel(/title/i).fill(titleValue);

      await page.getByRole("button", { name: "Add Job" }).click();
      await expect(page.getByRole("dialog")).not.toBeVisible();
    });

    // Act
    await test.step("reopen job in edit mode", async () => {
      await page.getByText(companyValue).click();

      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: `${companyValue} - ${titleValue}` })
      ).toBeVisible();

      await page.getByRole("button", { name: "Edit job" }).click();

      await expect(
        page.getByRole("heading", { name: "Edit Job" })
      ).toBeVisible();
      await expect(page.getByLabel(/company/i)).toHaveValue(companyValue);
      await expect(page.getByLabel(/title/i)).toHaveValue(titleValue);
    });

    await test.step("make edit and save changes", async () => {
      await page.getByLabel(/company/i).fill(updatedCompanyValue);

      await page.getByRole("button", { name: "Update Job" }).click();
      await expect(page.getByRole("dialog")).not.toBeVisible();
    });

    // Assert
    await test.step("verify changes are reflected on the board", async () => {
      await expect(page.getByText(updatedCompanyValue)).toBeVisible();
      await expect(
        page.getByText(companyValue, { exact: true })
      ).not.toBeVisible();
    });
  });

  test("moves a job between columns via drag and drop", async ({ page }) => {
    const companyValue = `Drag Test ${Date.now()}`;
    const titleValue = "Test Role";

    // Arrange
    await test.step("create a new job in wishlist", async () => {
      await page.getByRole("button", { name: "Add job to Wishlist" }).click();
      await page.getByLabel(/company/i).fill(companyValue);
      await page.getByLabel(/title/i).fill(titleValue);

      await page.getByRole("button", { name: "Add Job" }).click();
      await expect(page.getByRole("dialog")).not.toBeVisible();
    });

    // Act
    await test.step("drag the card to applied", async () => {
      const wishlistColumn = page.getByTestId("column-WISHLIST");
      const appliedColumn = page.getByTestId("column-APPLIED");

      const jobCard = wishlistColumn.getByText(companyValue).locator("..");

      // Perform drag and drop with proper pointer events for dnd-kit
      const source = await jobCard.boundingBox();
      const target = await appliedColumn.boundingBox();

      if (source && target) {
        // Move to source, press, move significantly (>1px to trigger drag), release
        await page.mouse.move(
          source.x + source.width / 2,
          source.y + source.height / 2
        );
        await page.mouse.down();
        // Add a small delay to ensure pointer down is registered
        await page.waitForTimeout(100);
        // Move to target (this should trigger drag with >1px movement)
        await page.mouse.move(
          target.x + target.width / 2,
          target.y + target.height / 2,
          { steps: 20 }
        );
        await page.mouse.up();
        // Wait for the drop operation to complete and UI to update
        await page.waitForTimeout(500);
      }
    });

    // Assert
    await test.step("verify card has been moved correctly", async () => {
      const wishlistAfter = page.getByTestId("column-WISHLIST");
      const appliedAfter = page.getByTestId("column-APPLIED");

      await expect(
        appliedAfter.getByText(companyValue, { exact: true })
      ).toBeVisible();
      await expect(
        wishlistAfter.getByText(companyValue, { exact: true })
      ).not.toBeVisible();
    });
  });

  test("deletes a job successfully", async ({ page }) => {
    const companyValue = `Delete Test ${Date.now()}`;

    // Arrange
    await test.step("create a new job in wishlist", async () => {
      await page.getByRole("button", { name: "Add job to Wishlist" }).click();
      await page.getByLabel(/company/i).fill(companyValue);

      await page.getByRole("button", { name: "Add Job" }).click();
      await expect(page.getByRole("dialog")).not.toBeVisible();
      await expect(page.getByText(companyValue)).toBeVisible();
    });

    // Set up dialog handler to accept the confirm dialog
    page.once("dialog", (dialog) => {
      expect(dialog.type()).toBe("confirm");
      expect(dialog.message()).toContain(companyValue);
      dialog.accept();
    });

    // Act
    await test.step("open modal and delete the job", async () => {
      await page.getByText(companyValue).click();
      await expect(page.getByRole("dialog")).toBeVisible();

      await page.getByRole("button", { name: "Edit job" }).click();
      await page.getByRole("button", { name: "Delete" }).click();
    });

    // Assert
    await test.step("verify modal closes and job is no longer visible on board", async () => {
      await expect(page.getByRole("dialog")).not.toBeVisible();
      await expect(page.getByText(companyValue)).not.toBeVisible();
    });
  });
});
