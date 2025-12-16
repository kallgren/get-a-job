import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH, DELETE } from "./route";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { Job } from "@prisma/client";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    job: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockAuth = any;

describe("PATCH /api/jobs/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as MockAuth);

    const request = new Request("http://test/api/jobs/1", {
      method: "PATCH",
      body: JSON.stringify({ company: "Updated Company" }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "1" }),
    });

    expect(response.status).toBe(401);
  });

  it("should return 404 if job does not exist", async () => {
    const mockUserId = "user_123";
    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as MockAuth);
    vi.mocked(prisma.job.findUnique).mockResolvedValue(null);

    const request = new Request("http://test/api/jobs/nonexistent", {
      method: "PATCH",
      body: JSON.stringify({ company: "Updated Company" }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "nonexistent" }),
    });

    expect(response.status).toBe(404);
  });

  it("should return 403 if user does not own the job", async () => {
    const mockUserId = "user_123";
    const existingJob: Job = {
      id: 1,
      userId: "different_user",
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
    vi.mocked(prisma.job.findUnique).mockResolvedValue(existingJob);

    const request = new Request("http://test/api/jobs/1", {
      method: "PATCH",
      body: JSON.stringify({ company: "Updated Company" }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "1" }),
    });

    expect(response.status).toBe(403);
  });

  it("should update job with valid data", async () => {
    const mockUserId = "user_123";
    const existingJob: Job = {
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

    const updatedJob: Job = {
      ...existingJob,
      company: "Updated Company",
      status: "APPLIED",
    };

    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as MockAuth);
    vi.mocked(prisma.job.findUnique).mockResolvedValue(existingJob);
    vi.mocked(prisma.job.update).mockResolvedValue(updatedJob);

    const request = new Request("http://test/api/jobs/1", {
      method: "PATCH",
      body: JSON.stringify({ company: "Updated Company", status: "APPLIED" }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toMatchObject({
      company: "Updated Company",
      status: "APPLIED",
    });
    expect(prisma.job.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        company: "Updated Company",
        status: "APPLIED",
      }),
    });
  });

  it("should return 400 if validation fails", async () => {
    const mockUserId = "user_123";
    const existingJob: Job = {
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
    vi.mocked(prisma.job.findUnique).mockResolvedValue(existingJob);

    const request = new Request("http://test/api/jobs/1", {
      method: "PATCH",
      body: JSON.stringify({ dateApplied: "not-a-datetime" }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "1" }),
    });
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
});

describe("DELETE /api/jobs/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as MockAuth);

    const request = new Request("http://test/api/jobs/1", {
      method: "DELETE",
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "1" }),
    });

    expect(response.status).toBe(401);
  });

  it("should return 404 if job does not exist", async () => {
    const mockUserId = "user_123";
    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as MockAuth);
    vi.mocked(prisma.job.findUnique).mockResolvedValue(null);

    const request = new Request("http://test/api/jobs/nonexistent", {
      method: "DELETE",
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "nonexistent" }),
    });

    expect(response.status).toBe(404);
  });

  it("should return 403 if user does not own the job", async () => {
    const mockUserId = "user_123";
    const existingJob: Job = {
      id: 1,
      userId: "different_user",
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
    vi.mocked(prisma.job.findUnique).mockResolvedValue(existingJob);

    const request = new Request("http://test/api/jobs/1", {
      method: "DELETE",
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "1" }),
    });

    expect(response.status).toBe(403);
  });

  it("should soft delete job successfully", async () => {
    const mockUserId = "user_123";
    const existingJob: Job = {
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
    vi.mocked(prisma.job.findUnique).mockResolvedValue(existingJob);
    vi.mocked(prisma.job.update).mockResolvedValue({
      ...existingJob,
      deletedAt: new Date(),
    });

    const request = new Request("http://test/api/jobs/1", {
      method: "DELETE",
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(prisma.job.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { deletedAt: expect.any(Date) },
    });
  });
});
