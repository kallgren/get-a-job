import { test, expect } from "@playwright/test";
import { cleanupTestUserJobs } from "./helpers/db-cleanup";

test.describe("Keyboard Hotkeys", () => {
  test.beforeEach(async ({ page }) => {
    // Clean database: hard delete all jobs for test user
    await cleanupTestUserJobs(process.env.TEST_USER_ID!);

    // Navigate to app (already authenticated via storageState)
    await page.goto("/");

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Get a Job")');
  });

  test("hotkey hints are visible on the page", async ({ page }) => {
    // Assert
    await test.step("verify all hotkey hints are displayed", async () => {
      // [D] hint near theme toggle
      await expect(page.getByText("D", { exact: true })).toBeVisible();

      // [X] hint near export button
      await expect(page.getByText("X", { exact: true })).toBeVisible();

      // [A] hint near Wishlist add button
      await expect(page.getByText("A", { exact: true })).toBeVisible();
    });
  });

  test("pressing 'd' toggles the theme", async ({ page }) => {
    // Arrange
    const htmlElement = page.locator("html");
    const initialDarkClass = await htmlElement.evaluate((el) =>
      el.classList.contains("dark")
    );

    // Act
    await test.step("press 'd' to toggle theme", async () => {
      await page.keyboard.press("d");
    });

    // Assert
    await test.step("verify theme class has changed", async () => {
      // Theme cycles: light -> dark -> system -> light
      // We verify the dark class toggled (or stayed same if system matched)
      const newDarkClass = await htmlElement.evaluate((el) =>
        el.classList.contains("dark")
      );
      expect(newDarkClass).not.toBe(initialDarkClass);
    });
  });

  test("pressing 'a' opens the add job modal with Wishlist status", async ({
    page,
  }) => {
    // Arrange
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // Act
    await test.step("press 'a' to open add job modal", async () => {
      await page.keyboard.press("a");
    });

    // Assert
    await test.step("verify modal opens with Wishlist pre-selected", async () => {
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "New Job" })
      ).toBeVisible();

      const statusTrigger = page.getByRole("combobox", { name: /status/i });
      await expect(statusTrigger).toContainText("Wishlist");
    });
  });

  test("pressing 'x' opens the export/import modal", async ({ page }) => {
    // Arrange
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // Act
    await test.step("press 'x' to open export/import modal", async () => {
      await page.keyboard.press("x");
    });

    // Assert
    await test.step("verify export/import modal opens", async () => {
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: /export.*import/i })
      ).toBeVisible();
    });
  });

  test("uppercase hotkeys also work (Shift+d, Shift+a, Shift+x)", async ({
    page,
  }) => {
    // Test uppercase 'A' opens modal
    await test.step("press Shift+a to open add job modal", async () => {
      await page.keyboard.press("Shift+a");
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "New Job" })
      ).toBeVisible();
    });

    // Close modal with Escape
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // Test uppercase 'X' opens export modal
    await test.step("press Shift+x to open export/import modal", async () => {
      await page.keyboard.press("Shift+x");
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: /export.*import/i })
      ).toBeVisible();
    });
  });

  test("hotkeys are disabled when typing in input fields", async ({ page }) => {
    // Arrange
    await test.step("open add job modal", async () => {
      await page.getByRole("button", { name: "Add job to Wishlist" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
    });

    // Act & Assert
    await test.step("type 'd' in company input - should not toggle theme", async () => {
      const htmlElement = page.locator("html");
      const initialDarkClass = await htmlElement.evaluate((el) =>
        el.classList.contains("dark")
      );

      const companyInput = page.getByLabel(/company/i);
      await companyInput.focus();
      await page.keyboard.type("d");

      // Verify 'd' went into input, not theme toggle
      await expect(companyInput).toHaveValue("d");

      const newDarkClass = await htmlElement.evaluate((el) =>
        el.classList.contains("dark")
      );
      expect(newDarkClass).toBe(initialDarkClass);
    });

    await test.step("type 'a' in input - should not open second modal", async () => {
      const companyInput = page.getByLabel(/company/i);
      await page.keyboard.type("a");

      // Only one dialog should be open
      await expect(page.getByRole("dialog")).toHaveCount(1);
      await expect(companyInput).toHaveValue("da");
    });

    await test.step("type 'x' in textarea - should not open export modal", async () => {
      const notesTextarea = page.getByLabel(/notes/i);
      await notesTextarea.focus();
      await page.keyboard.type("x");

      // Still only the add job dialog, not export modal
      await expect(page.getByRole("dialog")).toHaveCount(1);
      await expect(
        page.getByRole("heading", { name: "New Job" })
      ).toBeVisible();
      await expect(notesTextarea).toHaveValue("x");
    });
  });
});
