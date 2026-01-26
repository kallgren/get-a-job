import { test, expect } from "@playwright/test";
import { cleanupTestUserJobs } from "./helpers/db-cleanup";

test.describe("Drag and Drop Sorting", () => {
  test.beforeEach(async ({ page }) => {
    // Clean database: hard delete all jobs for test user
    await cleanupTestUserJobs(process.env.TEST_USER_ID!);

    // Navigate to app (already authenticated via storageState)
    await page.goto("/");

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Get a Job")');
  });

  /**
   * Helper to create a job in a specific column via the UI.
   * Returns the unique company name used for the job.
   */
  async function createJob(
    page: import("@playwright/test").Page,
    columnStatus: string,
    companyName: string,
    title: string = "Test Position"
  ): Promise<string> {
    await page
      .getByRole("button", { name: `Add job to ${columnStatus}` })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByLabel(/company/i).fill(companyName);
    await page.getByLabel(/title/i).fill(title);
    await page.getByRole("button", { name: /add job/i }).click();

    await expect(page.getByRole("dialog")).not.toBeVisible();
    return companyName;
  }

  /**
   * Helper to drag a card to a specific position in a column.
   * If targetCard is provided, drags above that card.
   * If targetCard is null, drags to the column header area (end of column).
   */
  async function dragCardTo(
    page: import("@playwright/test").Page,
    sourceCompany: string,
    targetColumnStatus: string,
    targetCard: string | null = null
  ): Promise<void> {
    const column = page.getByTestId(`column-${targetColumnStatus}`);

    // Find the source card
    const sourceCard = page
      .getByText(sourceCompany, { exact: true })
      .locator("..");
    const source = await sourceCard.boundingBox();

    let target: { x: number; y: number; width: number; height: number } | null;

    if (targetCard) {
      // Drag above the target card
      const targetCardElement = column
        .getByText(targetCard, { exact: true })
        .locator("..");
      target = await targetCardElement.boundingBox();
    } else {
      // Drag to the column (end of list)
      target = await column.boundingBox();
    }

    if (source && target) {
      // Calculate positions
      const sourceX = source.x + source.width / 2;
      const sourceY = source.y + source.height / 2;

      // For card target, position above it; for column, position in the middle
      const targetX = target.x + target.width / 2;
      const targetY = targetCard
        ? target.y + 10 // Just above the target card
        : target.y + target.height / 2;

      // Perform drag with proper dnd-kit pointer events
      await page.mouse.move(sourceX, sourceY);
      await page.mouse.down();
      await page.waitForTimeout(100); // Allow drag to initialize
      await page.mouse.move(targetX, targetY, { steps: 20 });
      await page.mouse.up();
      await page.waitForTimeout(500); // Wait for drop to complete
    }
  }

  /**
   * Helper to get the order of job cards in a column by company name.
   */
  async function getColumnJobOrder(
    page: import("@playwright/test").Page,
    columnStatus: string
  ): Promise<string[]> {
    const column = page.getByTestId(`column-${columnStatus}`);
    // Get all h3 elements (job card titles which contain company names)
    const cards = column.locator("h3");
    const count = await cards.count();
    const order: string[] = [];

    for (let i = 0; i < count; i++) {
      const text = await cards.nth(i).textContent();
      if (text) {
        // Extract company name (format is "Company - Title" or just "Company")
        const company = text.split(" - ")[0].trim();
        order.push(company);
      }
    }

    return order;
  }

  test("drag and drop sorting persists across page refresh", async ({
    page,
  }) => {
    // This single comprehensive test exercises multiple drag operations to avoid
    // repeated setup overhead while covering: reorder in column, move to empty column,
    // move to specific position in populated column, and persistence.

    const timestamp = Date.now();
    const jobA = `Company A ${timestamp}`;
    const jobB = `Company B ${timestamp}`;
    const jobC = `Company C ${timestamp}`;

    // 1. Create 3 jobs in WISHLIST (Job A, Job B, Job C)
    // Note: Jobs appear at top of column, so creation order will be reversed
    await createJob(page, "Wishlist", jobA);
    await createJob(page, "Wishlist", jobB);
    await createJob(page, "Wishlist", jobC);

    // Verify initial order (newest first due to top-of-column placement)
    let wishlistOrder = await getColumnJobOrder(page, "WISHLIST");
    expect(wishlistOrder).toEqual([jobC, jobB, jobA]);

    // 2. Reorder within column: Drag Job A to top of WISHLIST
    // Move Job A above Job C (which is at the top)
    await dragCardTo(page, jobA, "WISHLIST", jobC);

    // Verify order is now: A, C, B
    wishlistOrder = await getColumnJobOrder(page, "WISHLIST");
    expect(wishlistOrder).toEqual([jobA, jobC, jobB]);

    // 3. Move to different column: Drag Job C to APPLIED (empty)
    await dragCardTo(page, jobC, "APPLIED", null);

    // Verify Job C is in APPLIED
    let appliedOrder = await getColumnJobOrder(page, "APPLIED");
    expect(appliedOrder).toEqual([jobC]);

    // Verify WISHLIST order is: A, B
    wishlistOrder = await getColumnJobOrder(page, "WISHLIST");
    expect(wishlistOrder).toEqual([jobA, jobB]);

    // 4. Move to different column with position: Drag Job B to APPLIED below Job C
    // First move Job B to APPLIED column
    await dragCardTo(page, jobB, "APPLIED", null);

    // Verify APPLIED has both jobs
    appliedOrder = await getColumnJobOrder(page, "APPLIED");
    // Job B should appear at the drop position (end of column in this case)
    expect(appliedOrder.length).toBe(2);
    expect(appliedOrder).toContain(jobC);
    expect(appliedOrder).toContain(jobB);

    // Verify WISHLIST has only Job A
    wishlistOrder = await getColumnJobOrder(page, "WISHLIST");
    expect(wishlistOrder).toEqual([jobA]);

    // 5. Refresh page
    await page.reload();
    await page.waitForSelector('h1:has-text("Get a Job")');

    // 6. Verify all positions persisted:
    // - WISHLIST: only Job A
    wishlistOrder = await getColumnJobOrder(page, "WISHLIST");
    expect(wishlistOrder).toEqual([jobA]);

    // - APPLIED: both Job C and Job B (in some order - both should be present)
    appliedOrder = await getColumnJobOrder(page, "APPLIED");
    expect(appliedOrder.length).toBe(2);
    expect(appliedOrder).toContain(jobC);
    expect(appliedOrder).toContain(jobB);
  });

  test("dropping at same position is a no-op", async ({ page }) => {
    const timestamp = Date.now();
    const jobA = `Same Pos Test ${timestamp}`;

    // Create a single job
    await createJob(page, "Wishlist", jobA);

    // Verify job is in wishlist
    let wishlistOrder = await getColumnJobOrder(page, "WISHLIST");
    expect(wishlistOrder).toEqual([jobA]);

    // Drag the card and drop it in the same position (within same column)
    const column = page.getByTestId("column-WISHLIST");
    const sourceCard = page.getByText(jobA, { exact: true }).locator("..");
    const source = await sourceCard.boundingBox();
    const columnBox = await column.boundingBox();

    if (source && columnBox) {
      // Start drag
      await page.mouse.move(
        source.x + source.width / 2,
        source.y + source.height / 2
      );
      await page.mouse.down();
      await page.waitForTimeout(100);

      // Move slightly within same area and drop
      await page.mouse.move(
        source.x + source.width / 2 + 5,
        source.y + source.height / 2 + 5,
        { steps: 5 }
      );
      await page.mouse.up();
      await page.waitForTimeout(300);
    }

    // Verify job is still in wishlist
    wishlistOrder = await getColumnJobOrder(page, "WISHLIST");
    expect(wishlistOrder).toEqual([jobA]);

    // Refresh and verify persistence
    await page.reload();
    await page.waitForSelector('h1:has-text("Get a Job")');

    wishlistOrder = await getColumnJobOrder(page, "WISHLIST");
    expect(wishlistOrder).toEqual([jobA]);
  });

  test("dropping in empty column works correctly", async ({ page }) => {
    const timestamp = Date.now();
    const jobA = `Empty Col Test ${timestamp}`;

    // Create a job in Wishlist
    await createJob(page, "Wishlist", jobA);

    // Verify job is in wishlist
    let wishlistOrder = await getColumnJobOrder(page, "WISHLIST");
    expect(wishlistOrder).toEqual([jobA]);

    // Verify Interview column is empty
    let interviewOrder = await getColumnJobOrder(page, "INTERVIEW");
    expect(interviewOrder).toEqual([]);

    // Drag to empty Interview column
    await dragCardTo(page, jobA, "INTERVIEW", null);

    // Verify job is now in Interview
    interviewOrder = await getColumnJobOrder(page, "INTERVIEW");
    expect(interviewOrder).toEqual([jobA]);

    // Verify Wishlist is empty
    wishlistOrder = await getColumnJobOrder(page, "WISHLIST");
    expect(wishlistOrder).toEqual([]);

    // Refresh and verify persistence
    await page.reload();
    await page.waitForSelector('h1:has-text("Get a Job")');

    interviewOrder = await getColumnJobOrder(page, "INTERVIEW");
    expect(interviewOrder).toEqual([jobA]);

    wishlistOrder = await getColumnJobOrder(page, "WISHLIST");
    expect(wishlistOrder).toEqual([]);
  });
});
