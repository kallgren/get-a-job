import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Job } from "@prisma/client";
import {
  jobToExportedJob,
  generateExportFilename,
  downloadJSON,
  parseJSONFile,
  EXPORT_FILENAME_PREFIX,
} from "./export-import";

describe("jobToExportedJob", () => {
  it("removes auto-generated fields from exported job", () => {
    // Arrange
    const job: Job = {
      id: 1,
      userId: "user_123",
      company: "Test Company",
      title: "Software Engineer",
      location: "Stockholm",
      status: "WISHLIST",
      order: "a0",
      dateApplied: new Date("2024-01-15"),
      jobPostingUrl: "https://example.com/job",
      jobPostingText: "Job description here",
      notes: "Some notes",
      resumeUrl: "https://example.com/resume.pdf",
      coverLetterUrl: "https://example.com/cover.pdf",
      contactPerson: "John Doe",
      deletedAt: null,
      createdAt: new Date("2024-01-10"),
      updatedAt: new Date("2024-01-11"),
    };

    // Act
    const exported = jobToExportedJob(job);

    // Assert
    expect(exported).not.toHaveProperty("id");
    expect(exported).not.toHaveProperty("userId");
    expect(exported).not.toHaveProperty("createdAt");
    expect(exported).not.toHaveProperty("updatedAt");
    expect(exported).not.toHaveProperty("deletedAt");

    expect(exported.company).toBe("Test Company");
    expect(exported.title).toBe("Software Engineer");
    expect(exported.location).toBe("Stockholm");
    expect(exported.status).toBe("WISHLIST");
    expect(exported.order).toBe("a0");
    expect(exported.dateApplied).toBe("2024-01-15");
    expect(exported.jobPostingUrl).toBe("https://example.com/job");
    expect(exported.jobPostingText).toBe("Job description here");
    expect(exported.notes).toBe("Some notes");
    expect(exported.resumeUrl).toBe("https://example.com/resume.pdf");
    expect(exported.coverLetterUrl).toBe("https://example.com/cover.pdf");
    expect(exported.contactPerson).toBe("John Doe");
  });

  it("converts dateApplied Date to YYYY-MM-DD string", () => {
    // Arrange
    const job: Job = {
      id: 1,
      userId: "user_123",
      company: "Test Co",
      title: null,
      location: null,
      status: "APPLIED",
      order: "0",
      dateApplied: new Date("2024-01-15"),
      jobPostingUrl: null,
      jobPostingText: null,
      notes: null,
      resumeUrl: null,
      coverLetterUrl: null,
      contactPerson: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Act
    const exported = jobToExportedJob(job);

    // Assert
    expect(typeof exported.dateApplied).toBe("string");
    expect(exported.dateApplied).toBe("2024-01-15");
  });

  it("preserves null values in exported job for schema documentation", () => {
    // Arrange
    const job: Job = {
      id: 1,
      userId: "user_123",
      company: "Test Co",
      title: null,
      location: null,
      status: "WISHLIST",
      order: "0",
      dateApplied: null,
      jobPostingUrl: null,
      jobPostingText: null,
      notes: null,
      resumeUrl: null,
      coverLetterUrl: null,
      contactPerson: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Act
    const exported = jobToExportedJob(job);

    // Assert - empty fields should be explicitly null (not undefined/omitted)
    expect(exported.title).toBeNull();
    expect(exported.location).toBeNull();
    expect(exported.dateApplied).toBeNull();
    expect(exported.jobPostingUrl).toBeNull();
    expect(exported.jobPostingText).toBeNull();
    expect(exported.notes).toBeNull();
    expect(exported.resumeUrl).toBeNull();
    expect(exported.coverLetterUrl).toBeNull();
    expect(exported.contactPerson).toBeNull();
  });
});

describe("generateExportFilename", () => {
  it("generates filename with current date in YYYY-MM-DD format", () => {
    // Arrange
    const today = new Date().toISOString().split("T")[0];

    // Act
    const filename = generateExportFilename();

    // Assert
    expect(filename).toBe(`${EXPORT_FILENAME_PREFIX}-${today}.json`);
  });
});

describe("downloadJSON", () => {
  let createElementSpy: ReturnType<typeof vi.spyOn>;
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let mockAnchor: HTMLAnchorElement;

  beforeEach(() => {
    // Create a real anchor element for proper DOM compatibility
    mockAnchor = document.createElement("a");
    mockAnchor.click = vi.fn();

    // Spy on document.createElement
    createElementSpy = vi
      .spyOn(document, "createElement")
      .mockReturnValue(mockAnchor);

    // Spy on URL methods
    createObjectURLSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:mock-url");
    revokeObjectURLSpy = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    createElementSpy.mockRestore();
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });

  it("creates blob with JSON data", () => {
    // Arrange
    const data = { test: "data", nested: { value: 123 } };

    // Act
    downloadJSON(data, "test.json");

    // Assert
    expect(createObjectURLSpy).toHaveBeenCalledWith(expect.any(Blob));
  });

  it("triggers browser download with correct filename", () => {
    // Arrange
    const data = { jobs: [] };
    const filename = "my-export.json";

    // Act
    downloadJSON(data, filename);

    // Assert
    expect(mockAnchor.download).toBe(filename);
    expect(mockAnchor.click).toHaveBeenCalled();
  });

  it("cleans up object URL after timeout", () => {
    // Arrange
    vi.useFakeTimers();

    // Act
    downloadJSON({ test: "data" }, "test.json");

    // Assert
    expect(revokeObjectURLSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:mock-url");

    vi.useRealTimers();
  });

  it("formats JSON with 2-space indentation", () => {
    // Arrange
    const data = { key: "value", array: [1, 2, 3] };
    const expectedJSON = JSON.stringify(data, null, 2);
    const blobSpy = vi.spyOn(global, "Blob");

    // Act
    downloadJSON(data, "test.json");

    // Assert
    expect(blobSpy).toHaveBeenCalledWith([expectedJSON], {
      type: "application/json",
    });

    blobSpy.mockRestore();
  });

  it("appends and removes anchor from DOM during download", () => {
    // Arrange
    const appendChildSpy = vi.spyOn(document.body, "appendChild");
    const removeChildSpy = vi.spyOn(document.body, "removeChild");

    // Act
    downloadJSON({ test: "data" }, "test.json");

    // Assert
    expect(appendChildSpy).toHaveBeenCalledWith(mockAnchor);
    expect(removeChildSpy).toHaveBeenCalledWith(mockAnchor);

    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });
});

describe("parseJSONFile", () => {
  it("parses valid JSON file", async () => {
    // Arrange
    const data = { test: "data", jobs: [1, 2, 3] };
    const file = new File([JSON.stringify(data)], "test.json", {
      type: "application/json",
    });

    // Act
    const result = await parseJSONFile<typeof data>(file);

    // Assert
    expect(result).toEqual(data);
  });

  it("rejects invalid JSON with error", async () => {
    // Arrange
    const file = new File(["not valid json{"], "test.json", {
      type: "application/json",
    });

    // Act & Assert
    await expect(parseJSONFile(file)).rejects.toThrow("Invalid JSON file");
  });

  it("rejects empty file with error", async () => {
    // Arrange
    const file = new File([""], "empty.json");

    // Act & Assert
    await expect(parseJSONFile(file)).rejects.toThrow("Invalid JSON file");
  });

  it("parses array data correctly", async () => {
    // Arrange
    const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const file = new File([JSON.stringify(data)], "array.json", {
      type: "application/json",
    });

    // Act
    const result = await parseJSONFile<typeof data>(file);

    // Assert
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe(1);
  });

  it("parses complex nested objects", async () => {
    // Arrange
    const data = {
      jobs: [
        {
          company: "Test",
          metadata: { date: "2024-01-01", tags: ["remote", "fulltime"] },
        },
      ],
      settings: { theme: "dark" },
    };
    const file = new File([JSON.stringify(data)], "complex.json", {
      type: "application/json",
    });

    // Act
    const result = await parseJSONFile<typeof data>(file);

    // Assert
    expect(result.jobs[0].company).toBe("Test");
    expect(result.jobs[0].metadata.tags).toEqual(["remote", "fulltime"]);
    expect(result.settings.theme).toBe("dark");
  });
});
