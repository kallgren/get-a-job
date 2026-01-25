import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock HTML to text utility
vi.mock("@/lib/html-to-text", () => ({
  htmlToText: vi.fn(),
}));

// Mock Claude extraction
vi.mock("@/lib/claude-extract", () => ({
  extractJobData: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import { htmlToText } from "@/lib/html-to-text";
import { extractJobData } from "@/lib/claude-extract";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockAuth = any;

// Test helpers
const TEST_USER_ID = "user_123";
const TEST_URL = "https://example.com/jobs/123";

const mockAuth = (userId: string | null = TEST_USER_ID) => {
  vi.mocked(auth).mockResolvedValue({ userId } as MockAuth);
};

const createRequest = (body: unknown) =>
  new Request("http://test/api/jobs/extract", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const mockFetchSuccess = (html: string) => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
    text: async () => html,
  });
};

const mockFetchError = (status: number, statusText: string) => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status,
    statusText,
  });
};

const mockHtmlToText = (text: string) => {
  vi.mocked(htmlToText).mockReturnValue(text);
};

const mockExtractJobData = (data: {
  company: string;
  title?: string;
  location?: string;
  jobPostingUrl: string;
  jobPostingText?: string;
  notes?: string;
}) => {
  vi.mocked(extractJobData).mockResolvedValue(data);
};

