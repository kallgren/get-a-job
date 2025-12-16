import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { Job } from "@prisma/client";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    job: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockAuth = any;

describe("GET /api/jobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as MockAuth);

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("should return jobs for authenticated user", async () => {
    const mockUserId = "user_123";
    const mockJobs: Job[] = [
      {
        id: 1,
        userId: mockUserId,
        company: "Test Company",
        title: "Developer",
        location: "Stockholm",
        jobPostingUrl: null,
        jobPostingText: null,
        status: "WISHLIST",
        notes: null,
        resumeUrl: null,
        coverLetterUrl: null,
        dateApplied: null,
        deletedAt: null,
        contactPerson: null,
        order: "0",
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      },
    ];

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as MockAuth);
    vi.mocked(prisma.job.findMany).mockResolvedValue(mockJobs);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      id: 1,
      userId: mockUserId,
      company: "Test Company",
      title: "Developer",
      status: "WISHLIST",
    });
    expect(prisma.job.findMany).toHaveBeenCalledWith({
      where: {
        userId: mockUserId,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("should return 500 if database query fails", async () => {
    const mockUserId = "user_123";

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as MockAuth);
    vi.mocked(prisma.job.findMany).mockRejectedValue(
      new Error("Database error")
    );

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Failed to fetch jobs" });

    consoleErrorSpy.mockRestore();
  });
});

describe("POST /api/jobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as MockAuth);

    const request = new Request("http://test/api/jobs", {
      method: "POST",
      body: JSON.stringify({ company: "Test", title: "Dev" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it("should create job with valid data", async () => {
    const mockUserId = "user_123";
    const mockJob: Job = {
      id: 1,
      userId: mockUserId,
      company: "Test Company",
      title: "Developer",
      location: null,
      jobPostingUrl: null,
      jobPostingText: null,
      status: "WISHLIST",
      notes: null,
      resumeUrl: null,
      coverLetterUrl: null,
      dateApplied: null,
      deletedAt: null,
      contactPerson: null,
      order: "0",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as MockAuth);
    vi.mocked(prisma.job.create).mockResolvedValue(mockJob);

    const request = new Request("http://test/api/jobs", {
      method: "POST",
      body: JSON.stringify({
        company: "Test Company",
        title: "Developer",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toMatchObject({
      company: "Test Company",
      title: "Developer",
      status: "WISHLIST",
    });
    expect(prisma.job.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: mockUserId,
        company: "Test Company",
        title: "Developer",
      }),
    });
  });

  it("should return 400 if company is missing", async () => {
    const mockUserId = "user_123";
    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as MockAuth);

    const requestMissingCompany = new Request("http://test/api/jobs", {
      method: "POST",
      body: JSON.stringify({ title: "Developer" }),
    });

    const response = await POST(requestMissingCompany);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
    expect(data.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: expect.arrayContaining(["company"]),
        }),
      ])
    );
  });

  it("should return 400 if jobPostingUrl is not a valid URL", async () => {
    const mockUserId = "user_123";
    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as MockAuth);

    const request = new Request("http://test/api/jobs", {
      method: "POST",
      body: JSON.stringify({
        company: "Test",
        title: "Dev",
        jobPostingUrl: "not-a-url",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
    expect(data.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: expect.arrayContaining(["jobPostingUrl"]),
        }),
      ])
    );
  });

  it("should return 400 if dateApplied is not a valid ISO datetime", async () => {
    const mockUserId = "user_123";
    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as MockAuth);

    const request = new Request("http://test/api/jobs", {
      method: "POST",
      body: JSON.stringify({
        company: "Test",
        title: "Dev",
        dateApplied: "not-a-datetime",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
    expect(data.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: expect.arrayContaining(["dateApplied"]),
        }),
      ])
    );
  });

  it("should convert empty strings to null for optional fields", async () => {
    const mockUserId = "user_123";
    const mockJob: Job = {
      id: 1,
      userId: mockUserId,
      company: "Test Company",
      title: "Developer",
      location: null,
      jobPostingUrl: null,
      jobPostingText: null,
      status: "WISHLIST",
      notes: null,
      resumeUrl: null,
      coverLetterUrl: null,
      dateApplied: null,
      deletedAt: null,
      contactPerson: null,
      order: "0",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as MockAuth);
    vi.mocked(prisma.job.create).mockResolvedValue(mockJob);

    const request = new Request("http://test/api/jobs", {
      method: "POST",
      body: JSON.stringify({
        company: "Test Company",
        title: "Developer",
        location: "",
        jobPostingUrl: "",
        resumeUrl: "",
        coverLetterUrl: "",
        jobPostingText: "",
        notes: "",
        contactPerson: "",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(prisma.job.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        location: null,
        jobPostingUrl: null,
        resumeUrl: null,
        coverLetterUrl: null,
        jobPostingText: null,
        notes: null,
        contactPerson: null,
      }),
    });
  });
});
