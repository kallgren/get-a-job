import { describe, it, expect } from "vitest";
import {
  jobImportSchema,
  importRequestSchema,
  type ExportedJob,
} from "./schemas";

// Test helpers
function createValidJob(overrides: Partial<ExportedJob> = {}): ExportedJob {
  return {
    company: "Test Company",
    status: "WISHLIST",
    order: "0",
    title: undefined,
    location: undefined,
    dateApplied: undefined,
    jobPostingUrl: undefined,
    jobPostingText: undefined,
    notes: undefined,
    resumeUrl: undefined,
    coverLetterUrl: undefined,
    contactPerson: undefined,
    ...overrides,
  };
}

describe("jobImportSchema", () => {
  describe("required fields", () => {
    it("requires company field", () => {
      // Arrange
      const invalidJob = {
        title: "Developer",
        status: "WISHLIST",
      };

      // Act
      const result = jobImportSchema.safeParse(invalidJob);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("company");
      }
    });

    it("rejects empty string for company", () => {
      // Arrange
      const invalidJob = {
        company: "",
        status: "WISHLIST",
        order: "0",
      };

      // Act
      const result = jobImportSchema.safeParse(invalidJob);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["company"]);
        expect(result.error.issues[0].message).toBe("Company name is required");
      }
    });

    it("accepts minimal valid job with only required fields", () => {
      // Arrange
      const minimalJob = {
        company: "Test Co",
        status: "WISHLIST",
        order: "0",
      };

      // Act
      const result = jobImportSchema.safeParse(minimalJob);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe("optional fields", () => {
    it("accepts all fields with valid data", () => {
      // Arrange
      const validJob = createValidJob({
        title: "Software Engineer",
        location: "Stockholm",
        dateApplied: "2024-01-15",
        jobPostingUrl: "https://example.com/job",
        jobPostingText: "Job description",
        notes: "Some notes",
        resumeUrl: "https://example.com/resume.pdf",
        coverLetterUrl: "https://example.com/cover.pdf",
        contactPerson: "John Doe",
      });

      // Act
      const result = jobImportSchema.safeParse(validJob);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.company).toBe("Test Company");
        expect(result.data.title).toBe("Software Engineer");
        expect(result.data.location).toBe("Stockholm");
        expect(result.data.status).toBe("WISHLIST");
        expect(result.data.order).toBe("0");
        expect(result.data.dateApplied).toBe("2024-01-15");
        expect(result.data.jobPostingUrl).toBe("https://example.com/job");
        expect(result.data.jobPostingText).toBe("Job description");
        expect(result.data.notes).toBe("Some notes");
        expect(result.data.resumeUrl).toBe("https://example.com/resume.pdf");
        expect(result.data.coverLetterUrl).toBe(
          "https://example.com/cover.pdf"
        );
        expect(result.data.contactPerson).toBe("John Doe");
      }
    });
  });

  describe("validation", () => {
    describe("status enum", () => {
      it("accepts all valid status values", () => {
        // Arrange
        const statuses = [
          "WISHLIST",
          "APPLIED",
          "INTERVIEW",
          "OFFER",
          "ACCEPTED",
          "REJECTED",
        ] as const;

        statuses.forEach((status) => {
          const job = createValidJob({ status });

          // Act
          const result = jobImportSchema.safeParse(job);

          // Assert
          expect(result.success, `${status} should be valid`).toBe(true);
        });
      });

      it("rejects invalid status value", () => {
        // Arrange
        const invalidJob = {
          company: "Test",
          status: "INVALID_STATUS",
          order: "0",
        };

        // Act
        const result = jobImportSchema.safeParse(invalidJob);

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toEqual(["status"]);
        }
      });
    });

    describe("URL fields", () => {
      it("accepts valid URLs", () => {
        // Arrange
        const job = createValidJob({
          jobPostingUrl: "https://example.com/job",
          resumeUrl: "https://drive.google.com/file/123",
          coverLetterUrl: "https://docs.google.com/document/456",
        });

        // Act
        const result = jobImportSchema.safeParse(job);

        // Assert
        expect(result.success).toBe(true);
      });

      it("accepts empty strings for URL fields", () => {
        // Arrange
        const job = createValidJob({
          jobPostingUrl: "",
          resumeUrl: "",
          coverLetterUrl: "",
        });

        // Act
        const result = jobImportSchema.safeParse(job);

        // Assert
        expect(result.success).toBe(true);
      });

      it("rejects invalid URL format", () => {
        // Arrange
        const job = createValidJob({
          jobPostingUrl: "not-a-valid-url",
        });

        // Act
        const result = jobImportSchema.safeParse(job);

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toEqual(["jobPostingUrl"]);
          expect(result.error.issues[0].message).toBe("Invalid URL");
        }
      });
    });

    describe("date field", () => {
      it("accepts valid ISO date string", () => {
        // Arrange
        const job = createValidJob({
          status: "APPLIED",
          dateApplied: "2024-01-15",
        });

        // Act
        const result = jobImportSchema.safeParse(job);

        // Assert
        expect(result.success).toBe(true);
      });

      it("accepts empty string for date field", () => {
        // Arrange
        const job = createValidJob({
          dateApplied: "",
        });

        // Act
        const result = jobImportSchema.safeParse(job);

        // Assert
        expect(result.success).toBe(true);
      });

      it("rejects invalid date format", () => {
        // Arrange
        const job = createValidJob({
          status: "APPLIED",
          dateApplied: "not-a-date",
        });

        // Act
        const result = jobImportSchema.safeParse(job);

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toEqual(["dateApplied"]);
        }
      });

      it("rejects invalid ISO date values", () => {
        // Arrange
        const invalidDates = ["2024-13-01", "2024-01-32", "2024-02-30"];

        invalidDates.forEach((dateApplied) => {
          const job = createValidJob({ dateApplied });

          // Act
          const result = jobImportSchema.safeParse(job);

          // Assert
          expect(result.success, `${dateApplied} should be invalid`).toBe(
            false
          );
        });
      });
    });
  });

  describe("defaults", () => {
    it("applies default status and order values", () => {
      // Arrange
      const job = {
        company: "Test",
      };

      // Act
      const result = jobImportSchema.safeParse(job);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("WISHLIST");
        expect(result.data.order).toBe("0");
      }
    });
  });

  describe("strict mode", () => {
    it("rejects unknown fields", () => {
      // Arrange
      const jobWithUnknownField = {
        company: "Test",
        status: "WISHLIST" as const,
        order: "0",
        unknownField: "this should not be accepted",
      };

      // Act
      const result = jobImportSchema.safeParse(jobWithUnknownField);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].code).toBe("unrecognized_keys");
      }
    });
  });

  describe("preprocessing", () => {
    it("converts null to undefined for optional fields", () => {
      // Arrange
      const jobWithNulls = {
        company: "Test",
        status: "WISHLIST",
        order: "0",
        title: null,
        location: null,
        dateApplied: null,
        jobPostingUrl: null,
        jobPostingText: null,
        notes: null,
        resumeUrl: null,
        coverLetterUrl: null,
        contactPerson: null,
      };

      // Act
      const result = jobImportSchema.safeParse(jobWithNulls);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBeUndefined();
        expect(result.data.location).toBeUndefined();
        expect(result.data.notes).toBeUndefined();
      }
    });
  });
});