describe("POST /api/jobs/extract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authentication", () => {
    it("returns 401 when unauthenticated", async () => {
      // Arrange
      mockAuth(null);

      // Act
      const response = await POST(createRequest({ url: TEST_URL }));

      // Assert
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("validation", () => {
    it("returns 400 for invalid URL", async () => {
      // Arrange
      mockAuth();

      // Act
      const response = await POST(createRequest({ url: "not-a-url" }));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid URL");
    });

    it("returns 400 for missing URL", async () => {
      // Arrange
      mockAuth();

      // Act
      const response = await POST(createRequest({ invalid: "data" }));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid URL");
    });
  });

  describe("SSRF protection", () => {
    it("blocks localhost URLs", async () => {
      // Arrange
      mockAuth();

      // Act
      const response = await POST(
        createRequest({ url: "http://localhost:3000/admin" })
      );
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain("URL not allowed");
    });

    it("blocks 127.0.0.1 URLs", async () => {
      // Arrange
      mockAuth();

      // Act
      const response = await POST(
        createRequest({ url: "http://127.0.0.1/secret" })
      );
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain("URL not allowed");
    });

    it("blocks private 192.168.x.x IPs", async () => {
      // Arrange
      mockAuth();

      // Act
      const response = await POST(
        createRequest({ url: "http://192.168.1.1/admin" })
      );
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain("URL not allowed");
    });

    it("blocks private 10.x.x.x IPs", async () => {
      // Arrange
      mockAuth();

      // Act
      const response = await POST(
        createRequest({ url: "http://10.0.0.1/internal" })
      );
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain("URL not allowed");
    });

    it("blocks cloud metadata endpoint (169.254.169.254)", async () => {
      // Arrange
      mockAuth();

      // Act
      const response = await POST(
        createRequest({ url: "http://169.254.169.254/latest/meta-data/" })
      );
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain("URL not allowed");
    });

    it("blocks .internal domains", async () => {
      // Arrange
      mockAuth();

      // Act
      const response = await POST(
        createRequest({ url: "http://api.internal/secrets" })
      );
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain("URL not allowed");
    });

    it("allows legitimate external URLs", async () => {
      // Arrange
      mockAuth();
      mockFetchSuccess("<html>Job</html>");
      mockHtmlToText(
        "Job posting content with detailed description for testing external URLs"
      );
      mockExtractJobData({
        company: "External Corp",
        jobPostingUrl: "https://careers.example.com/job/123",
      });

      // Act
      const response = await POST(
        createRequest({ url: "https://careers.example.com/job/123" })
      );
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("successful extraction", () => {
    it("returns 200 with extracted data on success", async () => {
      // Arrange
      mockAuth();
      mockFetchSuccess("<html><body>Job at Acme Corp</body></html>");
      mockHtmlToText(
        "Job at Acme Corp\n\nSenior Developer\nStockholm, Sweden\n\nWe are looking for a talented developer..."
      );
      mockExtractJobData({
        company: "Acme Corp",
        title: "Senior Developer",
        location: "Stockholm, Sweden",
        jobPostingUrl: TEST_URL,
        jobPostingText: "We are looking for a talented developer...",
        notes: "Requires 5+ years experience with TypeScript and React",
      });

      // Act
      const response = await POST(createRequest({ url: TEST_URL }));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual({
        company: "Acme Corp",
        title: "Senior Developer",
        location: "Stockholm, Sweden",
        jobPostingUrl: TEST_URL,
        jobPostingText: "We are looking for a talented developer...",
        notes: "Requires 5+ years experience with TypeScript and React",
      });
    });

    it("makes fetch request with correct headers", async () => {
      // Arrange
      mockAuth();
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "text/html" }),
        text: async () => "<html>Job</html>",
      });
      global.fetch = mockFetch;
      mockHtmlToText("Job at Company");
      mockExtractJobData({
        company: "Company",
        jobPostingUrl: TEST_URL,
      });

      // Act
      await POST(createRequest({ url: TEST_URL }));

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        TEST_URL,
        expect.objectContaining({
          headers: expect.objectContaining({
            "User-Agent": expect.stringContaining("GetAJob"),
          }),
        })
      );
    });

    it("handles minimal extraction with only company", async () => {
      // Arrange
      mockAuth();
      mockFetchSuccess("<html>Minimal Corp</html>");
      mockHtmlToText(
        "Minimal Corp hiring developers - Join our team and work on exciting projects"
      );
      mockExtractJobData({
        company: "Minimal Corp",
        jobPostingUrl: TEST_URL,
      });

      // Act
      const response = await POST(createRequest({ url: TEST_URL }));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.company).toBe("Minimal Corp");
      expect(data.data.jobPostingUrl).toBe(TEST_URL);
    });
  });

  describe("fetch errors", () => {
    it("returns fallback when URL fetch fails with 404", async () => {
      // Arrange
      mockAuth();
      mockFetchError(404, "Not Found");

      // Act
      const response = await POST(createRequest({ url: TEST_URL }));
      const data = await response.json();

      // Assert
      expect(data.success).toBe(false);
      expect(data.error).toBe("HTTP 404 when fetching URL");
      expect(data.fallback).toEqual({ jobPostingUrl: TEST_URL });
    });

    it("returns fallback when fetch times out", async () => {
      // Arrange
      mockAuth();
      global.fetch = vi.fn().mockRejectedValue(new Error("Timeout"));

      // Act
      const response = await POST(createRequest({ url: TEST_URL }));
      const data = await response.json();

      // Assert
      expect(data.success).toBe(false);
      expect(data.error).toBe("Timeout");
      expect(data.fallback).toEqual({ jobPostingUrl: TEST_URL });
    });

    it("returns fallback when content is not HTML", async () => {
      // Arrange
      mockAuth();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/pdf" }),
        text: async () => "PDF content",
      });

      // Act
      const response = await POST(createRequest({ url: TEST_URL }));
      const data = await response.json();

      // Assert
      expect(data.success).toBe(false);
      expect(data.error).toBe(
        "Invalid content type: application/pdf (expected text/html)"
      );
      expect(data.fallback).toEqual({ jobPostingUrl: TEST_URL });
    });

    it("returns fallback when page has insufficient content", async () => {
      // Arrange
      mockAuth();
      mockFetchSuccess("<html><body>Hi</body></html>");
      mockHtmlToText("Hi"); // Less than 50 characters

      // Act
      const response = await POST(createRequest({ url: TEST_URL }));
      const data = await response.json();

      // Assert
      expect(data.success).toBe(false);
      expect(data.error).toMatch(
        /Insufficient text content.*minimum 50 required/
      );
      expect(data.fallback).toEqual({ jobPostingUrl: TEST_URL });
    });

    it("returns fallback when HTML to text returns empty", async () => {
      // Arrange
      mockAuth();
      mockFetchSuccess("<html><script>alert('test')</script></html>");
      mockHtmlToText(""); // Empty after stripping scripts

      // Act
      const response = await POST(createRequest({ url: TEST_URL }));
      const data = await response.json();

      // Assert
      expect(data.success).toBe(false);
      expect(data.fallback).toEqual({ jobPostingUrl: TEST_URL });
    });
  });

  describe("Claude API errors", () => {
    it("returns fallback when Claude API fails", async () => {
      // Arrange
      mockAuth();
      mockFetchSuccess("<html>Job at Company</html>");
      mockHtmlToText(
        "Job at Company - We are hiring for multiple positions with competitive salary and benefits"
      );
      vi.mocked(extractJobData).mockRejectedValue(
        new Error("ANTHROPIC_API_KEY environment variable is not set")
      );

      // Act
      const response = await POST(createRequest({ url: TEST_URL }));
      const data = await response.json();

      // Assert
      expect(data.success).toBe(false);
      expect(data.error).toBe(
        "ANTHROPIC_API_KEY environment variable is not set"
      );
      expect(data.fallback).toEqual({ jobPostingUrl: TEST_URL });
    });

    it("returns fallback when Claude API parsing fails", async () => {
      // Arrange
      mockAuth();
      mockFetchSuccess("<html>Job posting</html>");
      mockHtmlToText(
        "Job posting content with detailed description of the position and requirements"
      );
      vi.mocked(extractJobData).mockRejectedValue(
        new Error("Failed to parse JSON from Claude response")
      );

      // Act
      const response = await POST(createRequest({ url: TEST_URL }));
      const data = await response.json();

      // Assert
      expect(data.success).toBe(false);
      expect(data.error).toContain("Failed to parse JSON");
      expect(data.fallback).toEqual({ jobPostingUrl: TEST_URL });
    });

    it("returns fallback for unknown Claude extraction error", async () => {
      // Arrange
      mockAuth();
      mockFetchSuccess("<html>Job posting</html>");
      mockHtmlToText(
        "Job posting content with detailed description of the position and requirements"
      );
      vi.mocked(extractJobData).mockRejectedValue("Unknown error");

      // Act
      const response = await POST(createRequest({ url: TEST_URL }));
      const data = await response.json();

      // Assert
      expect(data.success).toBe(false);
      expect(data.error).toBe("Claude API extraction failed");
      expect(data.fallback).toEqual({ jobPostingUrl: TEST_URL });
    });
  });

  describe("Arbetsförmedlingen API integration", () => {
    const AF_URL =
      "https://arbetsformedlingen.se/platsbanken/annonser/12345678";

    it("uses Arbetsförmedlingen API for matching URLs", async () => {
      // Arrange
      mockAuth();
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          title: "Fullstack Developer",
          company: { name: "Tech AB" },
          workplace: { city: "Stockholm", country: "Sweden" },
          description: "<p>Job description here</p>",
          occupation: "Software Developer",
          positions: 2,
          lastApplicationDate: "2025-03-01",
        }),
      });
      global.fetch = mockFetch;
      vi.mocked(htmlToText).mockReturnValue("Job description here");

      // Act
      const response = await POST(createRequest({ url: AF_URL }));
      const data = await response.json();

      // Assert
      expect(data.success).toBe(true);
      expect(data.data.company).toBe("Tech AB");
      expect(data.data.title).toBe("Fullstack Developer");
      expect(data.data.location).toBe("Stockholm, Sweden");
      expect(data.data.jobPostingUrl).toBe(AF_URL);
      expect(data.data.notes).toContain("Software Developer");
      expect(data.data.notes).toContain("2 positions");

      // Verify it called the AF API, not the original URL
      expect(mockFetch).toHaveBeenCalledWith(
        "https://platsbanken-api.arbetsformedlingen.se/jobs/v1/job/12345678",
        expect.anything()
      );
    });

    it("returns fallback when Arbetsförmedlingen API returns 404", async () => {
      // Arrange
      mockAuth();
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      // Act
      const response = await POST(createRequest({ url: AF_URL }));
      const data = await response.json();

      // Assert
      expect(data.success).toBe(false);
      expect(data.error).toContain("404");
      expect(data.error).toContain("job not found");
      expect(data.fallback).toEqual({ jobPostingUrl: AF_URL });
    });

    it("returns fallback when Arbetsförmedlingen API fails", async () => {
      // Arrange
      mockAuth();
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      // Act
      const response = await POST(createRequest({ url: AF_URL }));
      const data = await response.json();

      // Assert
      expect(data.success).toBe(false);
      expect(data.error).toBe("Network error");
      expect(data.fallback).toEqual({ jobPostingUrl: AF_URL });
    });

    it("handles minimal Arbetsförmedlingen response", async () => {
      // Arrange
      mockAuth();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          title: "Developer",
          company: { name: "Company AB" },
        }),
      });

      // Act
      const response = await POST(createRequest({ url: AF_URL }));
      const data = await response.json();

      // Assert
      expect(data.success).toBe(true);
      expect(data.data.company).toBe("Company AB");
      expect(data.data.title).toBe("Developer");
      expect(data.data.location).toBeUndefined();
      expect(data.data.notes).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    it("handles large HTML pages", async () => {
      // Arrange
      mockAuth();
      const largeHtml = "<html><body>" + "A".repeat(100000) + "</body></html>";
      mockFetchSuccess(largeHtml);
      mockHtmlToText("A".repeat(10000)); // Truncated by htmlToText
      mockExtractJobData({
        company: "Large Corp",
        jobPostingUrl: TEST_URL,
      });

      // Act
      const response = await POST(createRequest({ url: TEST_URL }));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("handles URLs with special characters", async () => {
      // Arrange
      const specialUrl =
        "https://example.com/jobs?id=123&category=dev&location=stockholm%2C%20sweden";
      mockAuth();
      mockFetchSuccess("<html>Job</html>");
      mockHtmlToText(
        "Job at Special Co - Join our team and work on exciting projects with competitive benefits"
      );
      mockExtractJobData({
        company: "Special Co",
        jobPostingUrl: specialUrl,
      });

      // Act
      const response = await POST(createRequest({ url: specialUrl }));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.jobPostingUrl).toBe(specialUrl);
    });

    it("handles malformed JSON request", async () => {
      // Arrange
      mockAuth();

      // Act
      const response = await POST(createRequest("not valid json"));

      // Assert
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Failed to extract job data");
    });
  });
});
