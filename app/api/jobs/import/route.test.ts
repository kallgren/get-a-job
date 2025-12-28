import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    job: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockAuth = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockTransaction = any;

// Test helpers
const TEST_USER_ID = "user_123";

const mockAuth = (userId: string | null = TEST_USER_ID) => {
  vi.mocked(auth).mockResolvedValue({ userId } as MockAuth);
};

const createRequest = (body: unknown) =>
  new Request("http://test/api/jobs/import", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const mockSuccessfulImport = (deletedCount: number, createdCount: number) => {
  vi.mocked(prisma.$transaction).mockResolvedValue([
    { count: deletedCount }, // deleted existing jobs
    { count: createdCount }, // created new jobs
  ] as MockTransaction);
};

// Comprehensive test data covering all fields
const COMPREHENSIVE_JOBS = [
  {
    company: "Acme Corp",
    title: "Senior Developer",
    location: "Stockholm",
    status: "INTERVIEW",
    order: "a0",
    dateApplied: "2024-01-15",
    jobPostingUrl: "https://acme.com/jobs/123",
    jobPostingText: "We are looking for a senior developer...",
    notes: "Phone interview scheduled for next week",
    contactPerson: "Jane Smith",
    resumeUrl: "https://drive.google.com/resume",
    coverLetterUrl: "https://drive.google.com/cover",
  },
  { company: "Tech Startup", status: "WISHLIST", order: "a1" },
  {
    company: "Big Company",
    title: "Developer",
    status: "APPLIED",
    order: "a2",
    dateApplied: "2024-02-01",
  },
];

describe("POST /api/jobs/import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    // Arrange
    mockAuth(null);

    // Act
    const response = await POST(createRequest({ jobs: [] }));

    // Assert
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid request body", async () => {
    // Arrange
    mockAuth();

    // Act
    const response = await POST(createRequest({ invalid: "data" }));
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid job data");
    expect(data.details).toBeDefined();
  });

  it("returns 400 if any job in array is invalid", async () => {
    // Arrange
    mockAuth();

    // Act
    const response = await POST(
      createRequest({
        jobs: [
          { company: "Valid Company 1", status: "WISHLIST", order: "0" },
          { status: "APPLIED", order: "1" }, // Missing required company field
          { company: "Valid Company 2", status: "INTERVIEW", order: "2" },
        ],
      })
    );
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid job data");
    expect(data.details).toBeDefined();
  });

  it("returns 200 with import count and replaces all jobs atomically", async () => {
    // Arrange
    mockAuth();
    mockSuccessfulImport(2, 3);

    // Act
    const response = await POST(createRequest({ jobs: COMPREHENSIVE_JOBS }));
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.imported).toBe(3);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("returns 500 on database error", async () => {
    // Arrange
    mockAuth();
    vi.mocked(prisma.$transaction).mockRejectedValue(
      new Error("Database connection failed")
    );
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // Act
    const response = await POST(
      createRequest({
        jobs: [{ company: "Test", status: "WISHLIST", order: "0" }],
      })
    );

    // Assert
    expect(response.status).toBe(500);
    consoleErrorSpy.mockRestore();
  });

  it("returns 500 on malformed JSON", async () => {
    // Arrange
    mockAuth();
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // Act
    const response = await POST(createRequest("invalid json{"));

    // Assert
    expect(response.status).toBe(500);
    consoleErrorSpy.mockRestore();
  });
});
