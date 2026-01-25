import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { extractJobSchema } from "@/lib/schemas";
import { htmlToText } from "@/lib/html-to-text";
import { extractJobData } from "@/lib/claude-extract";

/**
 * Validates that a URL is safe to fetch (SSRF protection).
 * Blocks localhost, private IPs, and cloud metadata endpoints.
 */
function isUrlSafeToFetch(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    // Block localhost variants
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]" ||
      hostname.endsWith(".localhost")
    ) {
      return false;
    }

    // Block private and reserved IP ranges
    // This handles: 10.x.x.x, 172.16-31.x.x, 192.168.x.x, 169.254.x.x (link-local/metadata)
    const ipv4Match = hostname.match(
      /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
    );
    if (ipv4Match) {
      const [, a, b] = ipv4Match.map(Number);
      if (
        a === 10 || // 10.0.0.0/8
        (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
        (a === 192 && b === 168) || // 192.168.0.0/16
        (a === 169 && b === 254) || // 169.254.0.0/16 (link-local, includes cloud metadata)
        a === 127 || // 127.0.0.0/8
        a === 0 // 0.0.0.0/8
      ) {
        return false;
      }
    }

    // Block common internal hostnames
    if (
      hostname.endsWith(".internal") ||
      hostname.endsWith(".local") ||
      hostname === "metadata.google.internal"
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * POST /api/jobs/extract
 * Extract job data from a URL using AI
 *
 * Request body: { url: string }
 * Response: { success: true, data: ExtractedJobData } | { success: false, error: string, fallback: { jobPostingUrl: string } }
 */
export async function POST(request: Request) {
  // 1. Auth check
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 2. Validate request body
    const body = await request.json();
    const { url } = extractJobSchema.parse(body);

    // 3. SSRF protection - validate URL before fetching
    if (!isUrlSafeToFetch(url)) {
      return NextResponse.json(
        {
          error:
            "URL not allowed: cannot fetch localhost or private network addresses",
        },
        { status: 400 }
      );
    }

    // 4. Special handling for Arbetsförmedlingen URLs - use their API instead of scraping
    // Note: AF API URLs are trusted and bypass SSRF check since we construct them ourselves
    const afMatch = url.match(
      /arbetsformedlingen\.se\/platsbanken\/annonser\/(\d+)/
    );
    if (afMatch) {
      const jobId = afMatch[1];
      try {
        const apiUrl = `https://platsbanken-api.arbetsformedlingen.se/jobs/v1/job/${jobId}`;
        const response = await fetch(apiUrl, {
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          throw new Error(
            `Arbetsförmedlingen API returned ${response.status}${response.status === 404 ? " (job not found)" : ""}`
          );
        }

        const jobData = await response.json();

        // Transform API response to our format
        const location =
          jobData.workplace?.city && jobData.workplace?.country
            ? `${jobData.workplace.city}, ${jobData.workplace.country}`
            : jobData.workplace?.city || jobData.workplace?.region;

        const noteParts = [];
        if (jobData.occupation) noteParts.push(jobData.occupation);
        if (jobData.positions > 1)
          noteParts.push(`${jobData.positions} positions`);
        if (jobData.lastApplicationDate) {
          const date = new Date(jobData.lastApplicationDate);
          noteParts.push(`Apply by ${date.toLocaleDateString("sv-SE")}`);
        }

        const data = {
          company: jobData.company?.name,
          title: jobData.title,
          location,
          jobPostingUrl: url,
          jobPostingText: jobData.description
            ? htmlToText(jobData.description)
            : undefined,
          notes: noteParts.length > 0 ? noteParts.join(" - ") : undefined,
        };

        return NextResponse.json({
          success: true,
          data,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Unknown error fetching from Arbetsförmedlingen API";

        return NextResponse.json({
          success: false,
          error: errorMessage,
          fallback: { jobPostingUrl: url },
        });
      }
    }

    // 5. Fetch URL content (for non-Arbetsförmedlingen URLs)
    let html: string;
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000), // 10 second timeout
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; GetAJob/1.0; +https://getajob.app)",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} when fetching URL`);
      }

      // Check content type
      const contentType = response.headers.get("content-type");
      if (contentType && !contentType.includes("text/html")) {
        throw new Error(
          `Invalid content type: ${contentType} (expected text/html)`
        );
      }

      html = await response.text();
    } catch (error) {
      // Network/fetch errors - return fallback
      const errorMessage =
        error instanceof Error ? error.message : "Unknown fetch error";

      return NextResponse.json({
        success: false,
        error: errorMessage,
        fallback: { jobPostingUrl: url },
      });
    }

    // 6. Convert HTML to text
    const text = htmlToText(html);

    if (!text || text.length < 50) {
      // Page doesn't have enough content
      return NextResponse.json({
        success: false,
        error: `Insufficient text content (${text.length} characters, minimum 50 required)`,
        fallback: { jobPostingUrl: url },
      });
    }

    // 7. Extract job data with Claude
    try {
      const data = await extractJobData(url, text);

      return NextResponse.json({
        success: true,
        data,
      });
    } catch (error) {
      // Claude API errors - return fallback
      const errorMessage =
        error instanceof Error ? error.message : "Claude API extraction failed";

      return NextResponse.json({
        success: false,
        error: errorMessage,
        fallback: { jobPostingUrl: url },
      });
    }
  } catch (error) {
    // Validation errors
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid URL", details: error.issues },
        { status: 400 }
      );
    }

    // Unexpected errors
    console.error("Error extracting job data:", error);
    return NextResponse.json(
      { error: "Failed to extract job data" },
      { status: 500 }
    );
  }
}
