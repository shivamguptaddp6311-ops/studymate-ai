/**
 * Student Content Safety Filter
 * Ensures search queries and API results adhere to school/educational safety guidelines.
 */

const UNSAFE_KEYWORDS = [
  "nsfw", "porn", "adult", "erotic", "nude", "nudity", "sex", "sexual",
  "violence", "blood", "gore", "weapon", "drugs", "suicide", "murder",
  "hate", "terror", "explicit", "gambling", "alcohol", "tobacco", "vape"
];

// Curated scientific/educational sources treated as inherently safe
const INHERENTLY_SAFE_PROVIDERS = new Set<string>([
  "wikimedia",
  "wikipedia",
  "pubchem",
  "nasa",
  "mermaid",
  "kroki"
]);

export class SafetyFilter {
  /**
   * Stage 1: Pre-query check
   * Blocks obviously inappropriate or non-educational queries before making any provider calls.
   */
  static isQuerySafe(query: string): boolean {
    if (!query || typeof query !== "string") return true;
    const lower = query.trim().toLowerCase();
    return !UNSAFE_KEYWORDS.some(kw => lower.includes(kw));
  }

  /**
   * Stage 2: Post-result check
   * For Unsplash and final AI-image fallback (GenerativeProvider) which have no native safeSearch,
   * runs a lightweight category/keyword check on results before rendering.
   * Wikimedia, Wikipedia, PubChem, NASA, Mermaid, and Kroki skip step 2.
   */
  static isResultSafe(
    providerId: string,
    title: string,
    description?: string,
    tags?: string[]
  ): boolean {
    if (INHERENTLY_SAFE_PROVIDERS.has(providerId.toLowerCase())) {
      return true;
    }

    const textToCheck = `${title || ""} ${description || ""} ${(tags || []).join(" ")}`.toLowerCase();
    return !UNSAFE_KEYWORDS.some(kw => textToCheck.includes(kw));
  }

  static filterResults<T extends { provider?: string; title: string; description?: string }>(
    results: T[]
  ): T[] {
    return results.filter(r => this.isResultSafe(r.provider || "unknown", r.title, r.description));
  }
}

