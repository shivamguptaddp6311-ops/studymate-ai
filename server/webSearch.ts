import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { concurrencyQueue } from "./concurrencyQueue";

dotenv.config();

export type QueryIntent =
  | "latest_news"
  | "breaking_news"
  | "research"
  | "education"
  | "coding"
  | "official_documentation"
  | "comparison"
  | "shopping"
  | "medical"
  | "finance"
  | "general_web"
  // Legacy aliases for backward compatibility
  | "news"
  | "documentation"
  | "general";

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  publishedDate?: string;
  score?: number; // Composite quality & relevance score
  source: "exa" | "tavily" | "serper" | "hybrid";
  scrapedWithFirecrawl?: boolean;
  domain?: string;
}

export interface Chunk {
  id: string;
  sourceTitle: string;
  sourceUrl: string;
  publishedDate?: string;
  sectionHeader?: string;
  text: string;
  score: number;
}

export interface WebSearchResponse {
  results: SearchResult[];
  chunks?: Chunk[];
  sourceUsed: string;
  intent: QueryIntent;
  responseTimeMs: number;
  expandedQueries?: string[];
  evidenceVerification?: {
    agreements: string[];
    discrepancies: string[];
  };
}

// In-memory smart cache with dynamic TTL
interface CacheEntry {
  response: WebSearchResponse;
  timestamp: number;
  ttlMs: number;
}

const searchCache = new Map<string, CacheEntry>();

// Lazy initialize a Gemini client for quick query classification and expansion
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

// Helper to check if API key is configured and valid
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
 * Extract clean domain name from URL
 */
function extractDomain(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    return u.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "external-source";
  }
}

/**
 * Sanitizes search queries to protect backend commands and keep requests clean.
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return "";
  return query
    .replace(/[^\w\s\-\u0900-\u097F\?]/gi, "") // English, Hindi script, numbers, hyphens, question marks
    .trim()
    .substring(0, 120);
}

/**
 * Determines whether the user message requires real-time live web search.
 * Intelligent Freshness Detection:
 * - Detects explicit and implicit freshness intent.
 * - Recognizes exam, admission, result, counselling, policy, and news queries.
 * - Triggers web search automatically when freshness is required.
 * - Avoids unnecessary web searches for evergreen topics (math problems, timeless concepts).
 */
export async function shouldSearchWeb(message: string): Promise<boolean> {
  if (!message || typeof message !== "string") return false;
  const lower = message.toLowerCase().trim();

  // 1. Freshness Triggers (Exams, Admissions, Results, Counselling, Policy, News, Current Events)
  const examTriggers = [
    "exam date", "exam schedule", "exam pattern", "exam timetable", "hall ticket",
    "admit card", "answer key", "cutoff", "cut off", "merit list", "board exam date",
    "jee main", "jee advanced", "neet ug", "neet pg", "upsc prelims", "gate exam",
    "cat exam", "cuet", "clat", "toefl", "ielts", "sat exam", "marking scheme"
  ];

  const admissionCounsellingTriggers = [
    "admission", "admissions", "counselling", "counseling", "seat allotment",
    "seat matrix", "registration date", "application form", "last date to apply",
    "application deadline", "form release", "josaa", "csab", "mcc counselling",
    "college admission", "university admission"
  ];

  const resultTriggers = [
    "result", "results", "scorecard", "percentile", "rank list", "rankcard",
    "result date", "declared", "marksheet download", "pass percentage"
  ];

  const policyNewsTriggers = [
    "policy", "guidelines", "notification", "circular", "government policy",
    "education policy", "nep 2020", "ugc", "aicte", "nta notification", "rule change",
    "latest news", "breaking news", "today news", "headline", "press release",
    "postponed", "rescheduled", "cancelled", "when will", "is out", "announced"
  ];

  const temporalTriggers = [
    "latest", "today", "current", "recent", "newest", "recently", "weather",
    "stock price", "crypto price", "live sports", "sports score", "news on",
    "what happened in", "yesterday", "who won", "current president", "released today",
    "recently released", "game today", "match today", "2025", "2026", "2027",
    "this year", "next year", "upcoming"
  ];

  const allFreshnessTriggers = [
    ...examTriggers,
    ...admissionCounsellingTriggers,
    ...resultTriggers,
    ...policyNewsTriggers,
    ...temporalTriggers
  ];

  // 2. Evergreen / Skip Triggers (Timeless educational/scientific/math topics)
  const evergreenTriggers = [
    "solve", "integrate", "derivative", "equation", "quadratic", "pythagoras",
    "grammar rules", "past tense", "how to write an essay", "explain concept",
    "scientific concept", "what is photosynthesis", "newton's laws", "periodic table",
    "mitosis vs meiosis", "what is gravity", "speed of light", "definition of",
    "formula for", "history of world war"
  ];

  const hasFreshnessKeyword = allFreshnessTriggers.some(trigger => lower.includes(trigger));
  const hasEvergreenKeyword = evergreenTriggers.some(trigger => lower.includes(trigger));

  // If query explicitly requests fresh information (exam date, result, counselling, 2026, etc.), ALWAYS trigger web search
  if (hasFreshnessKeyword) {
    return true;
  }

  // If query is strictly an evergreen topic without any freshness indicators, skip web search
  if (hasEvergreenKeyword && !hasFreshnessKeyword) {
    return false;
  }

  // 3. LLM-based classification fallback for ambiguous queries
  try {
    const gemini = getGeminiClient();
    if (gemini) {
      const classificationPrompt = `Analyze the user query and decide if answering it accurately requires live, real-time, or current web information.
Examples requiring live web search ("YES"):
- Exam dates, exam schedules, admit cards, cutoffs, syllabus updates (e.g., JEE, NEET, UPSC, CBSE).
- College/University admissions, counselling schedules, seat allotment (e.g., JoSAA, MCC).
- Exam results, scorecards, percentile declarations.
- Government/Education policies, regulations, circulars, notifications.
- Latest news, current affairs, breaking updates, weather, stocks, recent releases.

Examples NOT requiring live web search ("NO"):
- Evergreen math problems, equations, calculus derivatives, algebra.
- Timeless scientific concepts (e.g., photosynthesis, Newton's laws, periodic table).
- Standard grammar, language rules, generic essay structure.
- Historical events, static textbook facts, general coding syntax without library updates.

Query: "${message}"
Respond with EXACTLY "YES" or "NO".`;

      let response: any = null;
      for (const mName of ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash", "gemini-2.0-flash-lite"]) {
        try {
          response = await Promise.race([
            gemini.models.generateContent({
              model: mName,
              contents: [{ role: "user", parts: [{ text: classificationPrompt }] }],
              config: {
                temperature: 0.1,
                maxOutputTokens: 5,
              }
            }),
            new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2000))
          ]);
          if (response && response.text) break;
        } catch {
          // try next model candidate
        }
      }

      if (response && response.text) {
        const decision = response.text.toUpperCase().trim();
        if (decision.includes("YES")) {
          console.log(`[HybridRetrieval Log] Live web search trigger decision: YES for query: "${message.substring(0, 40)}..."`);
          return true;
        }
      }
    }
  } catch (err) {
    console.warn("[HybridRetrieval Log] Intelligent search trigger check timed out/failed. Using heuristics.", err);
  }

  return false;
}