describe("importRequestSchema", () => {
  it("accepts array of valid jobs", () => {
    // Arrange
    const validRequest = {
      jobs: [
        createValidJob({
          company: "Company 1",
          order: "a0",
        }),
        createValidJob({
          company: "Company 2",
          status: "APPLIED",
          order: "a1",
        }),
      ],
    };

    // Act
    const result = importRequestSchema.safeParse(validRequest);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.jobs).toHaveLength(2);
      expect(result.data.jobs[0].company).toBe("Company 1");
    }
  });

  it("preserves all job data through validation", () => {
    // Arrange
    const requestWithFullData = {
      jobs: [
        createValidJob({
          company: "Acme Corp",
          title: "Senior Engineer",
          location: "Stockholm",
          status: "INTERVIEW",
          order: "z9",
          dateApplied: "2024-03-15",
          jobPostingUrl: "https://acme.com/job",
          jobPostingText: "Full description",
          notes: "Called for interview",
          resumeUrl: "https://drive.google.com/resume",
          coverLetterUrl: "https://drive.google.com/cover",
          contactPerson: "Jane Smith",
        }),
      ],
    };

    // Act
    const result = importRequestSchema.safeParse(requestWithFullData);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      const job = result.data.jobs[0];
      expect(job.company).toBe("Acme Corp");
      expect(job.title).toBe("Senior Engineer");
      expect(job.location).toBe("Stockholm");
      expect(job.status).toBe("INTERVIEW");
      expect(job.order).toBe("z9");
      expect(job.dateApplied).toBe("2024-03-15");
      expect(job.jobPostingUrl).toBe("https://acme.com/job");
      expect(job.jobPostingText).toBe("Full description");
      expect(job.notes).toBe("Called for interview");
      expect(job.resumeUrl).toBe("https://drive.google.com/resume");
      expect(job.coverLetterUrl).toBe("https://drive.google.com/cover");
      expect(job.contactPerson).toBe("Jane Smith");
    }
  });

  it("requires jobs field", () => {
    // Arrange
    const invalidRequest = {};

    // Act
    const result = importRequestSchema.safeParse(invalidRequest);

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("jobs");
    }
  });

  it("validates each job in array", () => {
    // Arrange
    const requestWithInvalidJob = {
      jobs: [
        createValidJob({
          company: "Valid Company",
          order: "0",
        }),
        {
          // Missing required company field
          status: "APPLIED",
          order: "1",
        },
      ],
    };

    // Act
    const result = importRequestSchema.safeParse(requestWithInvalidJob);

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["jobs", 1, "company"]);
    }
  });
});
