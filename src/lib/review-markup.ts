/**
 * Zina's reviews are written in a tiny Markdown subset and stored as Markdown:
 *   - blank line  -> new paragraph
 *   - **bold**
 *   - lines starting with "- " -> bulleted list, "1. " -> numbered list
 * The renderer escapes every character of user text first and only then adds a fixed set of
 * tags, so it cannot produce script, attributes or links. Server-side DOMPurify runs on top as
 * defence in depth (see src/lib/sanitize.ts).
 */

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

function inline(text: string): string {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

export function renderReview(markdown: string): string {
  const blocks = markdown
    .replace(/\r\n?/g, "\n")
    .trim()
    .split(/\n{2,}/);
  const html: string[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((line) => line.trimEnd());
    if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
      html.push(
        `<ul>${lines.map((line) => `<li>${inline(line.replace(/^\s*[-*]\s+/, ""))}</li>`).join("")}</ul>`,
      );
    } else if (lines.every((line) => /^\s*\d+[.)]\s+/.test(line))) {
      html.push(
        `<ol>${lines.map((line) => `<li>${inline(line.replace(/^\s*\d+[.)]\s+/, ""))}</li>`).join("")}</ol>`,
      );
    } else if (block.trim()) {
      html.push(`<p>${lines.map(inline).join("<br>")}</p>`);
    }
  }

  return html.join("");
}

/** Allowed output tags, shared with the DOMPurify configuration. */
export const REVIEW_ALLOWED_TAGS = ["p", "br", "strong", "ul", "ol", "li"];
