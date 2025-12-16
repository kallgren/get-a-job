import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";

// Setup must be run serially, this is necessary if Playwright is configured to run fully parallel: https://playwright.dev/docs/test-parallel
setup.describe.configure({ mode: "serial" });

const authFile = "playwright/.auth/user.json";

setup("global setup", async ({}) => {
  await clerkSetup();
});

setup("authenticate", async ({ page }) => {
  // Set up Clerk testing token to bypass bot protection
  await setupClerkTestingToken({ page });

  // Navigate to the app (will redirect to sign-in)
  await page.goto("/");
  await page.waitForURL("**/sign-in**");

  // Step 1: Fill in email and continue
  await page.getByLabel("Email address").fill(process.env.TEST_USER_EMAIL!);
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 2: Fill password and continue
  await page.waitForSelector('input[name="password"]');
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 3: Enter verification code
  await page.waitForSelector('input[autocomplete="one-time-code"]');
  await page.getByLabel("Enter verification code").pressSequentially("424242");

  // Wait for auth completion
  await page.waitForSelector('h1:has-text("Job Tracker")');

  // Save authenticated state to file for reuse
  await page.context().storageState({ path: authFile });
});
