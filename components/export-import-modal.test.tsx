import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExportImportModal } from "./export-import-modal";
import * as exportImport from "@/lib/export-import";
import { EXPORT_FILENAME_PREFIX } from "@/lib/export-import";
import { Job } from "@prisma/client";

// Mock next/navigation
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

// Test helpers
const mockJobs: Job[] = [
  {
    id: 1,
    userId: "user_123",
    company: "Acme Corp",
    title: "Senior Developer",
    location: "Stockholm",
    status: "INTERVIEW",
    order: "a0",
    dateApplied: new Date("2024-01-15"),
    jobPostingUrl: null,
    jobPostingText: null,
    notes: null,
    contactPerson: null,
    resumeUrl: null,
    coverLetterUrl: null,
    deletedAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: 2,
    userId: "user_123",
    company: "Tech Startup",
    title: null,
    location: null,
    status: "WISHLIST",
    order: "a1",
    dateApplied: null,
    jobPostingUrl: null,
    jobPostingText: null,
    notes: null,
    contactPerson: null,
    resumeUrl: null,
    coverLetterUrl: null,
    deletedAt: null,
    createdAt: new Date("2024-01-02"),
    updatedAt: new Date("2024-01-02"),
  },
];

const createMockFile = (
  content: string,
  filename = "test-export.json"
): File => {
  return new File([content], filename, { type: "application/json" });
};

const validExportData = [
  {
    company: "Acme Corp",
    title: "Senior Developer",
    location: "Stockholm",
    status: "INTERVIEW",
    order: "a0",
    dateApplied: "2024-01-15",
    jobPostingUrl: null,
    jobPostingText: null,
    notes: null,
    contactPerson: null,
    resumeUrl: null,
    coverLetterUrl: null,
  },
  {
    company: "Tech Startup",
    title: null,
    location: null,
    status: "WISHLIST",
    order: "a1",
    dateApplied: null,
    jobPostingUrl: null,
    jobPostingText: null,
    notes: null,
    contactPerson: null,
    resumeUrl: null,
    coverLetterUrl: null,
  },
];

const setupFetchMock = (
  exportResponse?: { ok: boolean; data?: Job[] },
  importResponse?: { ok: boolean; error?: string }
) => {
  global.fetch = vi.fn((url: string | URL | Request) => {
    const urlString = url.toString();

    if (urlString.includes("/api/jobs/import")) {
      return Promise.resolve({
        ok: importResponse?.ok ?? true,
        json: () =>
          Promise.resolve(
            importResponse?.ok
              ? { success: true, imported: 2 }
              : { error: importResponse?.error ?? "Import failed" }
          ),
      } as Response);
    }

    if (urlString.includes("/api/jobs")) {
      return Promise.resolve({
        ok: exportResponse?.ok ?? true,
        json: () => Promise.resolve(exportResponse?.data ?? mockJobs),
      } as Response);
    }

    return Promise.reject(new Error("Unknown URL"));
  });
};

