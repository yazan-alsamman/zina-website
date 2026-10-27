import "server-only";
import DOMPurify from "isomorphic-dompurify";
import { cacheLife } from "next/cache";
import { REVIEW_ALLOWED_TAGS, renderReview } from "./review-markup";

// SVG references may only point inside the document (e.g. href="#gradient"): no external
// resources, no javascript: URLs.
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  for (const name of ["href", "xlink:href"]) {
    const value = node.getAttribute?.(name);
    if (value !== null && value !== undefined && !value.trim().startsWith("#")) {
      node.removeAttribute(name);
    }
  }
});

/** Sanitises an uploaded SVG logo. Returns null if nothing usable remains. */
export function sanitizeSvg(source: string): string | null {
  const clean = DOMPurify.sanitize(source, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ["style", "script", "foreignObject", "image", "a"],
    FORBID_ATTR: ["style"],
  });
  return /<svg[\s>]/i.test(clean) ? clean : null;
}

/** Review Markdown -> HTML with only the allowed tags and no attributes. */
export function reviewToSafeHtml(markdown: string | null | undefined): string {
  if (!markdown) return "";
  return DOMPurify.sanitize(renderReview(markdown), {
    ALLOWED_TAGS: REVIEW_ALLOWED_TAGS,
    ALLOWED_ATTR: [],
  });
}

/**
 * Cached form of reviewToSafeHtml for pages: the output depends only on the input, and caching
 * keeps jsdom (which reads the clock) out of prerendering.
 */
export async function cachedReviewHtml(markdown: string | null | undefined): Promise<string> {
  "use cache";
  cacheLife("max");
  return reviewToSafeHtml(markdown);
}
