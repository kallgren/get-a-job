import { test, expect } from "@playwright/test";
import { cleanupTestUserJobs } from "./helpers/db-cleanup";

test.describe("Job Board", () => {
  test.beforeEach(async ({ page }) => {
    // Clean database: hard delete all jobs for test user
    await cleanupTestUserJobs(process.env.TEST_USER_ID!);

    // Navigate to app (already authenticated via storageState)
    await page.goto("/");

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Job Tracker")');
  });

  test("should display the job board with status columns", async ({ page }) => {
    // Verify all status columns are present
    // Use level: 2 to specifically target h2 column headings (not h3 job card titles)
    await expect(
      page.getByRole("heading", { name: "Wishlist", level: 2 })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Applied", level: 2 })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Interview", level: 2 })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Offer", level: 2 })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Accepted", level: 2 })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Rejected", level: 2 })
    ).toBeVisible();
  });

  test("should create a new job", async ({ page }) => {
    // Click the "+" button in the Wishlist column
    await page.getByRole("button", { name: "Add job to Wishlist" }).click();

    // Verify modal opens
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Add New Job" })
    ).toBeVisible();

    // Fill in the form
    await page.getByLabel(/company/i).fill("Acme Corp");
    await page.getByLabel(/title/i).fill("Senior Developer");
    await page.getByLabel(/location/i).fill("Stockholm");
    await page.getByLabel(/job posting url/i).fill("https://jobs.acme.com/123");

    // Open status combobox and select option
    await page.getByLabel(/status/i).click();
    await page.getByRole("option", { name: "Wishlist" }).click();

    // Submit the form
    await page.getByRole("button", { name: /add job/i }).click();

    // Verify modal closes
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // Verify the job card appears in the Wishlist column
    const wishlistColumn = page
      .locator("div")
      .filter({ hasText: /^Wishlist/ })
      .first();
    await expect(
      wishlistColumn.getByText("Acme Corp", { exact: true })
    ).toBeVisible();
    await expect(wishlistColumn.getByText("Senior Developer")).toBeVisible();
  });

  test("should create a job in specific column using column add button", async ({
    page,
  }) => {
    // Use unique company name to avoid conflicts with parallel tests
    const uniqueCompany = `Applied Test ${Date.now()}`;

    // Click the "+" button in the Applied column
    await page.getByRole("button", { name: "Add job to Applied" }).click();

    // Verify modal opens
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Add New Job" })
    ).toBeVisible();

    // Fill in the form
    await page.getByLabel(/company/i).fill(uniqueCompany);
    await page.getByLabel(/title/i).fill("Backend Engineer");
    await page.getByLabel(/location/i).fill("Gothenburg");

    // Verify that "Applied" status is pre-selected in the dropdown
    // The Select component shows the selected value in the trigger button
    const statusTrigger = page.getByRole("combobox", { name: /status/i });
    await expect(statusTrigger).toContainText("Applied");

    // Submit the form without changing status
    await page.getByRole("button", { name: /add job/i }).click();

    // Verify modal closes
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // Verify the job card appears in the Applied column (not Wishlist)
    const appliedColumn = page.getByTestId("column-APPLIED");
    await expect(
      appliedColumn.getByText(uniqueCompany, { exact: true })
    ).toBeVisible();
    await expect(appliedColumn.getByText("Backend Engineer")).toBeVisible();

    // Verify it's NOT in the Wishlist column
    const wishlistColumn = page.getByTestId("column-WISHLIST");
    await expect(
      wishlistColumn.getByText(uniqueCompany, { exact: true })
    ).not.toBeVisible();
  });

  test("should edit a job by clicking the card", async ({ page }) => {
    // Use unique company name to avoid conflicts with parallel tests
    const uniqueCompany = `Edit Test Co ${Date.now()}`;

    // First, create a job to edit
    await page.getByRole("button", { name: "Add job to Wishlist" }).click();
    await page.getByLabel(/company/i).fill(uniqueCompany);
    await page.getByLabel(/title/i).fill("Test Position");
    await page.getByRole("button", { name: /add job/i }).click();

    // Wait for modal to close
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // Click on the job card (stationary click, not drag)
    await page.getByText(uniqueCompany).click();

    // Verify edit modal opens with existing data
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Edit Job" })).toBeVisible();
    await expect(page.getByLabel(/company/i)).toHaveValue(uniqueCompany);
    await expect(page.getByLabel(/title/i)).toHaveValue("Test Position");

    // Edit the company name
    const updatedName = `${uniqueCompany} Updated`;
    await page.getByLabel(/company/i).fill(updatedName);

    // Save changes
    await page.getByRole("button", { name: /update job|save/i }).click();

    // Verify modal closes and changes are reflected
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByText(updatedName)).toBeVisible();
    await expect(
      page.getByText(uniqueCompany, { exact: true })
    ).not.toBeVisible();
  });

  test("should move job between columns via drag and drop", async ({
    page,
  }) => {
    // Use unique company name to avoid conflicts with parallel tests
    const uniqueCompany = `Drag Test ${Date.now()}`;

    // First, create a job in Wishlist
    await page.getByRole("button", { name: "Add job to Wishlist" }).click();
    await page.getByLabel(/company/i).fill(uniqueCompany);
    await page.getByLabel(/title/i).fill("Test Role");

    // Open status combobox and select Wishlist
    await page.getByLabel(/status/i).click();
    await page.getByRole("option", { name: "Wishlist" }).click();

    await page.getByRole("button", { name: /add job/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // Locate columns by test ID
    const wishlistColumn = page.getByTestId("column-WISHLIST");
    const appliedColumn = page.getByTestId("column-APPLIED");

    // Find the job card in Wishlist
    const jobCard = wishlistColumn.getByText(uniqueCompany).locator("..");

    // Perform drag and drop with proper pointer events for dnd-kit
    const source = await jobCard.boundingBox();
    const target = await appliedColumn.boundingBox();

    if (source && target) {
      // Move to source, press, move significantly (>2px to trigger drag), release
      await page.mouse.move(
        source.x + source.width / 2,
        source.y + source.height / 2
      );
      await page.mouse.down();
      // Add a small delay to ensure pointer down is registered
      await page.waitForTimeout(100);
      // Move to target (this should trigger drag with >2px movement)
      await page.mouse.move(
        target.x + target.width / 2,
        target.y + target.height / 2,
        { steps: 20 }
      );
      await page.mouse.up();
      // Wait for the drop operation to complete and UI to update
      await page.waitForTimeout(500);
    }

    // Re-locate columns after drag (DOM may have updated)
    const wishlistAfter = page.getByTestId("column-WISHLIST");
    const appliedAfter = page.getByTestId("column-APPLIED");

    // Verify the job moved to Applied column
    await expect(
      appliedAfter.getByText(uniqueCompany, { exact: true })
    ).toBeVisible();

    // Verify it's no longer in Wishlist column
    await expect(
      wishlistAfter.getByText(uniqueCompany, { exact: true })
    ).not.toBeVisible();
  });

  test("should delete a job", async ({ page }) => {
    const uniqueCompany = `Delete Test ${Date.now()}`;

    // Create a job to delete
    await page.getByRole("button", { name: "Add job to Wishlist" }).click();
    await page.getByLabel(/company/i).fill(uniqueCompany);
    await page.getByLabel(/title/i).fill("Temporary Position");
    await page.getByRole("button", { name: /add job/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // Verify job appears on board
    await expect(page.getByText(uniqueCompany)).toBeVisible();

    // Set up dialog handler to accept the confirm dialog
    page.once("dialog", (dialog) => {
      expect(dialog.type()).toBe("confirm");
      expect(dialog.message()).toContain(uniqueCompany);
      dialog.accept();
    });

    // Open edit modal and click delete
    await page.getByText(uniqueCompany).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: /delete/i }).click();

    // Verify modal closes and job is removed
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByText(uniqueCompany)).not.toBeVisible();
  });
});
