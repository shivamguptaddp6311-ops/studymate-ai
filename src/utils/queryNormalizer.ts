/**
 * Query Normalizer for Educational Visual Search & Firestore Caching
 * Handles Hinglish, Hindi, conversational filler phrases, and generates normalized cache keys.
 */

const FILLER_WORDS = [
  "mujhe", "chahiye", "dedo", "do", "batao", "dikhao", "dikhao na", "dikhao bhai",
  "kaise", "hota", "hoti", "hai", "ka", "ki", "ke", "ko", "par", "se", "main", "mein",
  "kya", "kyun", "kab", "kahan", "plz", "please", "can you", "show me", "give me",
  "draw", "generate", "create", "make", "banao", "i want", "need", "a", "an", "the",
  "diagram of", "picture of", "photo of", "image of", "video of", "video for",
  "explain", "about", "chitra", "photo", "image", "diagram"
];

const INTENT_MARKERS = [
  "labelled diagram", "labeled diagram", "diagram", "flowchart", "mindmap",
  "mind map", "algorithm", "process flow", "video", "tutorial", "animation",
  "photo", "picture", "chemical structure", "molecule", "formula", "space", "planet"
];

/**
 * Normalizes user query for caching:
 * Lowercases, trims, collapses whitespace, strips filler words ("ka", "banao", "please", "diagram of", etc.)
 */
export function normalizeQuery(query: string): { normalizedQuery: string; queryHash: string } {
  if (!query || typeof query !== "string") {
    return { normalizedQuery: "", queryHash: "empty" };
  }

  // 1. Lowercase and trim
  let cleaned = query.toLowerCase().trim();

  // 2. Collapse whitespace and strip punctuation
  cleaned = cleaned.replace(/[?.,!/\\#@$%^&*()_+=\-[\]{}|;:'"<>]+/g, " ");

  // 3. Filter out filler words
  const words = cleaned.split(/\s+/).filter(Boolean);
  const filteredWords = words.filter(w => !FILLER_WORDS.includes(w) && w.length > 1);

  // Rejoin filtered words
  let normalizedQuery = filteredWords.join(" ").trim();

  // If filtering removed everything, fall back to cleaned word string
  if (!normalizedQuery) {
    normalizedQuery = words.join(" ").trim();
  }

  // Create simple alphanumeric hash for cache key
  const queryHash = normalizedQuery.replace(/[^a-z0-9]+/g, "_").slice(0, 80) || "default_hash";

  return { normalizedQuery, queryHash };
}

export function extractCoreTopic(query: string): string {
  const { normalizedQuery } = normalizeQuery(query);
  return normalizedQuery;
}

export function sanitizeSearchQuery(query: string): string {
  if (!query) return "";
  return query
    .trim()
    .replace(/[<>"'%]/g, "")
    .slice(0, 150);
}

