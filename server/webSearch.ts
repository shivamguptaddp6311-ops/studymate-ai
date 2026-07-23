import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score?: number; // Relevance or source score
  source: "tavily" | "serper";
}

// In-memory cache for searches with 5 minutes TTL
const searchCache = new Map<string, { results: SearchResult[]; sourceUsed: string; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

// Lazy initialize a Gemini client for quick classification
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey.includes("MY_GEMINI_API_KEY")) return null;
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
    });
  }
  return aiInstance;
}

// Helper to check if API key is configured
function isValidKey(key: string | undefined): boolean {
  if (!key) return false;
  const k = key.trim();
  return (
    k !== "" &&
    !k.startsWith("MY_") &&
    !k.includes("YOUR_") &&
    k !== "null" &&
    k !== "undefined" &&
    k.length > 5
  );
}

/**
 * Sanitizes search queries to protect backend commands, keep it clean and short.
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return "";
  return query
    .replace(/[^\w\s\-\u0900-\u097F\?]/gi, "") // Keep English letters, numbers, spaces, hyphens, question marks, and Hindi script (Devanagari)
    .trim()
    .substring(0, 100);
}

/**
 * Automatically determines whether the given user message needs real-time live information.
 */
export async function shouldSearchWeb(message: string): Promise<boolean> {
  if (!message || typeof message !== "string") return false;
  const lower = message.toLowerCase().trim();

  // Strong explicit triggers
  const searchTriggers = [
    "latest", "today", "current", "recent", "newest", "recently", "breaking news",
    "weather", "stock price", "crypto price", "live sports", "sports score",
    "news on", "what happened in", "yesterday", "who won", "current president",
    "released today", "recently released", "scientific discoveries", "game today", "match today"
  ];

  // Strong skip triggers
  const skipTriggers = [
    "solve", "integrate", "derivative", "equation", "math", "board exam", "cbse", "grammar", "history of",
    "how to write", "code", "explain concept", "scientific concept", "physics", "chemistry", "biology"
  ];

  const hasSearchKeyword = searchTriggers.some(trigger => lower.includes(trigger));
  const hasSkipKeyword = skipTriggers.some(trigger => lower.includes(trigger));

  // Heuristic-based shortcut to save latency
  if (hasSkipKeyword && !hasSearchKeyword) {
    return false;
  }
  if (hasSearchKeyword) {
    return true;
  }

  // LLM-based verification to handle intelligent scenarios without false positives
  try {
    const gemini = getGeminiClient();
    if (gemini) {
      const classificationPrompt = `Analyze the following user query and decide if answering it accurately requires live, real-time, or current information from the web (such as current events, breaking news, latest technology, weather, stock prices, sports results, recent scientific discoveries, or terms asking for "latest", "today", "current", "recent", "new").
If the question is a normal educational question, mathematics problem, coding explanation, language/grammar lesson, history concept, board exam prep, or general knowledge that does not require real-time web search, respond with "NO".
Otherwise, if live web search is required, respond with "YES".
Respond with EXACTLY "YES" or "NO" (no other text, explanation, or punctuation).

User Query: "${message}"`;

      // Very fast execution with short timeout
      const response = await Promise.race([
        gemini.models.generateContent({
          model: "gemini-3.5-flash",
          contents: [{ role: "user", parts: [{ text: classificationPrompt }] }],
          config: {
            temperature: 0.1,
            maxOutputTokens: 5,
          }
        }),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2500))
      ]);

      if (response && response.text) {
        const decision = response.text.toUpperCase().trim();
        if (decision.includes("YES")) {
          console.log(`[WebSearch] Intelligent Decision: live web search is REQUIRED for query: "${message.substring(0, 40)}..."`);
          return true;
        }
      }
    }
  } catch (err) {
    console.warn("[WebSearch] Intelligent trigger decision failed or timed out. Falling back to keyword heuristics.", err);
  }

  return false;
}

/**
 * Helper to fetch with a specific timeout.
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Helper to retry an operation with exponential backoff.
 */
async function retryWithBackoff<T>(operation: () => Promise<T>, retries = 2, delayMs = 300): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)));
      }
    }
  }
  throw lastError;
}

/**
 * Searches Tavily API.
 */