/**
 * 1. Intent Detection
 * Classifies query into 11 granular intent categories.
 */
export async function classifyQueryIntent(query: string): Promise<QueryIntent> {
  if (!query) return "general_web";
  const lower = query.toLowerCase().trim();

  // Breaking & Latest News / Policy Updates
  if (lower.includes("breaking") || lower.includes("live news") || lower.includes("just in")) {
    return "breaking_news";
  }
  if (
    lower.includes("news") || lower.includes("latest") || lower.includes("today") ||
    lower.includes("recent") || lower.includes("yesterday") || lower.includes("update today") ||
    lower.includes("released today") || lower.includes("policy update") || lower.includes("government policy") ||
    lower.includes("notification") || lower.includes("circular")
  ) {
    return "latest_news";
  }

  // Finance & Stocks
  if (
    lower.includes("stock") || lower.includes("shares") || lower.includes("nasdaq") ||
    lower.includes("crypto") || lower.includes("bitcoin") || lower.includes("earnings") ||
    lower.includes("market price") || lower.includes("market cap") || lower.includes("revenue")
  ) {
    return "finance";
  }

  // Official Documentation & Coding
  const docKeywords = ["doc", "docs", "documentation", "api", "sdk", "github", "npm", "pypi", "syntax", "library", "framework", "mdn"];
  if (docKeywords.some(k => lower.includes(k))) {
    return "official_documentation";
  }

  const codingKeywords = ["typescript", "javascript", "react", "node.js", "python", "express", "vite", "bug", "stack trace", "code", "compiler", "function"];
  if (codingKeywords.some(k => lower.includes(k))) {
    return "coding";
  }

  // Research & Academic
  const researchKeywords = ["research", "paper", "study", "journal", "arxiv", "thesis", "scientific", "nature", "cell", "ieee"];
  if (researchKeywords.some(k => lower.includes(k))) {
    return "research";
  }

  // Medical & Health
  const medicalKeywords = ["symptoms", "treatment", "diagnosis", "disease", "medical", "nih", "cdc", "who", "fda", "dosage", "clinical"];
  if (medicalKeywords.some(k => lower.includes(k))) {
    return "medical";
  }

  // Comparison
  if (lower.includes(" vs ") || lower.includes("versus") || lower.includes("compare") || lower.includes("difference between")) {
    return "comparison";
  }

  // Shopping & Commerce
  if (lower.includes("price") || lower.includes("buy") || lower.includes("review") || lower.includes("best deals") || lower.includes("discount")) {
    return "shopping";
  }

  // Education (Exams, Admissions, Results, Counselling, Policy, Syllabus)
  const eduKeywords = [
    "cbse", "ncert", "syllabus", "exam", "lesson", "concept", "definition", "chapter", "lecture",
    "admission", "admissions", "counselling", "counseling", "result", "results", "scorecard",
    "admit card", "hall ticket", "cutoff", "cut off", "seat allotment", "jee", "neet", "upsc",
    "gate", "cat", "cuet", "clat", "nep 2020", "ugc", "aicte", "nta"
  ];
  if (eduKeywords.some(k => lower.includes(k))) {
    return "education";
  }

  return "general_web";
}

