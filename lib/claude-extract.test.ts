import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { extractJobData } from "./claude-extract";

// Mock the global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe("extractJobData", () => {
  const testUrl = "https://example.com/jobs/123";
  const testText = "Software Engineer at Acme Corp. Remote position.";

  beforeEach(() => {
    // Reset mocks before each test
    mockFetch.mockClear();

    // Set API key for tests
    process.env.ANTHROPIC_API_KEY = "test-api-key";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("successful extraction", () => {
    it("extracts job data from Claude API response", async () => {
      // Arrange
      const mockResponse = {
        company: "Acme Corp",
        title: "Software Engineer",
        location: "Remote",
        jobPostingText: "Full job description here",
        notes: "Requires 5 years experience with TypeScript and React",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [
            {
              text: JSON.stringify(mockResponse),
            },
          ],
        }),
      });

      // Act
      const result = await extractJobData(testUrl, testText);

      // Assert
      expect(result).toEqual({
        company: "Acme Corp",
        title: "Software Engineer",
        location: "Remote",
        jobPostingUrl: testUrl,
        jobPostingText: "Full job description here",
        notes: "Requires 5 years experience with TypeScript and React",
      });

      expect(mockFetch).toHaveBeenCalledOnce();
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.anthropic.com/v1/messages",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "x-api-key": "test-api-key",
            "anthropic-version": "2023-06-01",
          }),
        })
      );
    });

    it("handles markdown-wrapped JSON response", async () => {
      // Arrange
      const mockResponse = {
        company: "Tech Co",
        title: "Developer",
        location: "Stockholm, Sweden",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [
            {
              text: `Here's the extracted data:\n\`\`\`json\n${JSON.stringify(mockResponse, null, 2)}\n\`\`\``,
            },
          ],
        }),
      });

      // Act
      const result = await extractJobData(testUrl, testText);

      // Assert
      expect(result.company).toBe("Tech Co");
      expect(result.title).toBe("Developer");
      expect(result.location).toBe("Stockholm, Sweden");
    });

    it("handles response with only required company field", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [
            {
              text: JSON.stringify({ company: "Minimal Corp" }),
            },
          ],
        }),
      });

      // Act
      const result = await extractJobData(testUrl, testText);

      // Assert
      expect(result.company).toBe("Minimal Corp");
      expect(result.title).toBeUndefined();
      expect(result.location).toBeUndefined();
      expect(result.jobPostingUrl).toBe(testUrl);
    });

    it("handles null values in optional fields", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [
            {
              text: JSON.stringify({
                company: "NullCo",
                title: null,
                location: null,
                jobPostingText: null,
                notes: null,
              }),
            },
          ],
        }),
      });

      // Act
      const result = await extractJobData(testUrl, testText);

      // Assert
      expect(result.company).toBe("NullCo");
      expect(result.title).toBeUndefined();
      expect(result.location).toBeUndefined();
      expect(result.jobPostingText).toBeUndefined();
      expect(result.notes).toBeUndefined();
    });
  });

  describe("error handling", () => {
    it("throws error when ANTHROPIC_API_KEY is missing", async () => {
      // Arrange
      delete process.env.ANTHROPIC_API_KEY;

      // Act & Assert
      await expect(extractJobData(testUrl, testText)).rejects.toThrow(
        "ANTHROPIC_API_KEY environment variable is not set"
      );

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("throws error when API request fails", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
      });

      // Act & Assert
      await expect(extractJobData(testUrl, testText)).rejects.toThrow(
        "Claude API request failed: 401 Unauthorized"
      );
    });

    it("throws error when API returns no content", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [],
        }),
      });

      // Act & Assert
      await expect(extractJobData(testUrl, testText)).rejects.toThrow(
        "No content in Claude API response"
      );
    });

    it("throws error when response is invalid JSON", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [
            {
              text: "This is not valid JSON {invalid}",
            },
          ],
        }),
      });

      // Act & Assert
      await expect(extractJobData(testUrl, testText)).rejects.toThrow(
        "Failed to parse JSON from Claude response"
      );
    });

    it("handles network errors", async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      // Act & Assert
      await expect(extractJobData(testUrl, testText)).rejects.toThrow(
        "Network error"
      );
    });

    it("handles unexpected error types", async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce("string error");

      // Act & Assert
      await expect(extractJobData(testUrl, testText)).rejects.toThrow(
        "Unknown error extracting job data"
      );
    });
  });

  describe("JSON parsing edge cases", () => {
    it("extracts JSON from text with additional commentary", async () => {
      // Arrange
      const mockResponse = {
        company: "Example Inc",
        title: "Developer",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [
            {
              text: `Based on the text, here's what I found:\n${JSON.stringify(mockResponse)}\nThat's all the data.`,
            },
          ],
        }),
      });

      // Act
      const result = await extractJobData(testUrl, testText);

      // Assert
      expect(result.company).toBe("Example Inc");
      expect(result.title).toBe("Developer");
    });

    it("handles JSON with extra whitespace", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [
            {
              text: `  \n\n  {  "company"  :  "Whitespace Corp"  }  \n\n  `,
            },
          ],
        }),
      });

      // Act
      const result = await extractJobData(testUrl, testText);

      // Assert
      expect(result.company).toBe("Whitespace Corp");
    });

    it("handles multiline JSON", async () => {
      // Arrange
      const multilineJson = `{
  "company": "Multiline Corp",
  "title": "Senior Engineer",
  "location": "Remote"
}`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [
            {
              text: multilineJson,
            },
          ],
        }),
      });

      // Act
      const result = await extractJobData(testUrl, testText);

      // Assert
      expect(result.company).toBe("Multiline Corp");
      expect(result.title).toBe("Senior Engineer");
      expect(result.location).toBe("Remote");
    });
  });
});
