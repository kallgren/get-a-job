import { describe, it, expect } from "vitest";
import { htmlToText } from "./html-to-text";

describe("htmlToText", () => {
  describe("basic HTML conversion", () => {
    it("converts simple HTML to text", () => {
      const html = "<p>Hello world</p>";
      const result = htmlToText(html);

      expect(result).toBe("Hello world");
    });

    it("preserves text content from multiple paragraphs", () => {
      const html = "<p>First paragraph</p><p>Second paragraph</p>";
      const result = htmlToText(html);

      expect(result).toContain("First paragraph");
      expect(result).toContain("Second paragraph");
    });

    it("handles empty or invalid input", () => {
      expect(htmlToText("")).toBe("");
      expect(htmlToText(null as unknown as string)).toBe("");
      expect(htmlToText(undefined as unknown as string)).toBe("");
    });
  });

  describe("tag removal", () => {
    it("removes script tags and their content", () => {
      const html =
        '<p>Job posting</p><script>alert("bad")</script><p>More info</p>';
      const result = htmlToText(html);

      expect(result).toContain("Job posting");
      expect(result).toContain("More info");
      expect(result).not.toContain("script");
      expect(result).not.toContain("alert");
    });

    it("removes style tags and their content", () => {
      const html =
        "<p>Content</p><style>.class { color: red; }</style><p>More</p>";
      const result = htmlToText(html);

      expect(result).toContain("Content");
      expect(result).toContain("More");
      expect(result).not.toContain("style");
      expect(result).not.toContain("color");
    });

    it("removes navigation elements", () => {
      const html = "<nav><a>Home</a></nav><p>Job description</p>";
      const result = htmlToText(html);

      expect(result).toContain("Job description");
      expect(result).not.toContain("Home");
    });

    it("removes footer elements", () => {
      const html = "<p>Job details</p><footer>Copyright 2024</footer>";
      const result = htmlToText(html);

      expect(result).toContain("Job details");
      expect(result).not.toContain("Copyright");
    });

    it("removes header elements", () => {
      const html = "<header><h1>Site Title</h1></header><p>Job content</p>";
      const result = htmlToText(html);

      expect(result).toContain("Job content");
      expect(result).not.toContain("Site Title");
    });

    it("removes HTML comments", () => {
      const html =
        "<p>Visible</p><!-- This is a comment --><p>Also visible</p>";
      const result = htmlToText(html);

      expect(result).toContain("Visible");
      expect(result).toContain("Also visible");
      expect(result).not.toContain("comment");
    });
  });

  describe("HTML entity decoding", () => {
    it("decodes common HTML entities", () => {
      const html = "<p>AT&amp;T &lt;Company&gt; &quot;Quote&quot;</p>";
      const result = htmlToText(html);

      expect(result).toContain('AT&T <Company> "Quote"');
    });

    it("decodes non-breaking spaces", () => {
      const html = "<p>Hello&nbsp;World</p>";
      const result = htmlToText(html);

      expect(result).toBe("Hello World");
    });

    it("decodes special characters", () => {
      const html = "<p>Em&mdash;dash, en&ndash;dash, &hellip;ellipsis</p>";
      const result = htmlToText(html);

      expect(result).toContain("—");
      expect(result).toContain("–");
      expect(result).toContain("…");
    });

    it("decodes numeric HTML entities", () => {
      const html = "<p>&#65; &#66; &#67;</p>"; // A B C
      const result = htmlToText(html);

      expect(result).toBe("A B C");
    });

    it("decodes hexadecimal HTML entities", () => {
      const html = "<p>&#x41; &#x42; &#x43;</p>"; // A B C
      const result = htmlToText(html);

      expect(result).toBe("A B C");
    });
  });

  describe("structure preservation", () => {
    it("preserves line breaks", () => {
      const html = "<p>Line 1<br>Line 2</p>";
      const result = htmlToText(html);

      expect(result).toMatch(/Line 1\s+Line 2/);
    });

    it("converts block elements to newlines", () => {
      const html = "<div>Block 1</div><div>Block 2</div>";
      const result = htmlToText(html);

      expect(result).toMatch(/Block 1\s+Block 2/);
    });

    it("preserves list structure", () => {
      const html = "<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>";
      const result = htmlToText(html);

      expect(result).toContain("Item 1");
      expect(result).toContain("Item 2");
      expect(result).toContain("Item 3");
      // Items should be on separate lines
      expect(result.split("\n").length).toBeGreaterThan(1);
    });

    it("handles headings with proper spacing", () => {
      const html = "<h1>Title</h1><p>Content</p><h2>Subtitle</h2>";
      const result = htmlToText(html);

      expect(result).toContain("Title");
      expect(result).toContain("Content");
      expect(result).toContain("Subtitle");
    });
  });

  describe("whitespace normalization", () => {
    it("collapses multiple spaces to single space", () => {
      const html = "<p>Too     many     spaces</p>";
      const result = htmlToText(html);

      expect(result).toBe("Too many spaces");
    });

    it("limits consecutive newlines to two", () => {
      const html = "<p>Para 1</p><br><br><br><br><p>Para 2</p>";
      const result = htmlToText(html);

      // Should not have more than 2 consecutive newlines
      expect(result).not.toMatch(/\n\n\n+/);
    });

    it("trims whitespace from each line", () => {
      const html = "<p>  Spaces before  </p><p>  and after  </p>";
      const result = htmlToText(html);

      const lines = result.split("\n");
      lines.forEach((line) => {
        expect(line).toBe(line.trim());
      });
    });

    it("trims leading and trailing whitespace from result", () => {
      const html = "  <p>Content</p>  ";
      const result = htmlToText(html);

      expect(result).toBe("Content");
      expect(result[0]).not.toBe(" ");
      expect(result[result.length - 1]).not.toBe(" ");
    });
  });

  describe("truncation", () => {
    it("truncates very long text to max length", () => {
      // Create HTML with > 10,000 characters
      const longHtml =
        "<p>" + "A".repeat(15000) + "</p><p>This should be cut off</p>";
      const result = htmlToText(longHtml);

      expect(result.length).toBeLessThanOrEqual(10000);
    });

    it("truncates at paragraph break when possible", () => {
      // Create text close to limit with paragraph break
      const html =
        "<p>" +
        "A".repeat(9000) +
        "</p><p>" +
        "B".repeat(2000) +
        "</p><p>Should not appear</p>";
      const result = htmlToText(html);

      expect(result).toContain("A");
      expect(result).not.toContain("Should not appear");
    });

    it("does not truncate text under max length", () => {
      const html = "<p>Short text</p>";
      const result = htmlToText(html);

      expect(result).toBe("Short text");
      expect(result).not.toContain("...");
    });
  });

  describe("malformed HTML handling", () => {
    it("handles unclosed tags", () => {
      const html = "<p>Unclosed paragraph<div>Unclosed div";
      const result = htmlToText(html);

      expect(result).toContain("Unclosed paragraph");
      expect(result).toContain("Unclosed div");
    });

    it("handles nested tags", () => {
      const html = "<div><p><span>Nested content</span></p></div>";
      const result = htmlToText(html);

      expect(result).toBe("Nested content");
    });

    it("handles mixed valid and invalid HTML", () => {
      const html = "<p>Valid</p><invalid>Text</invalid><p>Also valid</p>";
      const result = htmlToText(html);

      expect(result).toContain("Valid");
      expect(result).toContain("Text");
      expect(result).toContain("Also valid");
    });
  });

  describe("real-world job posting scenarios", () => {
    it("extracts job posting with typical structure", () => {
      const html = `
        <header><h1>Company Site</h1></header>
        <nav><a href="/">Home</a></nav>
        <main>
          <h1>Senior Developer</h1>
          <div class="company">Acme Corp</div>
          <div class="location">Stockholm, Sweden</div>
          <div class="description">
            <p>We are looking for a talented developer to join our team.</p>
            <h2>Requirements:</h2>
            <ul>
              <li>5+ years of experience</li>
              <li>Strong TypeScript skills</li>
              <li>Experience with React</li>
            </ul>
            <h2>What we offer:</h2>
            <p>Competitive salary &amp; benefits</p>
          </div>
        </main>
        <footer>Copyright 2024</footer>
        <script>analytics.track();</script>
      `;

      const result = htmlToText(html);

      // Should include job content
      expect(result).toContain("Senior Developer");
      expect(result).toContain("Acme Corp");
      expect(result).toContain("Stockholm, Sweden");
      expect(result).toContain("5+ years of experience");
      expect(result).toContain("TypeScript");
      expect(result).toContain("Competitive salary & benefits");

      // Should NOT include navigation/footer/scripts
      expect(result).not.toContain("Company Site");
      expect(result).not.toContain("Home");
      expect(result).not.toContain("Copyright");
      expect(result).not.toContain("analytics");
    });

    it("handles job posting with minimal HTML", () => {
      const html = "Software Engineer at Tech Co. Remote position.";
      const result = htmlToText(html);

      expect(result).toBe("Software Engineer at Tech Co. Remote position.");
    });

    it("extracts from job posting with tables", () => {
      const html = `
        <table>
          <tr><td>Position</td><td>Developer</td></tr>
          <tr><td>Location</td><td>Remote</td></tr>
        </table>
      `;
      const result = htmlToText(html);

      expect(result).toContain("Position");
      expect(result).toContain("Developer");
      expect(result).toContain("Location");
      expect(result).toContain("Remote");
    });
  });
});