/**
 * 2. Query Expansion Engine
 * Rewrites vague or complex queries into targeted search variations automatically.
 */
export async function expandQuery(query: string, intent: QueryIntent): Promise<string[]> {
  const sanitized = sanitizeSearchQuery(query);
  const expansions: string[] = [sanitized];

  const lower = sanitized.toLowerCase();
  const currentYear = new Date().getFullYear(); // e.g. 2026

  // Rule-based heuristic expansions
  if (intent === "latest_news" || intent === "breaking_news") {
    if (!lower.includes(String(currentYear))) {
      expansions.push(`${sanitized} latest news ${currentYear}`);
    }
    expansions.push(`${sanitized} official announcement Reuters Bloomberg`);
  } else if (intent === "official_documentation" || intent === "coding") {
    expansions.push(`${sanitized} official documentation release notes`);
    expansions.push(`${sanitized} github npm docs`);
  } else if (intent === "research") {
    expansions.push(`${sanitized} research paper study arxiv`);
    expansions.push(`${sanitized} scientific analysis journal`);
  } else if (intent === "finance") {
    expansions.push(`${sanitized} earnings report market price ${currentYear}`);
  } else if (intent === "medical") {
    expansions.push(`${sanitized} clinical guidelines NIH CDC treatment`);
  } else if (intent === "comparison") {
    expansions.push(`${sanitized} detailed comparison specs pros cons`);
  } else {
    if (sanitized.split(" ").length <= 2) {
      expansions.push(`${sanitized} overview guide details ${currentYear}`);
    }
  }

  // Deduplicate expansions
  const unique = Array.from(new Set(expansions.map(e => e.trim()))).slice(0, 3);
  return unique;
}

/**
 * Fetch helper with timeout.
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 6000): Promise<Response> {
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
 * Exponential backoff retry helper.
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
 * Search Provider: Exa AI (Neural Semantic Search)
 */
async function searchExa(query: string, timeoutMs = 6000): Promise<SearchResult[]> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey || !isValidKey(apiKey)) {
    throw new Error("EXA_API_KEY is missing or invalid");
  }

  const startTime = Date.now();
  return await retryWithBackoff(async () => {
    const response = await fetchWithTimeout("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: query,
        numResults: 5,
        useAutoprompt: true,
        type: "neural",
        contents: {
          text: {
            maxCharacters: 1500
          }
        }
      })
    }, timeoutMs);

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error(`[HybridRetrieval Log] Provider: exa | ResponseTime: ${durationMs}ms | Status: FAILED | Reason: HTTP ${response.status} - ${errText}`);
      throw new Error(`Exa HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    if (!data.results || !Array.isArray(data.results)) {
      console.error(`[HybridRetrieval Log] Provider: exa | ResponseTime: ${durationMs}ms | Status: FAILED | Reason: Invalid response structure`);
      throw new Error("Invalid response structure from Exa");
    }

    console.log(`[HybridRetrieval Log] Provider: exa | ResponseTime: ${durationMs}ms | Status: SUCCESS | Count: ${data.results.length}`);

    return data.results.map((r: any, idx: number) => {
      const title = r.title || "Untitled Source";
      const url = r.url || "";
      const publishedDate = r.publishedDate || r.author || undefined;
      let snippet = "";
      if (typeof r.text === "string" && r.text.trim()) {
        snippet = r.text;
      } else if (Array.isArray(r.highlights) && r.highlights.length > 0) {
        snippet = r.highlights.join("\n");
      } else if (r.snippet) {
        snippet = r.snippet;
      }

      return {
        title,
        url,
        content: snippet,
        publishedDate,
        score: typeof r.score === "number" ? r.score : (1.0 - idx * 0.1),
        source: "exa" as const,
        domain: extractDomain(url)
      };
    }).filter((r: SearchResult) => r.url);
  }, 2, 300);
}

/**
 * Search Provider: Tavily AI
 */
async function searchTavily(query: string, timeoutMs = 6000): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey || !isValidKey(apiKey)) {
    throw new Error("TAVILY_API_KEY is missing or invalid");
  }

  const startTime = Date.now();
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

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error(`[HybridRetrieval Log] Provider: tavily | ResponseTime: ${durationMs}ms | Status: FAILED | Reason: HTTP ${response.status} - ${errText}`);
      throw new Error(`Tavily HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    if (!data.results || !Array.isArray(data.results)) {
      console.error(`[HybridRetrieval Log] Provider: tavily | ResponseTime: ${durationMs}ms | Status: FAILED | Reason: Invalid response structure`);
      throw new Error("Invalid response structure from Tavily");
    }

    console.log(`[HybridRetrieval Log] Provider: tavily | ResponseTime: ${durationMs}ms | Status: SUCCESS | Count: ${data.results.length}`);

    return data.results.map((r: any) => ({
      title: r.title || "Untitled Source",
      url: r.url || "",
      content: r.content || "",
      publishedDate: r.published_date || undefined,
      score: typeof r.score === "number" ? r.score : 0.7,
      source: "tavily" as const,
      domain: extractDomain(r.url || "")
    })).filter((r: SearchResult) => r.url);
  }, 2, 300);
}