describe("ExportImportModal", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setupFetchMock();
    window.confirm = vi.fn(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders export and import sections with file input", () => {
    // Arrange & Act
    render(<ExportImportModal {...defaultProps} />);

    // Assert
    expect(screen.getByText("Export & Import")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /export all jobs/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Select JSON file to import")).toHaveAttribute(
      "accept",
      ".json"
    );
  });

  it("exports jobs successfully", async () => {
    // Arrange
    const user = userEvent.setup();
    const downloadSpy = vi
      .spyOn(exportImport, "downloadJSON")
      .mockImplementation(() => {});
    const mockFilename = `${EXPORT_FILENAME_PREFIX}-2024-01-15.json`;
    vi.spyOn(exportImport, "generateExportFilename").mockReturnValue(
      mockFilename
    );
    render(<ExportImportModal {...defaultProps} />);

    // Act
    await user.click(screen.getByRole("button", { name: /export all jobs/i }));

    // Assert
    await waitFor(() => {
      expect(downloadSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ company: "Acme Corp" }),
        ]),
        mockFilename
      );
    });
  });

  it("displays error when export fails", async () => {
    // Arrange
    const user = userEvent.setup();
    setupFetchMock({ ok: false });
    render(<ExportImportModal {...defaultProps} />);

    // Act
    await user.click(screen.getByRole("button", { name: /export all jobs/i }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Failed to fetch jobs")).toBeInTheDocument();
    });
  });

  it("accepts valid JSON file and shows preview", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<ExportImportModal {...defaultProps} />);
    const fileInput = screen.getByLabelText("Select JSON file to import");
    const validFile = createMockFile(JSON.stringify(validExportData));

    // Act
    await user.upload(fileInput, validFile);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("test-export.json")).toBeInTheDocument();
      expect(screen.getByText(/ready to import 2 jobs/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /import jobs/i })
      ).toBeInTheDocument();
    });
  });

  it("rejects invalid JSON file", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<ExportImportModal {...defaultProps} />);
    const fileInput = screen.getByLabelText("Select JSON file to import");

    // Act
    await user.upload(fileInput, createMockFile("invalid json{"));

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Invalid JSON file")).toBeInTheDocument();
    });
  });

  it("validates all jobs in file and displays specific error for invalid job", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<ExportImportModal {...defaultProps} />);
    const fileInput = screen.getByLabelText("Select JSON file to import");
    // First job valid, second job missing required 'company' field
    const mixedData = [
      {
        company: "Valid Corp",
        status: "WISHLIST",
        order: "a0",
      },
      {
        title: "Developer",
        status: "APPLIED",
        order: "a1",
      },
    ];

    // Act
    await user.upload(fileInput, createMockFile(JSON.stringify(mixedData)));

    // Assert - should catch error in job #2 and display specific error message
    await waitFor(() => {
      expect(screen.getByText(/invalid job data/i)).toBeInTheDocument();
      expect(screen.getByText(/job #2/i)).toBeInTheDocument();
    });
  });

  it("imports jobs successfully after user confirmation", async () => {
    // Arrange
    const user = userEvent.setup();
    setupFetchMock({ ok: true, data: mockJobs }, { ok: true });
    render(<ExportImportModal {...defaultProps} />);
    const fileInput = screen.getByLabelText("Select JSON file to import");

    // Act
    await user.upload(
      fileInput,
      createMockFile(JSON.stringify(validExportData))
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /import jobs/i })
      ).toBeInTheDocument()
    );
    await user.click(screen.getByRole("button", { name: /import jobs/i }));

    // Assert
    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining("You currently have 2 jobs")
      );
      expect(mockRefresh).toHaveBeenCalled();
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("cancels import when user declines confirmation", async () => {
    // Arrange
    const user = userEvent.setup();
    window.confirm = vi.fn(() => false);
    render(<ExportImportModal {...defaultProps} />);
    const fileInput = screen.getByLabelText("Select JSON file to import");

    // Act
    await user.upload(
      fileInput,
      createMockFile(JSON.stringify(validExportData))
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /import jobs/i })
      ).toBeInTheDocument()
    );
    await user.click(screen.getByRole("button", { name: /import jobs/i }));

    // Assert
    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
    });
    expect(global.fetch).not.toHaveBeenCalledWith(
      "/api/jobs/import",
      expect.any(Object)
    );
  });

  it("displays error when import fails", async () => {
    // Arrange
    const user = userEvent.setup();
    setupFetchMock(
      { ok: true, data: mockJobs },
      { ok: false, error: "Validation failed" }
    );
    render(<ExportImportModal {...defaultProps} />);
    const fileInput = screen.getByLabelText("Select JSON file to import");

    // Act
    await user.upload(
      fileInput,
      createMockFile(JSON.stringify(validExportData))
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /import jobs/i })
      ).toBeInTheDocument()
    );
    await user.click(screen.getByRole("button", { name: /import jobs/i }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Validation failed")).toBeInTheDocument();
    });
  });

  it("resets state when modal closes", async () => {
    // Arrange
    const user = userEvent.setup();
    const { rerender } = render(<ExportImportModal {...defaultProps} />);
    const fileInput = screen.getByLabelText("Select JSON file to import");

    // Act - Select file
    await user.upload(
      fileInput,
      createMockFile(JSON.stringify(validExportData))
    );
    await waitFor(() =>
      expect(screen.getByText("test-export.json")).toBeInTheDocument()
    );

    // Close and reopen modal
    rerender(<ExportImportModal {...defaultProps} open={false} />);
    rerender(<ExportImportModal {...defaultProps} open={true} />);

    // Assert
    expect(screen.queryByText("test-export.json")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /import jobs/i })
    ).not.toBeInTheDocument();
  });
});
