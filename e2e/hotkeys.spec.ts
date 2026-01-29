import { test, expect } from "@playwright/test";
import { cleanupTestUserJobs } from "./helpers/db-cleanup";

test.describe("Keyboard Hotkeys", () => {
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

  test.describe("Theme toggle hotkey", () => {
    test("pressing 'd' cycles the theme", async ({ page }) => {
      // Get initial theme class from <html> element
      const getThemeClass = async () => {
        return await page.evaluate(() => {
          return document.documentElement.classList.contains("dark")
            ? "dark"
            : "light";
        });
      };

      const initialTheme = await getThemeClass();

      // Press 'd' to toggle theme
      await page.keyboard.press("d");

      // Wait for theme change to be applied
      await page.waitForTimeout(100);

      const newTheme = await getThemeClass();

      // Theme should have changed (light -> dark, or dark -> light depending on system preference)
      // Since theme cycles light -> dark -> system -> light, we just verify it changed
      expect(newTheme).not.toBe(initialTheme);
    });

    test("pressing 'D' (uppercase) also works", async ({ page }) => {
      const getThemeClass = async () => {
        return await page.evaluate(() => {
          return document.documentElement.classList.contains("dark")
            ? "dark"
            : "light";
        });
      };

      const initialTheme = await getThemeClass();

      // Press 'D' (shift+d) to toggle theme
      await page.keyboard.press("Shift+d");

      await page.waitForTimeout(100);

      const newTheme = await getThemeClass();
      expect(newTheme).not.toBe(initialTheme);
    });
  });

  test.describe("Add job hotkey", () => {
    test("pressing 'a' opens the add job modal with Wishlist status", async ({
      page,
    }) => {
      // Verify modal is not open
      await expect(page.getByRole("dialog")).not.toBeVisible();

      // Press 'a' to open add job modal
      await page.keyboard.press("a");

      // Verify modal opens
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "New Job" })
      ).toBeVisible();

      // Verify status is pre-selected to Wishlist
      const statusTrigger = page.getByRole("combobox", { name: /status/i });
      await expect(statusTrigger).toContainText("Wishlist");
    });

    test("pressing 'A' (uppercase) also opens add job modal", async ({
      page,
    }) => {
      await expect(page.getByRole("dialog")).not.toBeVisible();

      // Press 'A' (shift+a)
      await page.keyboard.press("Shift+a");

      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "New Job" })
      ).toBeVisible();
    });
  });

  test.describe("Export/import hotkey", () => {
    test("pressing 'x' opens the export/import modal", async ({ page }) => {
      // Verify modal is not open
      await expect(page.getByRole("dialog")).not.toBeVisible();

      // Press 'x' to open export/import modal
      await page.keyboard.press("x");

      // Verify modal opens
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: /export.*import/i })
      ).toBeVisible();
    });

    test("pressing 'X' (uppercase) also opens export/import modal", async ({
      page,
    }) => {
      await expect(page.getByRole("dialog")).not.toBeVisible();

      // Press 'X' (shift+x)
      await page.keyboard.press("Shift+x");

      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: /export.*import/i })
      ).toBeVisible();
    });
  });

  test.describe("Hotkeys disabled in input fields", () => {
    test("pressing 'd' does not toggle theme when input is focused", async ({
      page,
    }) => {
      // Open add job modal to get access to input fields
      await page.getByRole("button", { name: "Add job to Wishlist" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();

      // Focus the company input field
      const companyInput = page.getByLabel(/company/i);
      await companyInput.focus();

      // Get initial theme
      const getThemeClass = async () => {
        return await page.evaluate(() => {
          return document.documentElement.classList.contains("dark")
            ? "dark"
            : "light";
        });
      };

      const initialTheme = await getThemeClass();

      // Type 'd' in the input
      await page.keyboard.type("d");

      await page.waitForTimeout(100);

      const newTheme = await getThemeClass();

      // Theme should NOT have changed
      expect(newTheme).toBe(initialTheme);

      // Verify 'd' was typed into the input instead
      await expect(companyInput).toHaveValue("d");
    });

    test("pressing 'a' does not open second modal when typing in input", async ({
      page,
    }) => {
      // Open add job modal first
      await page.getByRole("button", { name: "Add job to Wishlist" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();

      // Focus the company input
      const companyInput = page.getByLabel(/company/i);
      await companyInput.focus();

      // Type 'a' which should go into the input, not trigger hotkey
      await page.keyboard.type("a");

      // Verify only one dialog is open (the one we already opened)
      const dialogs = page.getByRole("dialog");
      await expect(dialogs).toHaveCount(1);

      // Verify 'a' was typed into the input
      await expect(companyInput).toHaveValue("a");
    });

    test("pressing 'x' does not open export modal when textarea is focused", async ({
      page,
    }) => {
      // Open add job modal to access a textarea
      await page.getByRole("button", { name: "Add job to Wishlist" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();

      // Focus the notes textarea (which should be available in the form)
      const notesTextarea = page.getByLabel(/notes/i);
      await notesTextarea.focus();

      // Type 'x' which should go into the textarea, not trigger export modal
      await page.keyboard.type("x");

      // Verify only the add job dialog is open, not the export modal
      const dialogs = page.getByRole("dialog");
      await expect(dialogs).toHaveCount(1);

      // The dialog should still be the "New Job" dialog, not export/import
      await expect(
        page.getByRole("heading", { name: "New Job" })
      ).toBeVisible();

      // Verify 'x' was typed into the textarea
      await expect(notesTextarea).toHaveValue("x");
    });
  });

  test.describe("Hotkey hints visibility", () => {
    test("hotkey hints are visible on the page", async ({ page }) => {
      // Verify [D] hint is visible near theme toggle
      await expect(page.getByText("D", { exact: true })).toBeVisible();

      // Verify [X] hint is visible near export button
      await expect(page.getByText("X", { exact: true })).toBeVisible();

      // Verify [A] hint is visible near Wishlist add button
      await expect(page.getByText("A", { exact: true })).toBeVisible();
    });
  });
});