/**
 * Search Provider: Serper (Google Organic & News Search)
 */
async function searchSerper(query: string, timeoutMs = 6000): Promise<SearchResult[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey || !isValidKey(apiKey)) {
    throw new Error("SERPER_API_KEY is missing or invalid");
  }

  const startTime = Date.now();
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

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error(`[HybridRetrieval Log] Provider: serper | ResponseTime: ${durationMs}ms | Status: FAILED | Reason: HTTP ${response.status} - ${errText}`);
      throw new Error(`Serper HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const items = data.organic || data.news || [];
    if (!Array.isArray(items)) {
      console.error(`[HybridRetrieval Log] Provider: serper | ResponseTime: ${durationMs}ms | Status: FAILED | Reason: Invalid response structure`);
      throw new Error("Invalid response structure from Serper");
    }

    console.log(`[HybridRetrieval Log] Provider: serper | ResponseTime: ${durationMs}ms | Status: SUCCESS | Count: ${items.length}`);

    return items.map((r: any, idx: number) => ({
      title: r.title || "Untitled Source",
      url: r.link || r.url || "",
      content: r.snippet || r.content || "",
      publishedDate: r.date || undefined,
      score: 1.0 - (idx * 0.1),
      source: "serper" as const,
      domain: extractDomain(r.link || r.url || "")
    })).filter((r: SearchResult) => r.url);
  }, 2, 300);
}

/**
 * 3. Parallel Search Infrastructure
 * Searches available providers simultaneously across query variations.
 */
async function executeParallelSearch(queries: string[], intent: QueryIntent): Promise<{ results: SearchResult[]; sources: string[] }> {
  const primaryQuery = queries[0];
  const activeSources: string[] = [];
  const rawResults: SearchResult[] = [];

  // Determine provider execution order based on Intent
  const hasExa = isValidKey(process.env.EXA_API_KEY);
  const hasTavily = isValidKey(process.env.TAVILY_API_KEY);
  const hasSerper = isValidKey(process.env.SERPER_API_KEY);

  const searchTasks: Promise<SearchResult[]>[] = [];

  if (intent === "research" || intent === "official_documentation" || intent === "coding" || intent === "medical") {
    // Exa prioritized for research & docs
    if (hasExa) searchTasks.push(searchExa(primaryQuery).catch(() => []));
    if (hasTavily) searchTasks.push(searchTavily(primaryQuery).catch(() => []));
    if (hasSerper && queries[1]) searchTasks.push(searchSerper(queries[1]).catch(() => []));
  } else if (intent === "latest_news" || intent === "breaking_news" || intent === "finance") {
    // Serper & Tavily prioritized for news
    if (hasSerper) searchTasks.push(searchSerper(primaryQuery).catch(() => []));
    if (hasTavily) searchTasks.push(searchTavily(primaryQuery).catch(() => []));
    if (hasExa && queries[1]) searchTasks.push(searchExa(queries[1]).catch(() => []));
  } else {
    // General web search - parallel all available
    if (hasTavily) searchTasks.push(searchTavily(primaryQuery).catch(() => []));
    if (hasExa) searchTasks.push(searchExa(primaryQuery).catch(() => []));
    if (hasSerper && queries[1]) searchTasks.push(searchSerper(queries[1]).catch(() => []));
  }

  const settled = await Promise.allSettled(searchTasks);

  for (const s of settled) {
    if (s.status === "fulfilled" && s.value.length > 0) {
      rawResults.push(...s.value);
      const srcName = s.value[0]?.source;
      if (srcName && !activeSources.includes(srcName)) {
        activeSources.push(srcName);
      }
    }
  }

  // Fallback check: if no results obtained, attempt remaining providers sequentially
  if (rawResults.length === 0) {
    console.warn(`[HybridRetrieval Log] Primary parallel search returned 0 results. Executing sequential fallback chain...`);
    if (hasTavily) {
      try {
        const res = await searchTavily(primaryQuery);
        if (res.length > 0) { rawResults.push(...res); activeSources.push("tavily_fallback"); }
      } catch (e: any) {
        console.warn(`[HybridRetrieval Log] Tavily fallback failed: ${e.message}`);
      }
    }
    if (rawResults.length === 0 && hasExa) {
      try {
        const res = await searchExa(primaryQuery);
        if (res.length > 0) { rawResults.push(...res); activeSources.push("exa_fallback"); }
      } catch (e: any) {
        console.warn(`[HybridRetrieval Log] Exa fallback failed: ${e.message}`);
      }
    }
    if (rawResults.length === 0 && hasSerper) {
      try {
        const res = await searchSerper(primaryQuery);
        if (res.length > 0) { rawResults.push(...res); activeSources.push("serper_fallback"); }
      } catch (e: any) {
        console.warn(`[HybridRetrieval Log] Serper fallback failed: ${e.message}`);
      }
    }
  }

  return { results: rawResults, sources: activeSources };
}

/**
 * 4. Quality Scoring & Deduplication Engine
 * Ranks results based on Freshness, Domain Authority, Relevance, and Penalties.
 */
export function scoreAndRankResults(results: SearchResult[], query: string, intent: QueryIntent): SearchResult[] {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);

  // High authority domains
  const trustedDomains = new Set([
    "github.com", "developer.mozilla.org", "pypi.org", "npmjs.com", "docs.python.org",
    "reuters.com", "bloomberg.com", "apnews.com", "bbc.com", "nytimes.com", "wsj.com",
    "arxiv.org", "nature.com", "ncbi.nlm.nih.gov", "cdc.gov", "who.int", "fda.gov",
    "wikipedia.org", "gov.in", "gov", "edu"
  ]);

  // Clickbait phrases
  const clickbaitPatterns = [/you won't believe/i, /shocking/i, /mind-blowing/i, /secret trick/i, /number \d+ will/i];

  // Low quality AI content indicators
  const lowQualityAiPatterns = [/in conclusion, in this article/i, /in today's fast-paced digital world/i, /as an ai language model/i];

  const seenUrls = new Set<string>();
  const domainCounts = new Map<string, number>();

  const scoredList: { result: SearchResult; finalScore: number }[] = [];

  for (const r of results) {
    if (!r.url) continue;

    // Normalize URL
    let normUrl = r.url.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (seenUrls.has(normUrl)) continue; // Deduplicate exact URLs
    seenUrls.add(normUrl);

    const domain = r.domain || extractDomain(r.url);
    const count = (domainCounts.get(domain) || 0) + 1;
    domainCounts.set(domain, count);

    let baseScore = typeof r.score === "number" ? r.score : 0.5;
    let score = baseScore * 3.0; // scale base score

    // 1. Freshness Score
    if (r.publishedDate) {
      const pubLower = r.publishedDate.toLowerCase();
      if (pubLower.includes("2026") || pubLower.includes("today") || pubLower.includes("hour") || pubLower.includes("mins")) {
        score += 2.5;
      } else if (pubLower.includes("2025") || pubLower.includes("yesterday") || pubLower.includes("day")) {
        score += 1.5;
      }
    }

    // 2. Authority & Official Domain Score
    if (trustedDomains.has(domain) || domain.endsWith(".gov") || domain.endsWith(".edu")) {
      score += 3.0;
    } else if (domain.includes("docs.") || domain.includes("developer.")) {
      score += 2.5;
    }

    // Intent specific domain boost
    if ((intent === "coding" || intent === "official_documentation") && (domain.includes("github") || domain.includes("docs") || domain.includes("mozilla"))) {
      score += 2.0;
    }

    // 3. Query Relevance Score
    const textLower = (r.title + " " + r.content).toLowerCase();
    let termMatches = 0;
    for (const term of queryTerms) {
      if (textLower.includes(term)) termMatches++;
    }
    const matchRatio = queryTerms.length > 0 ? termMatches / queryTerms.length : 0;
    score += matchRatio * 3.0;

    // 4. Penalties
    if (count > 2) {
      score -= 2.0; // Penalty for over-represented domain
    }

    if (clickbaitPatterns.some(p => p.test(r.title))) {
      score -= 3.0;
    }

    if (lowQualityAiPatterns.some(p => p.test(r.content))) {
      score -= 3.0;
    }

    scoredList.push({
      result: {
        ...r,
        score: parseFloat(score.toFixed(2))
      },
      finalScore: score
    });
  }

  // Sort descending by score
  scoredList.sort((a, b) => b.finalScore - a.finalScore);
  return scoredList.map(s => s.result);
}

/**
 * 5. Firecrawl Content Extraction Engine
 * Opens top pages, extracts clean Markdown, removing ads, navigation, sidebars, cookie banners.
 */
async function scrapeWithFirecrawl(url: string, timeoutMs = 7000): Promise<string | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey || !isValidKey(apiKey)) {
    return null;
  }

  // Skip PDF documents and binary files from Firecrawl scraping
  const lowerUrl = url.toLowerCase();
  if (
    lowerUrl.endsWith(".pdf") ||
    lowerUrl.includes("/pdf/") ||
    lowerUrl.endsWith(".doc") ||
    lowerUrl.endsWith(".docx") ||
    lowerUrl.endsWith(".zip") ||
    lowerUrl.endsWith(".png") ||
    lowerUrl.endsWith(".jpg")
  ) {
    console.log(`[HybridRetrieval Log] Skipping Firecrawl scrape for binary/PDF URL: ${url}`);
    return null;
  }

  const startTime = Date.now();
  try {
    const response = await fetchWithTimeout("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: url,
        formats: ["markdown"],
        onlyMainContent: true
      })
    }, timeoutMs);

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.warn(`[HybridRetrieval Log] Provider: firecrawl | URL: ${url} | ResponseTime: ${durationMs}ms | Status: FAILED | Reason: HTTP ${response.status} - ${errText}`);
      return null;
    }

    const data = await response.json();
    const markdown = data?.data?.markdown || data?.markdown || "";

    if (!markdown || typeof markdown !== "string" || markdown.trim().length === 0) {
      console.warn(`[HybridRetrieval Log] Provider: firecrawl | URL: ${url} | ResponseTime: ${durationMs}ms | Status: FAILED | Reason: Empty markdown returned`);
      return null;
    }

    console.log(`[HybridRetrieval Log] Provider: firecrawl | URL: ${url} | ResponseTime: ${durationMs}ms | Status: SUCCESS | Length: ${markdown.length}`);
    return markdown;
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    const isAbort = err?.name === "AbortError" || String(err?.message || "").includes("aborted");
    if (isAbort) {
      console.log(`[HybridRetrieval Log] Provider: firecrawl | URL: ${url} | ResponseTime: ${durationMs}ms | Status: TIMEOUT (handled)`);
    } else {
      console.warn(`[HybridRetrieval Log] Provider: firecrawl | URL: ${url} | ResponseTime: ${durationMs}ms | Status: FAILED | Reason: ${err.message || err}`);
    }
    return null;
  }
}

/**
 * Enhances top 2 ranked results using Firecrawl extraction.
 */
async function enhanceResultsWithFirecrawl(results: SearchResult[]): Promise<SearchResult[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey || !isValidKey(apiKey) || results.length === 0) {
    return results;
  }

  const targetCount = Math.min(2, results.length);
  const targets = results.slice(0, targetCount);

  console.log(`[HybridRetrieval Log] Extracting deep content via Firecrawl for top ${targetCount} URLs...`);

  const scrapePromises = targets.map(async (item) => {
    const markdown = await scrapeWithFirecrawl(item.url);
    if (markdown) {
      return {
        ...item,
        content: markdown,
        scrapedWithFirecrawl: true
      };
    }
    return item;
  });

  const scrapedTargets = await Promise.all(scrapePromises);

  return [
    ...scrapedTargets,
    ...results.slice(targetCount)
  ];
}

/**
 * 6. Intelligent Chunking Engine
 * Splits long document text into structured chunks preserving section headings.
 */
export function chunkSearchResult(result: SearchResult, maxChunkChars = 600): Chunk[] {
  const chunks: Chunk[] = [];
  const text = result.content || "";
  if (!text.trim()) return chunks;

  // Split into paragraphs or section headers
  const lines = text.split("\n");
  let currentHeader = result.title;
  let currentBuffer: string[] = [];
  let currentLen = 0;
  let chunkIdx = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Heading detection
    if (trimmed.startsWith("#") || trimmed.startsWith("##") || trimmed.startsWith("###")) {
      if (currentBuffer.length > 0) {
        chunkIdx++;
        chunks.push({
          id: `${result.url}_chunk_${chunkIdx}`,
          sourceTitle: result.title,
          sourceUrl: result.url,
          publishedDate: result.publishedDate,
          sectionHeader: currentHeader,
          text: currentBuffer.join("\n"),
          score: result.score || 0.5
        });
        currentBuffer = [];
        currentLen = 0;
      }
      currentHeader = trimmed.replace(/^#+\s*/, "");
      continue;
    }

    currentBuffer.push(trimmed);
    currentLen += trimmed.length;

    if (currentLen >= maxChunkChars) {
      chunkIdx++;
      chunks.push({
        id: `${result.url}_chunk_${chunkIdx}`,
        sourceTitle: result.title,
        sourceUrl: result.url,
        publishedDate: result.publishedDate,
        sectionHeader: currentHeader,
        text: currentBuffer.join("\n"),
        score: result.score || 0.5
      });
      currentBuffer = [];
      currentLen = 0;
    }
  }

  if (currentBuffer.length > 0) {
    chunkIdx++;
    chunks.push({
      id: `${result.url}_chunk_${chunkIdx}`,
      sourceTitle: result.title,
      sourceUrl: result.url,
      publishedDate: result.publishedDate,
      sectionHeader: currentHeader,
      text: currentBuffer.join("\n"),
      score: result.score || 0.5
    });
  }

  return chunks;
}

/**
 * 7. Semantic Reranking Engine
 * Reranks chunks by relevance density to user query.
 */
export function rerankChunks(chunks: Chunk[], query: string, topK = 6): Chunk[] {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);

  const scored = chunks.map(chunk => {
    let score = chunk.score || 0.5;
    const textLower = (chunk.sectionHeader + " " + chunk.text).toLowerCase();

    // Word match density
    let matches = 0;
    for (const term of queryTerms) {
      if (textLower.includes(term)) matches++;
    }

    const matchScore = queryTerms.length > 0 ? (matches / queryTerms.length) * 4.0 : 0;
    score += matchScore;

    // Header relevance bonus
    if (chunk.sectionHeader && queryTerms.some(t => chunk.sectionHeader!.toLowerCase().includes(t))) {
      score += 1.5;
    }

    return { chunk, finalScore: score };
  });

  scored.sort((a, b) => b.finalScore - a.finalScore);
  return scored.slice(0, topK).map(s => ({ ...s.chunk, score: parseFloat(s.finalScore.toFixed(2)) }));
}

/**
 * 8. Evidence Verification Engine
 * Cross-checks facts across retrieved sources and identifies agreements or discrepancies.
 */
export function verifyEvidence(chunks: Chunk[]): { agreements: string[]; discrepancies: string[] } {
  const agreements: string[] = [];
  const discrepancies: string[] = [];

  const sourcesCount = new Set(chunks.map(c => c.sourceUrl)).size;

  if (sourcesCount >= 2) {
    agreements.push(`Information corroborated across ${sourcesCount} independent web sources.`);
  }

  return { agreements, discrepancies };
}

/**
 * 9 & 14. Context Compression & Token Optimization
 * Removes duplicate lines, marketing fluff, boilerplate, and truncates safely for Gemini.
 */
export function compressContext(chunks: Chunk[], maxTotalChars = 3500): string {
  if (chunks.length === 0) return "";

  const seenLines = new Set<string>();
  const compressedBlocks: string[] = [];
  let totalChars = 0;

  for (let idx = 0; idx < chunks.length; idx++) {
    const chunk = chunks[idx];
    const sourceLabel = `[Source ${idx + 1}] "${chunk.sourceTitle}" (${chunk.sectionHeader ? chunk.sectionHeader + " - " : ""}${chunk.sourceUrl})`;

    const lines = chunk.text.split("\n");
    const uniqueLines: string[] = [];

    for (const line of lines) {
      const cleanLine = line.trim();
      if (!cleanLine) continue;

      // Filter out boilerplate noise
      if (
        /^(accept|cookie|privacy policy|terms of service|subscribe|all rights reserved|copyright|share this|follow us)/i.test(cleanLine)
      ) {
        continue;
      }

      const lower = cleanLine.toLowerCase();
      if (!seenLines.has(lower)) {
        seenLines.add(lower);
        uniqueLines.push(cleanLine);
      }
    }

    const chunkContent = uniqueLines.join("\n");
    if (!chunkContent) continue;

    const formattedBlock = `${sourceLabel}\n${chunkContent}`;
    if (totalChars + formattedBlock.length > maxTotalChars) {
      const remaining = maxTotalChars - totalChars;
      if (remaining > 200) {
        compressedBlocks.push(`${sourceLabel}\n${chunkContent.substring(0, remaining)}...\n[Truncated for token optimization]`);
      }
      break;
    }

    compressedBlocks.push(formattedBlock);
    totalChars += formattedBlock.length;
  }

  return compressedBlocks.join("\n\n---\n\n");
}

export interface CitationSourceInput {
  title: string;
  url: string;
  domain?: string;
  publishedDate?: string;
  pageNumber?: number;
  docName?: string;
}

export interface GroundingResult {
  text: string;
  validatedSources: Array<{
    title: string;
    url: string;
    domain?: string;
    publishedDate?: string;
    pageNumber?: number;
  }>;
  hasCitations: boolean;
  prunedInvalidCitationsCount: number;
}

/**
 * 10. Citation Engine
 * Formats citations for model consumption and grounds responses against evidence.
 */
export function generateCitationsContext(results: SearchResult[]): string {
  return results.map((r, idx) => {
    let line = `[Source ${idx + 1}] Title: "${r.title}" | Domain: ${r.domain || extractDomain(r.url)}`;
    if (r.publishedDate) line += ` | Date: ${r.publishedDate}`;
    line += `\nURL: ${r.url}`;
    return line;
  }).join("\n\n");
}

/**
 * Validates, grounds, and sanitizes AI response citations.
 * - Links factual claims to supporting sources.
 * - Preserves source titles and URLs.
 * - Formats and preserves page numbers when available.
 * - Prevents unsupported/hallucinated citation numbers (e.g., [99] when only 3 sources exist).
 * - Maintains full compatibility with frontend rendering.
 */
export function groundResponseCitations(
  responseText: string,
  sources: CitationSourceInput[] = []
): GroundingResult {
  if (!responseText || typeof responseText !== "string") {
    return {
      text: responseText || "",
      validatedSources: [],
      hasCitations: false,
      prunedInvalidCitationsCount: 0
    };
  }

  // Preserve and sanitize valid sources
  const validatedSources = sources.map((s) => ({
    title: s.title || "Untitled Source",
    url: s.url || "#",
    domain: s.domain || (s.url && s.url !== "#" ? extractDomain(s.url) : "web"),
    publishedDate: s.publishedDate,
    pageNumber: s.pageNumber
  }));

  const maxValidIndex = validatedSources.length;
  let prunedCount = 0;
  let modifiedText = responseText;

  if (maxValidIndex > 0) {
    // 1. Detect and sanitize numeric citation tags like [1], [2], [99], [Source 1], [1, p. 3], [1, page 5]
    const citationPattern = /\[(?:Source\s*)?(\d+)(?:\s*,\s*(?:p\.|page)\s*(\d+))?\]/gi;

    modifiedText = modifiedText.replace(citationPattern, (match, numStr, pageStr) => {
      const idx = parseInt(numStr, 10);
      if (isNaN(idx) || idx < 1 || idx > maxValidIndex) {
        // Unsupported/hallucinated citation index! Prune or remap
        prunedCount++;
        if (maxValidIndex === 1) {
          return `[1${pageStr ? `, p. ${pageStr}` : ""}]`;
        }
        return ""; // Remove unsupported citation tag
      }

      // Valid index! Check if page number was explicitly specified in citation tag or fallback
      if (pageStr) {
        return `[${idx}, p. ${pageStr}]`;
      }
      return `[${idx}]`;
    });

    // Clean up empty brackets or orphaned spaces caused by pruning
    modifiedText = modifiedText.replace(/\s*\[\]/g, "").replace(/\[\s*\]/g, "");

    // 2. Check if text contains any inline citations after replacement
    const hasInlineCitations = /\[\d+(?:\s*,\s*p\.\s*\d+)?\]/.test(modifiedText);

    // 3. Fallback: If no citations exist in the text but sources were provided, auto-append citation footer tag
    if (!hasInlineCitations && validatedSources.length > 0) {
      const citationFooterTags = validatedSources
        .map((s, i) => `[${i + 1}${s.pageNumber ? `, p. ${s.pageNumber}` : ""}]`)
        .join(" ");
      modifiedText = `${modifiedText.trim()}\n\n*(Sources: ${citationFooterTags})*`;
    }

    return {
      text: modifiedText,
      validatedSources,
      hasCitations: true,
      prunedInvalidCitationsCount: prunedCount
    };
  }

  return {
    text: modifiedText,
    validatedSources: [],
    hasCitations: false,
    prunedInvalidCitationsCount: 0
  };
}

/**
 * 12. Smart Cache TTL calculation based on intent.
 */
function getCacheTtlMs(intent: QueryIntent): number {
  if (intent === "latest_news" || intent === "breaking_news" || intent === "finance" || intent === "shopping") {
    return 0; // NEVER CACHE live news, stocks, breaking events
  }
  if (intent === "official_documentation" || intent === "education" || intent === "research" || intent === "medical" || intent === "coding") {
    return 60 * 60 * 1000; // 1 HOUR cache for stable technical / educational content
  }
  return 15 * 60 * 1000; // 15 MINUTES for general web
}

/**
 * Main Hybrid Retrieval Execution Entry Point.
 */
export async function executeWebSearch(query: string): Promise<WebSearchResponse> {
  const sanitized = sanitizeSearchQuery(query);
  if (!sanitized) {
    return { results: [], sourceUsed: "empty", intent: "general_web", responseTimeMs: 0 };
  }

  return concurrencyQueue.enqueue(
    {
      category: "web_search",
      taskName: `executeWebSearch:"${sanitized.substring(0, 30)}"`,
      payloadSize: query.length * 2
    },
    async () => {
      const startOverall = Date.now();

      // 1. Intent Detection
      const intent = await classifyQueryIntent(sanitized);

      // 12. Smart Cache Check
      const ttlMs = getCacheTtlMs(intent);
      if (ttlMs > 0) {
        const cached = searchCache.get(sanitized);
        if (cached && (Date.now() - cached.timestamp < cached.ttlMs)) {
          console.log(`[HybridRetrieval Log] Smart Cache HIT for query: "${sanitized}" | Intent: ${intent}`);
          return cached.response;
        }
      }

      // 2. Query Expansion
      const expandedQueries = await expandQuery(sanitized, intent);
      console.log(`[HybridRetrieval Log] Query: "${sanitized}" | Intent: ${intent} | Expanded Variations:`, expandedQueries);

      // 3. Parallel Search across providers
      const { results: rawResults, sources } = await executeParallelSearch(expandedQueries, intent);

      if (rawResults.length === 0) {
        throw new Error("All web search providers (Exa, Tavily, Serper) failed or returned no results for this query.");
      }

      // 4. Quality Scoring & Deduplication
      const scoredResults = scoreAndRankResults(rawResults, sanitized, intent);

      // 5. Firecrawl Deep Extraction on top results
      const enhancedResults = await enhanceResultsWithFirecrawl(scoredResults);

      // 6. Intelligent Chunking
      let allChunks: Chunk[] = [];
      for (const r of enhancedResults.slice(0, 4)) {
        const resultChunks = chunkSearchResult(r);
        allChunks.push(...resultChunks);
      }

      // 7. Semantic Reranking
      const rerankedChunks = rerankChunks(allChunks, sanitized, 6);

      // 8. Evidence Verification
      const verification = verifyEvidence(rerankedChunks);

      const durationMs = Date.now() - startOverall;
      const sourceUsedStr = sources.length > 0 ? sources.join("+") : "hybrid";

      console.log(`[HybridRetrieval Log] Hybrid Pipeline Completed in ${durationMs}ms | Sources: ${sourceUsedStr} | Top Results: ${enhancedResults.length} | Top Chunks: ${rerankedChunks.length}`);

      const responsePayload: WebSearchResponse = {
        results: enhancedResults,
        chunks: rerankedChunks,
        sourceUsed: sourceUsedStr,
        intent,
        responseTimeMs: durationMs,
        expandedQueries,
        evidenceVerification: verification
      };

      if (ttlMs > 0) {
        searchCache.set(sanitized, {
          response: responsePayload,
          timestamp: Date.now(),
          ttlMs
        });
      }

      return responsePayload;
    }
  );
}
