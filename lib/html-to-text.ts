/**
 * Converts HTML to plain text for AI processing.
 * Strips scripts, styles, and navigation elements while preserving content structure.
 */

const MAX_TEXT_LENGTH = 10000;

// HTML entities to decode
const HTML_ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&mdash;": "—",
  "&ndash;": "–",
  "&hellip;": "…",
  "&bull;": "•",
};

/**
 * Remove tags that don't contribute to job posting content
 */
function stripNonContentTags(html: string): string {
  // Remove scripts, styles, navigation, footer, header, and comments
  const cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "")
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "")
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  return cleaned;
}

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text: string): string {
  let decoded = text;

  // Replace known entities
  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    decoded = decoded.replace(new RegExp(entity, "g"), char);
  }

  // Replace numeric entities (&#123; and &#xAB;)
  decoded = decoded
    .replace(/&#(\d+);/g, (_match, dec) => String.fromCharCode(parseInt(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );

  return decoded;
}

/**
 * Extract text content from HTML tags
 */
function extractTextContent(html: string): string {
  // Replace block-level elements with newlines to preserve structure
  let text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, " | ");

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");

  return text;
}

/**
 * Clean up whitespace
 */
function normalizeWhitespace(text: string): string {
  return (
    text
      // Replace multiple spaces with single space
      .replace(/ +/g, " ")
      // Replace multiple newlines with double newline (paragraph break)
      .replace(/\n\n\n+/g, "\n\n")
      // Trim each line
      .split("\n")
      .map((line) => line.trim())
      .join("\n")
      // Remove leading/trailing whitespace
      .trim()
  );
}

/**
 * Truncate text to maximum length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  // Reserve space for "..." if we need to hard truncate
  const ellipsis = "...";
  const truncated = text.substring(0, maxLength);
  const lastParagraphBreak = truncated.lastIndexOf("\n\n");

  if (lastParagraphBreak > maxLength * 0.8) {
    // If paragraph break is in last 20%, use it
    return truncated.substring(0, lastParagraphBreak).trim();
  }

  // Otherwise, truncate at last newline
  const lastNewline = truncated.lastIndexOf("\n");
  if (lastNewline > maxLength * 0.8) {
    return truncated.substring(0, lastNewline).trim();
  }

  // Last resort: hard truncate (account for ellipsis length)
  return truncated.substring(0, maxLength - ellipsis.length).trim() + ellipsis;
}

/**
 * Convert HTML to plain text suitable for AI processing
 * @param html - Raw HTML string
 * @returns Cleaned plain text
 */
export function htmlToText(html: string): string {
  if (!html || typeof html !== "string") {
    return "";
  }

  // Step 1: Remove non-content tags
  let text = stripNonContentTags(html);

  // Step 2: Extract text from remaining HTML
  text = extractTextContent(text);

  // Step 3: Decode HTML entities
  text = decodeHtmlEntities(text);

  // Step 4: Normalize whitespace
  text = normalizeWhitespace(text);

  // Step 5: Truncate to max length
  text = truncateText(text, MAX_TEXT_LENGTH);

  return text;
}
