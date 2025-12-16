import { test as teardown } from "@playwright/test";
import { cleanupTestUserJobs } from "./helpers/db-cleanup";

teardown("cleanup test data", async () => {
  await cleanupTestUserJobs(process.env.TEST_USER_ID!);
});
