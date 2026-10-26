const MAX_LENGTH = 80;

/**
 * URL slug from a (usually English) name: lowercase ASCII, accents folded, words joined by
 * single hyphens. Returns "" when nothing usable remains (e.g. an Arabic-only name).
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // combining accents: "Lancôme" -> "Lancome"
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_LENGTH)
    .replace(/-+$/g, "");
}

/** Only lowercase letters, digits and single inner hyphens. */
export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= MAX_LENGTH && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/**
 * Makes `base` unique with -2, -3 … suffixes. `exists` checks the database (and should ignore
 * the record being edited).
 */
export async function uniqueSlug(
  base: string,
  exists: (candidate: string) => Promise<boolean>,
  fallback = "item",
): Promise<string> {
  const root = slugify(base) || fallback;
  if (!(await exists(root))) return root;
  for (let n = 2; n < 1000; n++) {
    const suffix = `-${n}`;
    const candidate = `${root.slice(0, MAX_LENGTH - suffix.length)}${suffix}`;
    if (!(await exists(candidate))) return candidate;
  }
  throw new Error(`Could not find a free slug for "${root}"`);
}