async function searchTavily(query: string, timeoutMs = 6000): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey || !isValidKey(apiKey)) {
    throw new Error("Tavily API key is not configured.");
  }

  return await retryWithBackoff(async () => {
    const response = await fetchWithTimeout("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        max_results: 5,
        search_depth: "basic"
      })
    }, timeoutMs);

    if (!response.ok) {
      throw new Error(`Tavily HTTP error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.results || !Array.isArray(data.results)) {
      throw new Error("Invalid response format from Tavily.");
    }

    return data.results.map((r: any) => ({
      title: r.title || "Untitled Source",
      url: r.url || "",
      content: r.content || "",
      score: r.score || 0.6,
      source: "tavily" as const
    })).filter((r: any) => r.url);
  });
}

/**
 * Searches Serper (Google Search) API.
 */
async function searchSerper(query: string, timeoutMs = 6000): Promise<SearchResult[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey || !isValidKey(apiKey)) {
    throw new Error("Serper API key is not configured.");
  }

  return await retryWithBackoff(async () => {
    const response = await fetchWithTimeout("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        q: query,
        num: 5
      })
    }, timeoutMs);

    if (!response.ok) {
      throw new Error(`Serper HTTP error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.organic || !Array.isArray(data.organic)) {
      throw new Error("Invalid response format from Serper.");
    }

    return data.organic.map((r: any, idx: number) => ({
      title: r.title || "Untitled Source",
      url: r.link || "",
      content: r.snippet || "",
      score: 1.0 - (idx * 0.1), // Fallback scoring from rank
      source: "serper" as const
    })).filter((r: any) => r.url);
  });
}

/**
 * Normalizes URL to identify duplicates.
 */
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    let normalized = u.hostname.replace("www.", "") + u.pathname;
    if (normalized.endsWith("/")) {
      normalized = normalized.slice(0, -1);
    }
    return normalized.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Deduplicates and ranks results by quality/relevance.
 */
function mergeAndRankResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const unique: SearchResult[] = [];

  for (const r of results) {
    const norm = normalizeUrl(r.url);
    if (!seen.has(norm)) {
      seen.add(norm);
      unique.push(r);
    }
  }

  // Sort by score descending (highest quality or relevance first)
  return unique.sort((a, b) => {
    const scoreA = a.score ?? 0.5;
    const scoreB = b.score ?? 0.5;
    return scoreB - scoreA;
  });
}

/**
 * Searches web using Tavily with automatic fallback to Serper.
 */
export async function executeWebSearch(query: string): Promise<{ results: SearchResult[]; sourceUsed: string }> {
  const sanitized = sanitizeSearchQuery(query);
  if (!sanitized) {
    return { results: [], sourceUsed: "empty" };
  }

  // Check cache
  const cached = searchCache.get(sanitized);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    console.log(`[WebSearch] Cache HIT for query: "${sanitized}"`);
    return cached;
  }

  let results: SearchResult[] = [];
  let sourceUsed = "";

  // 1. Try Tavily
  try {
    results = await searchTavily(sanitized);
    sourceUsed = "tavily";
    console.log(`[WebSearch] Tavily returned ${results.length} results.`);
  } catch (err: any) {
    console.warn(`[WebSearch] Tavily search failed: ${err.message || err}. Trying Serper fallback...`);
  }

  // 2. If Tavily failed, returned no/insufficient results (< 2), try Serper
  if (results.length < 2) {
    try {
      const serperResults = await searchSerper(sanitized);
      console.log(`[WebSearch] Serper returned ${serperResults.length} results.`);
      if (serperResults.length > 0) {
        results = [...results, ...serperResults];
        sourceUsed = sourceUsed ? `${sourceUsed}_fallback_serper` : "serper";
      }
    } catch (err: any) {
      console.error(`[WebSearch] Serper fallback search failed: ${err.message || err}`);
    }
  }

  if (results.length > 0) {
    const finalResults = mergeAndRankResults(results);
    const finalPayload = { results: finalResults, sourceUsed, timestamp: Date.now() };
    searchCache.set(sanitized, finalPayload);
    return { results: finalResults, sourceUsed };
  }

  throw new Error("Both Tavily and Serper searches failed or returned no results.");
}
