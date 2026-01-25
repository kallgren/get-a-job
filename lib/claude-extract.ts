/**
 * Claude API integration for extracting structured job data from text
 */

import type { ExtractedJobData } from "@/lib/schemas";

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-5-20250929";
const MAX_TOKENS = 4096; // Increased to handle longer job descriptions

// Re-export the type for consumers of this module
export type { ExtractedJobData };

/**
 * Extract structured job data from text using Claude API
 * @param url - Original job posting URL
 * @param text - Plain text content from job posting
 * @returns Extracted job data
 * @throws Error if API key is missing, API call fails, or response is invalid
 */
export async function extractJobData(
  url: string,
  text: string
): Promise<ExtractedJobData> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }

  const prompt = buildExtractionPrompt(text);

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Claude API request failed: ${response.status} ${errorText}`
      );
    }

    const data = await response.json();

    // Extract text content from Claude's response
    const content = data.content?.[0]?.text;
    if (!content) {
      throw new Error("No content in Claude API response");
    }

    // Parse the JSON from Claude's response
    const extractedData = parseClaudeResponse(content);

    // Add the original URL to the extracted data
    return {
      ...extractedData,
      jobPostingUrl: url,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Unknown error extracting job data");
  }
}

/**
 * Build the extraction prompt for Claude
 */
function buildExtractionPrompt(text: string): string {
  return `You are a job posting data extractor. Extract structured information from the following job posting text.

Return a JSON object with these fields (use null for missing fields):
{
  "company": "Company name",
  "title": "Job title",
  "location": "City, Country or 'Remote'",
  "jobPostingText": "Full cleaned job description",
  "notes": "2-3 sentence summary of key requirements or highlights"
}

Important:
- Extract whatever fields you can find, all fields are optional
- location should be concise (e.g., "Stockholm, Sweden" or "Remote")
- jobPostingText should be the full, cleaned job description
- Keep notes brief and relevant (2-3 sentences max)
- Return ONLY valid JSON, no additional commentary

Job posting text:
${text}`;
}

/**
 * Parse Claude's response and extract JSON
 * Handles both raw JSON and markdown-wrapped JSON (```json...```)
 */
function parseClaudeResponse(
  content: string
): Omit<ExtractedJobData, "jobPostingUrl"> {
  let jsonStr = content.trim();

  // Remove markdown code block if present
  const markdownJsonMatch = jsonStr.match(/```json\s*\n([\s\S]*?)\n```/);
  if (markdownJsonMatch) {
    jsonStr = markdownJsonMatch[1].trim();
  } else {
    // Try to extract JSON from anywhere in the content
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
  }

  try {
    const parsed = JSON.parse(jsonStr);

    // Return extracted data (all fields optional)
    return {
      company: parsed.company || undefined,
      title: parsed.title || undefined,
      location: parsed.location || undefined,
      jobPostingText: parsed.jobPostingText || undefined,
      notes: parsed.notes || undefined,
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse JSON from Claude response: ${jsonStr}`);
    }
    throw error;
  }
}
