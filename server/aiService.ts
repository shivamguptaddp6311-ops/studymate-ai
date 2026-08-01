import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import crypto from "crypto";
import { firebaseDB } from "./firebase";
import { serverLogger, recordAIAttempt, recordAISuccess, recordAIFailure } from "./logger";
import { concurrencyQueue } from "./concurrencyQueue";
import { circuitBreaker } from "./circuitBreaker";
import {
  AICapability,
  hasAllCapabilities,
  validateProviderCapabilities,
  getRequiredCapabilitiesForTask,
  filterCapableProviders
} from "./providerCapabilities";

dotenv.config();

// --- Failure-Aware Response Cache Infrastructure ---
export const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes TTL for successful text responses
export const IMAGE_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes TTL for successful image responses
export const FAILURE_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes separate TTL for failed provider attempts

export interface FailureCacheEntry {
  provider: AIProvider;
  cacheKey: string;
  error: string;
  timestamp: number;
}

// Verified Successful Response Caches
const responseCache = new Map<string, { text: string; providerUsed: AIProvider; timestamp: number }>();
const imageCache = new Map<string, { imageUrl: string; providerUsed: "gemini" | "openai" | "fal"; timestamp: number }>();

// Separate Failure Cache for Provider Failures
const failureCache = new Map<string, FailureCacheEntry>();

// Cache Performance Metrics Collector
const cacheMetrics = {
  successCacheHits: 0,
  successCacheMisses: 0,
  failureCacheHits: 0,
  failureCacheBypasses: 0,
  failureTTLExpirations: 0
};

/**
 * Record a failed provider attempt in the dedicated failure cache.
 * Ensures failed responses are NEVER cached in the normal success response cache.
 */
export function recordFailureCache(provider: AIProvider, cacheKey: string, errorMsg: string) {
  const failureKey = `${provider}:${cacheKey}`;
  failureCache.set(failureKey, {
    provider,
    cacheKey,
    error: errorMsg,
    timestamp: Date.now()
  });
  failureCache.set(`global:${provider}`, {
    provider,
    cacheKey: "global",
    error: errorMsg,
    timestamp: Date.now()
  });
}

/**
 * Clear failure cache entries for a provider when it successfully completes a request.
 */
export function clearFailureCache(provider: AIProvider, cacheKey?: string) {
  if (cacheKey) {
    failureCache.delete(`${provider}:${cacheKey}`);
  }
  failureCache.delete(`global:${provider}`);
}

/**
 * Check if a provider has recently failed for a given request or globally within the failure TTL.
 * Automatically evicts expired failure entries.
 */
export function isProviderInFailureCache(provider: AIProvider, cacheKey?: string): boolean {
  const now = Date.now();
  if (cacheKey) {
    const specificKey = `${provider}:${cacheKey}`;
    const entry = failureCache.get(specificKey);
    if (entry) {
      if (now - entry.timestamp < FAILURE_CACHE_TTL_MS) {
        return true;
      } else {
        failureCache.delete(specificKey);
        cacheMetrics.failureTTLExpirations++;
      }
    }
  }

  const globalKey = `global:${provider}`;
  const globalEntry = failureCache.get(globalKey);
  if (globalEntry) {
    if (now - globalEntry.timestamp < FAILURE_CACHE_TTL_MS) {
      return true;
    } else {
      failureCache.delete(globalKey);
      cacheMetrics.failureTTLExpirations++;
    }
  }

  return false;
}

/**
 * Retrieve comprehensive metrics for the AI Cache engine.
 */
export function getAICacheMetrics() {
  const totalQueries = cacheMetrics.successCacheHits + cacheMetrics.successCacheMisses;
  const hitRatioPercent = totalQueries > 0 ? Number(((cacheMetrics.successCacheHits / totalQueries) * 100).toFixed(2)) : 0;

  // Evict expired failure entries
  const now = Date.now();
  for (const [key, entry] of failureCache.entries()) {
    if (now - entry.timestamp >= FAILURE_CACHE_TTL_MS) {
      failureCache.delete(key);
      cacheMetrics.failureTTLExpirations++;
    }
  }

  return {
    successCacheHits: cacheMetrics.successCacheHits,
    successCacheMisses: cacheMetrics.successCacheMisses,
    failureCacheHits: cacheMetrics.failureCacheHits,
    failureCacheBypasses: cacheMetrics.failureCacheBypasses,
    failureTTLExpirations: cacheMetrics.failureTTLExpirations,
    successCacheSize: responseCache.size + imageCache.size,
    failureCacheSize: failureCache.size,
    hitRatioPercent,
    failureTTLMs: FAILURE_CACHE_TTL_MS,
    successTTLMs: CACHE_TTL_MS
  };
}

/**
 * Clear all success and failure response caches.
 */
export function clearAICaches() {
  responseCache.clear();
  imageCache.clear();
  failureCache.clear();
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const signal = options.signal
    ? (AbortSignal as any).any([options.signal, controller.signal])
    : controller.signal;

  try {
    const response = await fetch(url, { ...options, signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Initialize Gemini client lazily to avoid startup crashes if key is missing
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !isValidKey(apiKey)) return null;
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

export type AIProvider = "auto" | "gemini" | "openai" | "groq" | "openrouter" | "anthropic" | "fal";
export type AIImageProvider = "auto" | "gemini" | "openai" | "fal";

export function normalizeProvider(provider?: string): AIProvider {
  if (!provider || provider === "auto") return "auto";
  const p = provider.toLowerCase().trim();
  if (p.includes("claude") || p.includes("anthropic")) return "anthropic";
  if (p.includes("grok") || p.includes("groq")) return "groq";
  if (p.includes("gemini")) return "gemini";
  if (p.includes("gpt") || p.includes("openai")) return "openai";
  if (p.includes("openrouter")) return "openrouter";
  if (p.includes("fal")) return "fal";
  return "auto";
}

export function getProviderDisplayName(provider?: string): string {
  if (!provider) return "Gemini";
  const p = provider.toLowerCase().trim();
  if (p === "anthropic" || p === "claude") return "Claude";
  if (p === "groq" || p === "grok") return "Grok";
  if (p === "openai") return "OpenAI";
  if (p === "openrouter") return "OpenRouter";
  if (p === "gemini") return "Gemini";
  if (p === "fal") return "Fal";
  return "Gemini";
}

export interface ImageGenOptions {
  prompt: string;
  category?: string;
  aspectRatio?: "1:1" | "3:4" | "16:9" | "9:16" | "4:3";
  quality?: "standard" | "hd";
  preferredProvider?: AIImageProvider;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface ImageGenResponse {
  imageUrl: string;
  providerUsed: AIImageProvider;
  revisedPrompt: string;
  cached?: boolean;
}

export interface AIMessage {
  role: "user" | "model" | "assistant" | "system";
  content: string;
}

export interface AIResponse {
  text: string;
  providerUsed: AIProvider;
  cached?: boolean;
}

// Check if API key is a valid non-placeholder value
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

// Dynamic tracker to disable Anthropic if we encounter a billing/credit exhaustion error
let isAnthropicDisabled = false;

// Check configured keys with Circuit Breaker status check
export function getConfiguredProviders(ignoreCircuit = false) {
  return {
    gemini: isValidKey(process.env.GEMINI_API_KEY) && (ignoreCircuit || circuitBreaker.canExecute("gemini")),
    openai: isValidKey(process.env.OPENAI_API_KEY) && (ignoreCircuit || circuitBreaker.canExecute("openai")),
    groq: isValidKey(process.env.GROQ_API_KEY) && (ignoreCircuit || circuitBreaker.canExecute("groq")),
    openrouter: isValidKey(process.env.OPENROUTER_API_KEY) && (ignoreCircuit || circuitBreaker.canExecute("openrouter")),
    anthropic: isValidKey(process.env.ANTHROPIC_API_KEY) && !isAnthropicDisabled && (ignoreCircuit || circuitBreaker.canExecute("anthropic")),
    fal: (isValidKey(process.env.FAL_KEY) || isValidKey(process.env.FAL_API_KEY)) && (ignoreCircuit || circuitBreaker.canExecute("fal"))
  };
}

export function getConfiguredImageProviders(ignoreCircuit = false) {
  return {
    gemini: isValidKey(process.env.GEMINI_API_KEY) && (ignoreCircuit || circuitBreaker.canExecute("gemini")),
    openai: isValidKey(process.env.OPENAI_API_KEY) && (ignoreCircuit || circuitBreaker.canExecute("openai")),
    fal: (isValidKey(process.env.FAL_KEY) || isValidKey(process.env.FAL_API_KEY)) && (ignoreCircuit || circuitBreaker.canExecute("fal"))
  };
}

export interface ImageProviderHealth {
  provider: "fal" | "gemini" | "openai" | "pollinations";
  configured: boolean;
  status: "healthy" | "degraded" | "unhealthy";
  consecutiveFailures: number;
  lastFailureReason?: string;
  lastSuccessTimestamp?: number;
  cooldownUntil?: number;
}

const imageProviderHealthState: Record<"fal" | "gemini" | "openai" | "pollinations", ImageProviderHealth> = {
  fal: { provider: "fal", configured: false, status: "healthy", consecutiveFailures: 0 },
  gemini: { provider: "gemini", configured: false, status: "healthy", consecutiveFailures: 0 },
  openai: { provider: "openai", configured: false, status: "healthy", consecutiveFailures: 0 },
  pollinations: { provider: "pollinations", configured: true, status: "healthy", consecutiveFailures: 0 }
};

export function checkImageProviderHealth(): Record<string, ImageProviderHealth> {
  const config = getConfiguredImageProviders(true);
  const now = Date.now();

  const update = (p: "fal" | "gemini" | "openai" | "pollinations", isConfigured: boolean) => {
    const record = imageProviderHealthState[p];
    record.configured = isConfigured;

    if (!isConfigured) {
      record.status = "unhealthy";
      record.lastFailureReason = "API key not configured or invalid";
    } else if (record.cooldownUntil && now < record.cooldownUntil) {
      record.status = "unhealthy";
    } else if (record.consecutiveFailures >= 3) {
      record.status = "unhealthy";
    } else if (record.consecutiveFailures > 0) {
      record.status = "degraded";
    } else {
      record.status = "healthy";
    }
  };

  update("fal", config.fal);
  update("gemini", config.gemini);
  update("openai", config.openai);
  update("pollinations", true);

  return { ...imageProviderHealthState };
}

export function recordImageProviderHealthSuccess(p: "fal" | "gemini" | "openai" | "pollinations") {
  const record = imageProviderHealthState[p];
  if (record) {
    record.consecutiveFailures = 0;
    record.status = "healthy";
    record.lastSuccessTimestamp = Date.now();
    record.cooldownUntil = undefined;
    record.lastFailureReason = undefined;
  }
}

export function recordImageProviderHealthFailure(p: "fal" | "gemini" | "openai" | "pollinations", reason: string, isPermanent = false) {
  const record = imageProviderHealthState[p];
  if (record) {
    record.consecutiveFailures += 1;
    record.lastFailureReason = reason;

    if (isPermanent || record.consecutiveFailures >= 3) {
      record.cooldownUntil = Date.now() + 2 * 60 * 1000; // 2 minutes cooldown
      record.status = "unhealthy";
    } else {
      record.status = "degraded";
    }
  }
}

function isTransientImageError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  const status = err.status || err.statusCode || err.response?.status;

  if (status) {
    if (status === 429) return true;
    if (status >= 500 && status < 600) return true;
    if (status === 401 || status === 403 || status === 400 || status === 404) return false;
  }

  if (
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("fetch failed") ||
    msg.includes("network error") ||
    msg.includes("overloaded") ||
    msg.includes("rate limit") ||
    msg.includes("too many requests") ||
    msg.includes("503") ||
    msg.includes("502") ||
    msg.includes("500") ||
    msg.includes("504")
  ) {
    return true;
  }

  return false;
}

// Convert common message roles to provider-specific formats
function convertMessagesToOpenAIFormat(messages: AIMessage[], systemInstruction?: string) {
  const formatted: any[] = [];
  if (systemInstruction) {
    formatted.push({ role: "system", content: systemInstruction });
  }
  messages.forEach(m => {
    const role = m.role === "model" ? "assistant" : m.role;
    formatted.push({ role, content: m.content });
  });
  return formatted;
}

function convertMessagesToAnthropicFormat(messages: AIMessage[]) {
  const formatted: any[] = [];
  messages.forEach(m => {
    if (m.role !== "system") {
      const role = m.role === "model" ? "assistant" : m.role;
      formatted.push({ role, content: m.content });
    }
  });
  return formatted;
}

const DEFAULT_TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS) || 30000;

// Upgraded Timeout & AbortSignal promise wrapper
function withTimeoutAndSignal<T>(
  promiseFactory: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  errorMessage: string,
  externalSignal?: AbortSignal
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const controller = new AbortController();
    const signal = controller.signal;

    // Fast-path abort
    if (externalSignal?.aborted) {
      return reject(new Error("Request was cancelled by user."));
    }

    const onExternalAbort = () => {
      controller.abort();
      clearTimeout(timer);
      reject(new Error("Request was cancelled by user."));
    };

    if (externalSignal) {
      externalSignal.addEventListener("abort", onExternalAbort);
    }

    const timer = setTimeout(() => {
      controller.abort();
      if (externalSignal) {
        externalSignal.removeEventListener("abort", onExternalAbort);
      }
      reject(new Error(errorMessage));
    }, timeoutMs);

    promiseFactory(signal)
      .then(res => {
        clearTimeout(timer);
        if (externalSignal) {
          externalSignal.removeEventListener("abort", onExternalAbort);
        }
        resolve(res);
      })
      .catch(err => {
        clearTimeout(timer);
        if (externalSignal) {
          externalSignal.removeEventListener("abort", onExternalAbort);
        }
        reject(err);
      });
  });
}

// Exponential backoff retry utility respecting AbortSignal
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  retries = 3,
  delay = 1000,
  onRetry?: (error: any, attempt: number) => void,
  externalSignal?: AbortSignal
): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= retries; attempt++) {
    if (externalSignal?.aborted) {
      throw new Error("Request was cancelled by user.");
    }
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // If aborted, do not retry
      if (error?.name === "AbortError" || error?.message?.includes("cancelled") || externalSignal?.aborted) {
        throw error;
      }

      // If it's a fatal billing, credit, auth, or model unavailability/high demand error, throw immediately without retrying to allow instant fallback
      const errMsg = error?.message || String(error);
      const isFatal =
        errMsg.includes("credit balance") ||
        errMsg.includes("Credit balance") ||
        errMsg.includes("billing") ||
        errMsg.includes("Billing") ||
        errMsg.includes("invalid_api_key") ||
        errMsg.includes("invalid api key") ||
        errMsg.includes("503") ||
        errMsg.includes("UNAVAILABLE") ||
        errMsg.includes("high demand") ||
        errMsg.includes("overloaded");

      if (isFatal) {
        throw error;
      }

      const is429 =
        error?.status === 429 ||
        error?.message?.includes("429") ||
        error?.message?.includes("RESOURCE_EXHAUSTED") ||
        error?.message?.includes("quota") ||
        error?.message?.includes("rate limit") ||
        error?.message?.includes("Rate limit");
      
      if (attempt === retries) {
        break;
      }
      if (onRetry) onRetry(error, attempt);
      const actualDelay = is429 ? delay * 3 * attempt : delay * attempt;
      
      // Sleep while checking for external signal abort
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (externalSignal) {
            externalSignal.removeEventListener("abort", onAbortDuringSleep);
          }
          resolve();
        }, actualDelay);

        function onAbortDuringSleep() {
          clearTimeout(timeout);
          reject(new Error("Request was cancelled by user."));
        }

        if (externalSignal) {
          externalSignal.addEventListener("abort", onAbortDuringSleep, { once: true });
        }
      });
    }
  }
  throw lastError;
}

// Robust state-machine to repair common AI-generated JSON formatting errors
export function repairJsonString(raw: string): string {
  let result = "";
  let inString = false;
  let escaped = false;
  
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    
    if (inString) {
      if (escaped) {
        // We are currently escaping a character.
        // In standard JSON, only certain characters can follow a backslash: ", \, /, b, f, n, r, t, u
        // But in math/LaTeX or rich texts, we might have things like \frac, \alpha, \times, \theta, \beta.
        const isValidEscape = ["\"", "\\", "/", "b", "f", "n", "r", "t"].includes(c) || 
                              (c === "u" && /^[0-9a-fA-F]{4}$/.test(raw.substring(i + 1, i + 5)));
        
        if (!isValidEscape) {
          result += "\\\\" + c;
        } else {
          // If it is f, b, t, n, r but followed by letters (e.g. \frac, \begin, \times, \newline, \right)
          // it is almost certainly a LaTeX keyword or other text keyword rather than a real control character.
          const rest = raw.substring(i);
          const isLatexWord = /^[a-zA-Z]+/.test(rest);
          if (isLatexWord && ["f", "b", "t", "n", "r"].includes(c)) {
            result += "\\\\" + c;
          } else {
            result += "\\" + c;
          }
        }
        escaped = false;
      } else if (c === "\\") {
        escaped = true;
      } else if (c === "\"") {
        inString = false;
        result += c;
      } else if (c === "\n") {
        // Raw literal newlines are invalid in JSON string values. Escape them as \n.
        result += "\\n";
      } else if (c === "\r") {
        result += "\\r";
      } else if (c === "\t") {
        result += "\\t";
      } else {
        result += c;
      }
    } else {
      if (c === "\"") {
        inString = true;
      }
      result += c;
    }
  }
  
  if (escaped) {
    result += "\\\\";
  }
  
  // Clean up trailing commas in objects or arrays
  return result.replace(/,\s*([\]}])/g, "$1");
}

// Robust fallback JSON parser helper
export function parseJsonResponse(text: string): any {
  if (!text) return {};
  const cleaned = text.trim();
  
  // 1. Try standard parsing of the cleaned text
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // continue
  }

  // 2. Try markdown json block extraction
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    try {
      return JSON.parse(jsonMatch[1].trim());
    } catch (e2) {
      // continue
    }
  }

  // 3. Try parsing after relaxed cleanup (stripping code blocks)
  let relaxed = cleaned;
  relaxed = relaxed.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    return JSON.parse(relaxed);
  } catch (e3) {
    // continue
  }

  // 4. Try parsing using our custom state-machine repair helper on the text
  try {
    const repaired = repairJsonString(relaxed);
    return JSON.parse(repaired);
  } catch (e4) {
    // continue
  }

  // 5. Try parsing using our custom state-machine repair helper on raw match
  if (jsonMatch && jsonMatch[1]) {
    try {
      const repairedMatch = repairJsonString(jsonMatch[1].trim());
      return JSON.parse(repairedMatch);
    } catch (e5) {
      // continue
    }
  }

  console.error("[AIService] Failed all attempts to parse JSON response:", text);
  throw new Error("Failed to parse JSON response from AI provider.");
}

// Main execution function with retries and automatic fallback
export async function executeAIRequest(options: {
  messages: AIMessage[];
  systemInstruction?: string;
  image?: string; // Base64 data (with or without data: prefix)
  preferredProvider?: AIProvider;
  responseSchema?: any; // optional Gemini-specific schema
  temperature?: number;
  timeoutMs?: number; // Configurable timeout limit
  signal?: AbortSignal; // Allow external AbortSignal to cancel
}): Promise<AIResponse> {
  const { messages, systemInstruction, image, preferredProvider = "auto", responseSchema, timeoutMs, signal } = options;

  // Create unique cache key for lookup
  const cacheKeyInput = JSON.stringify({
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    systemInstruction,
    image: image ? image.substring(0, 100) : "",
    imageLen: image ? image.length : 0,
    preferredProvider,
    responseSchema: responseSchema ? JSON.stringify(responseSchema) : ""
  });
  const cacheKey = crypto.createHash("md5").update(cacheKeyInput).digest("hex");

  const cached = responseCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    cacheMetrics.successCacheHits++;
    console.log(`[AIService] Cache HIT for key: ${cacheKey}`);
    return {
      text: cached.text,
      providerUsed: cached.providerUsed,
      cached: true
    };
  }
  cacheMetrics.successCacheMisses++;

  const isPdf = !!image && (image.startsWith("data:application/pdf") || image.includes("pdf"));
  const category = concurrencyQueue.determineCategory(
    undefined,
    isPdf,
    !!image,
    false
  );
  const payloadSize = (image ? image.length : 0) + JSON.stringify(messages).length;

  return concurrencyQueue.enqueue(
    {
      category,
      taskName: `executeAIRequest:${category}`,
      payloadSize,
      timeoutMs,
      signal
    },
    async () => {
      // Determine list of providers to try
      const config = getConfiguredProviders();
      const normalizedSelected = normalizeProvider(preferredProvider);
      let providersToTry: AIProvider[] = [];

      if (normalizedSelected !== "auto") {
        if (!(config as any)[normalizedSelected]) {
          throw new Error(
            `${normalizedSelected.toUpperCase()} provider is not configured or API key is invalid.`
          );
        }

        providersToTry = [normalizedSelected];
      } else {
        // AUTO MODE: Fallback sequence in order: Gemini -> OpenAI -> Grok -> Claude -> OpenRouter
        const fallbackOrder: AIProvider[] = ["gemini", "openai", "groq", "anthropic", "openrouter"];
        providersToTry = fallbackOrder.filter(p => config[p as keyof typeof config]);

        // Validate provider capabilities against request requirements in Auto mode
        const requiredCapabilities = getRequiredCapabilitiesForTask(
          category === "pdf_parsing" ? "pdf_chat" : category === "ocr" ? "ocr" : image ? "vision_analysis" : "general_chat",
          { image, isPdf }
        );

        const capabilityFiltered = filterCapableProviders(providersToTry, requiredCapabilities) as AIProvider[];
        if (capabilityFiltered.length > 0) {
          providersToTry = capabilityFiltered;
        }

        if (providersToTry.length === 0) {
          if (isValidKey(process.env.GEMINI_API_KEY)) {
            providersToTry = ["gemini"];
          } else {
            throw new Error(
              "No AI Providers are configured. Please set GEMINI_API_KEY or other keys (OPENAI_API_KEY, GROQ_API_KEY, etc.) in the Secrets Settings."
            );
          }
        }

        // Failure-Aware Reordering (Auto mode only): Move recently failed providers to end
        const failedProviders = providersToTry.filter(p => isProviderInFailureCache(p, cacheKey));
        const healthyProviders = providersToTry.filter(p => !isProviderInFailureCache(p, cacheKey));

        if (failedProviders.length > 0 && healthyProviders.length > 0) {
          cacheMetrics.failureCacheBypasses++;
          providersToTry = [...healthyProviders, ...failedProviders];
        }
      }

      let lastError: any = null;
      let success = false;
      let finalResult: AIResponse | null = null;
      const startTime = Date.now();
      let providerUsed: AIProvider = normalizedSelected === "auto" ? "gemini" : normalizedSelected;
      let fallbackUsed = false;
      let fallbackReason: string | undefined = undefined;

      try {
        for (let i = 0; i < providersToTry.length; i++) {
          const provider = providersToTry[i];
          if (i > 0) {
            fallbackUsed = true;
          }
          if (signal?.aborted) {
            throw new Error("Request was cancelled by user.");
          }
          const providerStartTime = Date.now();
          recordAIAttempt(provider);

          try {
            // Validate support for document/PDF format
            if (isPdf && ["openai", "groq", "anthropic"].includes(provider)) {
              if (normalizedSelected !== "auto") {
                throw new Error(`The selected provider '${provider}' does not natively support PDF document uploads. Please use Gemini or OpenRouter, or switch to Auto AI.`);
              } else {
                serverLogger.info("AIService", `Skipping provider [${provider}] for PDF document input in Auto mode.`);
                continue;
              }
            }

            serverLogger.info("AIService", `Attempting AI request using provider: [${provider}]`);
            let resultText = "";
            providerUsed = provider;

            // Append active provider context
            let activeSystemInstruction = systemInstruction || "";
            const providerContext = `\n\n[Active AI Engine Context: You are currently running on the "${provider}" provider backend. If the user asks which AI provider, model, engine, or backend you are currently using, you MUST truthfully tell them that you are currently using ${provider}.]`;
            if (activeSystemInstruction) {
              activeSystemInstruction += providerContext;
            } else {
              activeSystemInstruction = providerContext;
            }

            if (provider === "gemini") {
              resultText = await callGemini(messages, activeSystemInstruction, image, responseSchema, timeoutMs, signal);
            } else if (provider === "openai") {
              resultText = await callOpenAI(messages, activeSystemInstruction, image, responseSchema, timeoutMs, signal);
            } else if (provider === "groq") {
              resultText = await callGroq(messages, activeSystemInstruction, image, responseSchema, timeoutMs, signal);
            } else if (provider === "openrouter") {
              resultText = await callOpenRouter(messages, activeSystemInstruction, image, responseSchema, timeoutMs, signal);
            } else if (provider === "anthropic") {
              resultText = await callAnthropic(messages, activeSystemInstruction, image, responseSchema, timeoutMs, signal);
            } else {
              throw new Error(`Unsupported AI provider requested: ${provider}`);
            }

            if (!resultText || resultText.trim() === "") {
              throw new Error(`Provider ${provider} returned an empty or invalid response.`);
            }

            const providerDuration = Date.now() - providerStartTime;
            const inputChars = messages.reduce((acc, m) => acc + (m.content?.length || 0), 0) + (systemInstruction?.length || 0) + (image?.length || 0);
            const outputChars = resultText.length;
            recordAISuccess(provider, providerDuration, inputChars, outputChars, false);
            serverLogger.info("AIService", `Successfully received response from provider: [${provider}] in ${providerDuration}ms`);
            
            clearFailureCache(provider, cacheKey);
            responseCache.set(cacheKey, {
              text: resultText,
              providerUsed: provider,
              timestamp: Date.now()
            });
            
            success = true;
            finalResult = {
              text: resultText,
              providerUsed: provider
            };
            break;
          } catch (err: any) {
            const providerDuration = Date.now() - providerStartTime;
            const errMsg = err.message || String(err);
            recordAIFailure(provider, errMsg);
            recordFailureCache(provider, cacheKey, errMsg);

            if (!fallbackReason) {
              fallbackReason = `${provider} failed: ${errMsg}`;
            }

            if (provider === "anthropic" && (errMsg.includes("credit balance") || errMsg.includes("Credit balance") || errMsg.includes("billing") || errMsg.includes("Billing") || errMsg.includes("status 400"))) {
              serverLogger.warn("AIService", "Disabling Anthropic provider dynamically due to credit balance/billing failure.");
              isAnthropicDisabled = true;
            }

            const nextProvider = providersToTry[i + 1] || "none";
            serverLogger.aiFallback(provider, nextProvider, errMsg, providerDuration);
            lastError = err;
            
            // Propagate immediate aborts
            if (err?.name === "AbortError" || err?.message?.includes("cancelled") || signal?.aborted) {
              throw err;
            }
          }
        }

        const requestDuration = Date.now() - startTime;
        const routingLog = {
          selectedProvider: preferredProvider || "auto",
          normalizedSelected,
          actualProvider: success ? providerUsed : (providersToTry[0] || normalizedSelected),
          providerConfigured: !!(config as any)[normalizedSelected],
          providerError: lastError ? (lastError.message || String(lastError)) : undefined,
          requestDuration,
          fallbackUsed,
          fallbackReason: fallbackUsed ? fallbackReason : undefined
        };
        console.log("[AIRoutingLog]", JSON.stringify(routingLog, null, 2));
        serverLogger.info("AIRoutingLog", JSON.stringify(routingLog));

        if (finalResult) {
          return finalResult;
        }
        if (lastError) {
          throw lastError;
        }
        throw new Error(`The selected AI provider '${normalizedSelected}' failed to generate a response.`);
      } catch (err: any) {
        lastError = err;
        throw err;
      } finally {
        const responseTimeMs = Date.now() - startTime;
        // Log details of request
        const errorMsg = success ? null : (lastError?.message || String(lastError));
        firebaseDB.saveAIRequestLog({
          id: `ailog-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
          provider: providerUsed,
          endpoint: messages.length > 1 ? "chat" : "solve",
          responseTimeMs,
          success,
          error: errorMsg,
          timestamp: new Date().toISOString()
        }).catch(e => console.error("[AIService] Failed to write AI request metrics log:", e));
      }
    }
  );
}

// ----------------------------------------------------
// PROVIDER IMPLEMENTATIONS
// ----------------------------------------------------

async function callGemini(
  messages: AIMessage[],
  systemInstruction?: string,
  image?: string,
  responseSchema?: any,
  timeoutMs?: number,
  signal?: AbortSignal
): Promise<string> {
  const gemini = getGeminiClient();
  if (!gemini) throw new Error("Gemini API key is not configured");

  const contents: any[] = [];
  
  messages.forEach((m, idx) => {
    const isLast = idx === messages.length - 1;
    const parts: any[] = [{ text: m.content }];

    if (isLast && image) {
      let mimeType = "image/png";
      let base64Data = image.trim();

      if (base64Data.startsWith("data:")) {
        const urlParts = base64Data.split(";base64,");
        if (urlParts.length === 2) {
          mimeType = urlParts[0].replace("data:", "").trim();
          base64Data = urlParts[1].trim();
        }
      }

      parts.push({
        inlineData: {
          mimeType,
          data: base64Data
        }
      });
    }

    contents.push({
      role: m.role === "model" || m.role === "assistant" ? "model" : "user",
      parts
    });
  });

  const config: any = {};
  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }
  if (responseSchema) {
    config.responseMimeType = "application/json";
    config.responseSchema = responseSchema;
  }

  const executeCall = async (modelName: string): Promise<string> => {
    return await retryWithBackoff(async () => {
      return await withTimeoutAndSignal(
        async (mergedSignal) => {
          const response = await gemini.models.generateContent({
            model: modelName,
            contents,
            config: {
              ...config,
              httpOptions: {
                headers: {
                  "User-Agent": "aistudio-build",
                },
                signal: mergedSignal
              }
            }
          });
          if (response.text) return response.text;
          throw new Error("Empty text response received from Gemini SDK.");
        },
        timeoutMs || DEFAULT_TIMEOUT_MS,
        `Gemini API request timed out after ${Math.round((timeoutMs || DEFAULT_TIMEOUT_MS) / 1000)} seconds for model: ${modelName}`,
        signal
      );
    }, 3, 1000, (err, attempt) => {
      console.info(`[AIService] Gemini attempt ${attempt} failed with error: ${err.message || err}. Retrying...`);
    }, signal);
  };

  try {
    return await executeCall("gemini-2.5-flash");
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (
      errMsg.includes("429") ||
      errMsg.includes("RESOURCE_EXHAUSTED") ||
      errMsg.includes("quota") ||
      errMsg.includes("503") ||
      errMsg.includes("UNAVAILABLE") ||
      errMsg.includes("high demand") ||
      errMsg.includes("overloaded") ||
      errMsg.includes("timed out") ||
      errMsg.includes("timeout") ||
      errMsg.includes("404") ||
      errMsg.includes("not found")
    ) {
      console.info(`[AIService] gemini-2.5-flash failed with: ${errMsg}. Instantly falling back to gemini-1.5-flash...`);
      try {
        return await executeCall("gemini-1.5-flash");
      } catch (fallbackErr) {
        console.error("[AIService] gemini-1.5-flash fallback failed, trying gemini-2.5-pro:", fallbackErr);
        try {
          return await executeCall("gemini-2.5-pro");
        } catch (proErr) {
          console.error("[AIService] gemini-2.5-pro fallback failed:", proErr);
        }
      }
    }
    throw err;
  }
}

async function callOpenAI(
  messages: AIMessage[],
  systemInstruction?: string,
  image?: string,
  responseSchema?: any,
  timeoutMs?: number,
  signal?: AbortSignal
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API key is not configured");

  const formattedMessages = convertMessagesToOpenAIFormat(messages, systemInstruction);

  if (image && formattedMessages.length > 0) {
    const lastMsg = formattedMessages[formattedMessages.length - 1];
    if (lastMsg.role === "user") {
      let imageFullUrl = image;
      if (!image.startsWith("data:")) {
        imageFullUrl = `data:image/png;base64,${image}`;
      }
      lastMsg.content = [
        { type: "text", text: lastMsg.content },
        { type: "image_url", image_url: { url: imageFullUrl } }
      ];
    }
  }

  const body: any = {
    model: "gpt-4o-mini",
    messages: formattedMessages,
    temperature: 0.7
  };

  if (responseSchema) {
    body.response_format = { type: "json_object" };
    const sysMsg = formattedMessages.find(m => m.role === "system");
    const jsonInstruction = "\nCRITICAL: Respond strictly with a JSON object.";
    if (sysMsg) {
      sysMsg.content += jsonInstruction;
    } else {
      formattedMessages.unshift({ role: "system", content: jsonInstruction });
    }
  }

  return await retryWithBackoff(async () => {
    return await withTimeoutAndSignal(
      async (mergedSignal) => {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify(body),
          signal: mergedSignal
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`OpenAI API returned status ${response.status}: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
      },
      timeoutMs || DEFAULT_TIMEOUT_MS,
      `OpenAI API request timed out after ${Math.round((timeoutMs || DEFAULT_TIMEOUT_MS) / 1000)} seconds.`,
      signal
    );
  }, 3, 1000, (err, attempt) => {
    console.info(`[AIService] OpenAI attempt ${attempt} failed with error: ${err.message || err}. Retrying...`);
  }, signal);
}

async function callGroq(
  messages: AIMessage[],
  systemInstruction?: string,
  image?: string,
  responseSchema?: any,
  timeoutMs?: number,
  signal?: AbortSignal
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Groq API key is not configured");

  const formattedMessages = convertMessagesToOpenAIFormat(messages, systemInstruction);
  const model = image ? "llama-3.2-11b-vision-instruct" : "llama-3.3-70b-versatile";

  if (image && formattedMessages.length > 0) {
    const lastMsg = formattedMessages[formattedMessages.length - 1];
    if (lastMsg.role === "user") {
      let imageFullUrl = image;
      if (!image.startsWith("data:")) {
        imageFullUrl = `data:image/png;base64,${image}`;
      }
      lastMsg.content = [
        { type: "text", text: lastMsg.content },
        { type: "image_url", image_url: { url: imageFullUrl } }
      ];
    }
  }

  const body: any = {
    model,
    messages: formattedMessages,
    temperature: 0.7
  };

  if (responseSchema) {
    body.response_format = { type: "json_object" };
    const sysMsg = formattedMessages.find(m => m.role === "system");
    const jsonInstruction = "\nCRITICAL: Respond strictly with a JSON object.";
    if (sysMsg) {
      sysMsg.content += jsonInstruction;
    } else {
      formattedMessages.unshift({ role: "system", content: jsonInstruction });
    }
  }

  return await retryWithBackoff(async () => {
    return await withTimeoutAndSignal(
      async (mergedSignal) => {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify(body),
          signal: mergedSignal
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Groq API returned status ${response.status}: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
      },
      timeoutMs || DEFAULT_TIMEOUT_MS,
      `Groq API request timed out after ${Math.round((timeoutMs || DEFAULT_TIMEOUT_MS) / 1000)} seconds.`,
      signal
    );
  }, 3, 1000, (err, attempt) => {
    console.info(`[AIService] Groq attempt ${attempt} failed with error: ${err.message || err}. Retrying...`);
  }, signal);
}

async function callOpenRouter(
  messages: AIMessage[],
  systemInstruction?: string,
  image?: string,
  responseSchema?: any,
  timeoutMs?: number,
  signal?: AbortSignal
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OpenRouter API key is not configured");

  const formattedMessages = convertMessagesToOpenAIFormat(messages, systemInstruction);
  const model = "google/gemini-2.5-flash";

  if (image && formattedMessages.length > 0) {
    const lastMsg = formattedMessages[formattedMessages.length - 1];
    if (lastMsg.role === "user") {
      let imageFullUrl = image;
      if (!image.startsWith("data:")) {
        imageFullUrl = `data:image/png;base64,${image}`;
      }
      lastMsg.content = [
        { type: "text", text: lastMsg.content },
        { type: "image_url", image_url: { url: imageFullUrl } }
      ];
    }
  }

  const body: any = {
    model,
    messages: formattedMessages,
    temperature: 0.7,
    max_tokens: 2000
  };

  if (responseSchema) {
    body.response_format = { type: "json_object" };
    const sysMsg = formattedMessages.find(m => m.role === "system");
    const jsonInstruction = "\nCRITICAL: Respond strictly with a JSON object.";
    if (sysMsg) {
      sysMsg.content += jsonInstruction;
    } else {
      formattedMessages.unshift({ role: "system", content: jsonInstruction });
    }
  }

  return await retryWithBackoff(async () => {
    return await withTimeoutAndSignal(
      async (mergedSignal) => {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": "https://studymate-ai.com",
            "X-Title": "StudyMate AI"
          },
          body: JSON.stringify(body),
          signal: mergedSignal
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`OpenRouter API returned status ${response.status}: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
      },
      timeoutMs || DEFAULT_TIMEOUT_MS,
      `OpenRouter API request timed out after ${Math.round((timeoutMs || DEFAULT_TIMEOUT_MS) / 1000)} seconds.`,
      signal
    );
  }, 3, 1000, (err, attempt) => {
    console.info(`[AIService] OpenRouter attempt ${attempt} failed with error: ${err.message || err}. Retrying...`);
  }, signal);
}

async function callAnthropic(
  messages: AIMessage[],
  systemInstruction?: string,
  image?: string,
  responseSchema?: any,
  timeoutMs?: number,
  signal?: AbortSignal
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Anthropic API key is not configured");

  const formattedMessages = convertMessagesToAnthropicFormat(messages);

  if (image && formattedMessages.length > 0) {
    const lastMsg = formattedMessages[formattedMessages.length - 1];
    if (lastMsg.role === "user") {
      let mimeType = "image/png";
      let base64Data = image.trim();

      if (base64Data.startsWith("data:")) {
        const urlParts = base64Data.split(";base64,");
        if (urlParts.length === 2) {
          mimeType = urlParts[0].replace("data:", "").trim();
          base64Data = urlParts[1].trim();
        }
      }

      lastMsg.content = [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: mimeType,
            data: base64Data
          }
        },
        { type: "text", text: lastMsg.content }
      ];
    }
  }

  const body: any = {
    model: "claude-3-5-haiku-20241022",
    max_tokens: 4000,
    messages: formattedMessages,
    temperature: 0.7
  };

  if (systemInstruction) {
    body.system = systemInstruction;
  }

  if (responseSchema) {
    const jsonInstruction = "\nCRITICAL: Respond strictly with a JSON object.";
    if (body.system) {
      body.system += jsonInstruction;
    } else {
      body.system = jsonInstruction;
    }
  }

  return await retryWithBackoff(async () => {
    return await withTimeoutAndSignal(
      async (mergedSignal) => {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify(body),
          signal: mergedSignal
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Anthropic API returned status ${response.status}: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.content?.[0]?.text || "";
      },
      timeoutMs || DEFAULT_TIMEOUT_MS,
      `Anthropic API request timed out after ${Math.round((timeoutMs || DEFAULT_TIMEOUT_MS) / 1000)} seconds.`,
      signal
    );
  }, 3, 1000, (err, attempt) => {
    console.info(`[AIService] Anthropic attempt ${attempt} failed with error: ${err.message || err}. Retrying...`);
  }, signal);
}

// ==========================================
// Centralized Multi-Provider Image Generator
// ==========================================

export interface GenerateImageOptions {
  prompt: string;
  category?: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  quality?: "standard" | "hd";
  preferredProvider?: "auto" | "gemini" | "openai" | "fal";
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface GenerateImageResult {
  imageUrl: string;
  providerUsed: "gemini" | "openai" | "fal";
  revisedPrompt?: string;
  cached?: boolean;
}

export function enhancePromptForCategory(prompt: string, category?: string, quality?: string): string {
  if (!prompt || typeof prompt !== "string") return "";
  const base = prompt.trim();
  const qualitySuffix = quality === "hd" ? ", ultra high definition, 8k resolution, crisp vector rendering, highly detailed" : "";

  switch (category?.toLowerCase().replace(/\s+/g, "-")) {
    case "educational-diagrams":
    case "educational-diagram":
      return `Clear academic textbook diagram, labeled educational illustration, clean white background, vector graphic style, accurate and professional: ${base}${qualitySuffix}`;
    case "biology-diagrams":
    case "biology":
      return `Accurate scientific biology diagram, anatomy and organ systems, clearly labeled parts, high contrast educational illustration: ${base}${qualitySuffix}`;
    case "chemistry-illustrations":
    case "chemistry":
      return `Detailed chemistry molecular structure, chemical reaction mechanism diagram, laboratory glassware, clean scientific illustration: ${base}${qualitySuffix}`;
    case "physics-diagrams":
    case "physics":
      return `Physics optics, mechanics, or circuit vector diagram, clear force vectors and labeled parameters, educational textbook style: ${base}${qualitySuffix}`;
    case "geography-maps":
    case "geography":
      return `Detailed geographical map illustration, topography, rivers, boundaries, cartographic labels, clean layout: ${base}${qualitySuffix}`;
    case "mind-maps":
    case "mindmap":
      return `Visually structured mind map, central concept with branching topic nodes, clean typography, color-coded branches, high legibility: ${base}${qualitySuffix}`;
    case "flowcharts":
    case "flowchart":
      return `Clean algorithmic flowchart, process diagram with decision nodes, arrows, structured workflow layout, high contrast: ${base}${qualitySuffix}`;
    case "charts":
    case "chart":
      return `Clean infographics data chart, bar chart or pie graph, clear labels and legend, modern presentation design: ${base}${qualitySuffix}`;
    case "ai-art":
      return `Stunning artistic masterpiece, expressive lighting, rich colors, intricate details, artistic concept: ${base}${qualitySuffix}`;
    case "logos":
    case "logo":
      return `Minimalist modern logo design, clean vector graphic, solid flat colors, isolated on white background, iconic emblem: ${base}${qualitySuffix}`;
    case "icons":
    case "icon":
      return `App icon design, modern clean UI icon, flat design, smooth gradient, sharp outline, isolated on neutral background: ${base}${qualitySuffix}`;
    case "posters":
    case "poster":
      return `Eye-catching promotional poster design, strong typography, dramatic layout, vibrant color palette, high impact: ${base}${qualitySuffix}`;
    default:
      return `${base}${qualitySuffix}`;
  }
}

export const enhancePromptByCategory = enhancePromptForCategory;

export async function generateImagePollinations(
  prompt: string,
  aspectRatio = "1:1",
  signal?: AbortSignal,
  timeoutMs = 25000
): Promise<{ imageUrl: string; revisedPrompt?: string }> {
  let width = 1024;
  let height = 1024;
  if (aspectRatio === "16:9") { width = 1280; height = 720; }
  else if (aspectRatio === "9:16") { width = 720; height = 1280; }
  else if (aspectRatio === "4:3") { width = 1024; height = 768; }
  else if (aspectRatio === "3:4") { width = 768; height = 1024; }

  return await retryWithBackoff(async () => {
    const seed = Math.floor(Math.random() * 1000000);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&seed=${seed}`;

    try {
      const res = await fetchWithTimeout(pollinationsUrl, { signal }, timeoutMs);
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const b64 = Buffer.from(buffer).toString("base64");
        const mime = res.headers.get("content-type") || "image/jpeg";
        if (b64.length > 100) {
          recordImageProviderHealthSuccess("pollinations");
          return { imageUrl: `data:${mime};base64,${b64}`, revisedPrompt: prompt };
        }
      }
    } catch (e: any) {
      serverLogger.warn("AIServiceImage", `Pollinations fetch failed: ${e.message}`);
      if (!isTransientImageError(e)) {
        throw e;
      }
      throw e;
    }

    recordImageProviderHealthSuccess("pollinations");
    return { imageUrl: `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`, revisedPrompt: prompt };
  }, 2, 800, undefined, signal);
}

export async function generateImageGemini(
  prompt: string,
  aspectRatio = "1:1",
  quality = "standard",
  signal?: AbortSignal,
  timeoutMs = 45000
): Promise<{ imageUrl: string; revisedPrompt?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !isValidKey(apiKey)) {
    recordImageProviderHealthFailure("gemini", "GEMINI_API_KEY is missing or invalid", true);
    throw new Error("GEMINI_API_KEY is not configured or is invalid");
  }

  // Fast-path check: if marked unhealthy (e.g. 404 unsupported on key), fallback immediately
  if (imageProviderHealthState.gemini.status === "unhealthy") {
    serverLogger.info("AIServiceImage", "Gemini Imagen marked unhealthy; routing directly to Pollinations AI fallback.");
    return await generateImagePollinations(prompt, aspectRatio, signal, timeoutMs);
  }

  let geminiRatio = "1:1";
  if (aspectRatio === "16:9") geminiRatio = "16:9";
  else if (aspectRatio === "9:16") geminiRatio = "9:16";
  else if (aspectRatio === "3:4" || aspectRatio === "4:3") geminiRatio = aspectRatio;

  const candidateModels = ["imagen-3.0-generate-002", "imagen-3.0-fast-generate-001", "imagen-3.0-generate-001"];

  return await retryWithBackoff(async () => {
    let is404Error = false;

    // 1. Try GoogleGenAI SDK with candidate models
    const gemini = getGeminiClient();
    if (gemini && typeof (gemini.models as any).generateImages === "function") {
      for (const modelCandidate of candidateModels) {
        if (is404Error) break;
        try {
          const sdkRes = await withTimeoutAndSignal(
            async () => {
              return await (gemini.models as any).generateImages({
                model: modelCandidate,
                prompt,
                config: {
                  numberOfImages: 1,
                  outputMimeType: "image/jpeg",
                  aspectRatio: geminiRatio,
                },
              });
            },
            Math.min(timeoutMs, 10000),
            "Gemini Imagen SDK request timed out",
            signal
          );

          const imageObj = sdkRes?.generatedImages?.[0]?.image;
          const rawBytes = imageObj?.imageBytes;
          if (rawBytes) {
            let b64Str = "";
            if (typeof rawBytes === "string") {
              b64Str = rawBytes.replace(/\s+/g, "");
            } else if (Buffer.isBuffer(rawBytes) || rawBytes instanceof Uint8Array) {
              b64Str = Buffer.from(rawBytes).toString("base64");
            }
            if (b64Str.length > 50) {
              const mime = imageObj?.mimeType || "image/jpeg";
              const imageUrl = b64Str.startsWith("data:") ? b64Str : `data:${mime};base64,${b64Str}`;
              recordImageProviderHealthSuccess("gemini");
              return { imageUrl, revisedPrompt: prompt };
            }
          }
        } catch (e: any) {
          const msg = e.message || String(e);
          if (msg.includes("404") || msg.includes("NOT_FOUND")) {
            is404Error = true;
          } else {
            serverLogger.warn("AIServiceImage", `Gemini SDK generateImages model ${modelCandidate} error: ${msg}`);
          }
        }
      }
    }

    // 2. Try REST API predict endpoint if not 404
    if (!is404Error) {
      for (const modelCandidate of candidateModels) {
        if (is404Error) break;
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelCandidate}:predict?key=${apiKey.trim()}`;
          const response = await fetchWithTimeout(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              instances: [{ prompt }],
              parameters: {
                sampleCount: 1,
                aspectRatio: geminiRatio,
                outputOptions: { mimeType: "image/jpeg" }
              }
            }),
            signal
          }, Math.min(timeoutMs, 8000));

          if (response.ok) {
            const data = await response.json();
            const bytes = data?.predictions?.[0]?.bytesBase64Encoded || data?.predictions?.[0]?.image?.imageBytes;
            if (bytes) {
              let cleanB64 = "";
              if (typeof bytes === "string") {
                cleanB64 = bytes.replace(/\s+/g, "");
              } else if (Buffer.isBuffer(bytes) || bytes instanceof Uint8Array) {
                cleanB64 = Buffer.from(bytes).toString("base64");
              }

              if (cleanB64 && cleanB64.length >= 50) {
                const imageUrl = cleanB64.startsWith("data:") ? cleanB64 : `data:image/jpeg;base64,${cleanB64}`;
                recordImageProviderHealthSuccess("gemini");
                return { imageUrl, revisedPrompt: prompt };
              }
            }
          } else {
            const errText = await response.text().catch(() => "");
            if (response.status === 404 || errText.includes("404") || errText.includes("NOT_FOUND")) {
              is404Error = true;
            } else {
              serverLogger.warn("AIServiceImage", `Gemini REST predict with model ${modelCandidate} returned HTTP ${response.status}: ${errText}`);
            }
          }
        } catch (e: any) {
          serverLogger.warn("AIServiceImage", `Gemini REST predict error for model ${modelCandidate}: ${e.message}`);
        }
      }
    }

    if (is404Error) {
      recordImageProviderHealthFailure("gemini", "Gemini Imagen models unavailable on this API key", true);
    }

    // Fallback to Pollinations AI if Gemini Imagen endpoints fail or return 404
    serverLogger.info("AIServiceImage", "Gemini Imagen endpoints unavailable on current key; using Pollinations AI fallback.");
    return await generateImagePollinations(prompt, aspectRatio, signal, timeoutMs);
  }, 1, 500, undefined, signal);
}

export async function generateImageOpenAI(
  prompt: string,
  aspectRatio = "1:1",
  quality = "standard",
  signal?: AbortSignal,
  timeoutMs = 45000
): Promise<{ imageUrl: string; revisedPrompt?: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !isValidKey(apiKey)) {
    recordImageProviderHealthFailure("openai", "OPENAI_API_KEY is missing or invalid", true);
    throw new Error("OPENAI_API_KEY is not configured or is invalid");
  }

  let size: "1024x1024" | "1024x1792" | "1792x1024" = "1024x1024";
  if (aspectRatio === "16:9" || aspectRatio === "4:3") size = "1792x1024";
  else if (aspectRatio === "9:16" || aspectRatio === "3:4") size = "1024x1792";

  return await retryWithBackoff(async () => {
    return await withTimeoutAndSignal(
      async (mergedSignal) => {
        const response = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey.trim()}`
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt,
            n: 1,
            size,
            quality: quality === "hd" ? "hd" : "standard",
            response_format: "b64_json"
          }),
          signal: mergedSignal
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.error?.message || response.statusText;
          const isHardAuth = response.status === 401 || response.status === 403;
          if (isHardAuth) {
            recordImageProviderHealthFailure("openai", `OpenAI HTTP ${response.status}: ${errMsg}`, true);
          }
          throw new Error(`OpenAI DALL-E 3 HTTP ${response.status}: ${errMsg}`);
        }

        const data = await response.json();
        const item = data.data?.[0];
        if (!item) {
          throw new Error("OpenAI DALL-E 3 returned empty data array.");
        }

        let imageUrl = "";
        if (item.b64_json) {
          const cleanB64 = typeof item.b64_json === "string" ? item.b64_json.replace(/\s+/g, "") : "";
          if (cleanB64.length > 50) {
            imageUrl = cleanB64.startsWith("data:") ? cleanB64 : `data:image/png;base64,${cleanB64}`;
          }
        } else if (item.url && typeof item.url === "string" && item.url.startsWith("http")) {
          imageUrl = item.url;
        }

        if (!imageUrl) {
          throw new Error("OpenAI DALL-E 3 returned no valid image URL or base64 data.");
        }

        recordImageProviderHealthSuccess("openai");
        return {
          imageUrl,
          revisedPrompt: item.revised_prompt || prompt
        };
      },
      timeoutMs,
      "OpenAI DALL-E 3 request timed out.",
      signal
    );
  }, 2, 800, undefined, signal);
}

export async function generateImageFal(
  prompt: string,
  aspectRatio = "1:1",
  quality = "standard",
  signal?: AbortSignal,
  timeoutMs = 45000
): Promise<{ imageUrl: string; revisedPrompt?: string }> {
  const falKey = process.env.FAL_KEY || process.env.FAL_API_KEY;
  if (!falKey || !isValidKey(falKey)) {
    recordImageProviderHealthFailure("fal", "FAL_KEY is missing or invalid", true);
    throw new Error("FAL_KEY is not configured or is invalid");
  }

  let image_size = "square_hd";
  if (aspectRatio === "16:9") image_size = "landscape_16_9";
  else if (aspectRatio === "9:16") image_size = "portrait_16_9";
  else if (aspectRatio === "4:3") image_size = "landscape_4_3";
  else if (aspectRatio === "3:4") image_size = "portrait_4_3";

  return await retryWithBackoff(async () => {
    return await withTimeoutAndSignal(
      async (mergedSignal) => {
        const response = await fetch("https://fal.run/fal-ai/flux/schnell", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Key ${falKey.trim()}`
          },
          body: JSON.stringify({
            prompt,
            image_size,
            num_images: 1,
            num_inference_steps: quality === "hd" ? 6 : 4,
            enable_safety_checker: true
          }),
          signal: mergedSignal
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.detail || errData.error || response.statusText;
          const isHardAuth = response.status === 401 || response.status === 403;
          if (isHardAuth) {
            recordImageProviderHealthFailure("fal", `Fal.ai HTTP ${response.status}: ${errMsg}`, true);
          }
          throw new Error(`Fal.ai FLUX HTTP ${response.status}: ${errMsg}`);
        }

        const data = await response.json();
        let imageUrl = "";
        if (data.images?.[0]?.url) {
          imageUrl = data.images[0].url;
        } else if (data.image?.url) {
          imageUrl = data.image.url;
        } else if (data.output?.[0]?.url) {
          imageUrl = data.output[0].url;
        } else if (data.images?.[0]?.b64) {
          const b64 = String(data.images[0].b64).replace(/\s+/g, "");
          imageUrl = b64.startsWith("data:") ? b64 : `data:image/jpeg;base64,${b64}`;
        }

        if (!imageUrl || typeof imageUrl !== "string" || (!imageUrl.startsWith("http") && !imageUrl.startsWith("data:"))) {
          throw new Error("Fal.ai FLUX returned no valid image URL.");
        }

        recordImageProviderHealthSuccess("fal");
        return {
          imageUrl,
          revisedPrompt: data.prompt || prompt
        };
      },
      timeoutMs,
      "Fal.ai image generation request timed out.",
      signal
    );
  }, 2, 800, undefined, signal);
}

// Centralized AI Image Router with dynamic provider health check and multi-level automatic fallback
export async function executeImageGenRequest(options: ImageGenOptions): Promise<ImageGenResponse> {
  const {
    prompt,
    category,
    aspectRatio = "1:1",
    quality = "standard",
    preferredProvider = "auto",
    timeoutMs = 45000,
    signal
  } = options;

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    throw new Error("A valid non-empty prompt string is required for image generation.");
  }

  const revisedPrompt = enhancePromptForCategory(prompt, category, quality);
  const cacheKey = `${revisedPrompt}_${aspectRatio}_${quality}`;

  const cached = imageCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < IMAGE_CACHE_TTL_MS)) {
    cacheMetrics.successCacheHits++;
    serverLogger.info("AIServiceImage", `Cache HIT for prompt: "${revisedPrompt.substring(0, 40)}..."`);
    return {
      imageUrl: cached.imageUrl,
      providerUsed: cached.providerUsed,
      revisedPrompt,
      cached: true
    };
  }
  cacheMetrics.successCacheMisses++;

  const payloadSize = revisedPrompt.length * 2;

  return concurrencyQueue.enqueue(
    {
      category: "image_generation",
      taskName: "executeImageGenRequest",
      payloadSize,
      timeoutMs,
      signal
    },
    async () => {
      const config = getConfiguredImageProviders();
      const healthMap = checkImageProviderHealth();
      const normalizedImageProvider = normalizeProvider(preferredProvider);

      let providersToTry: ("fal" | "gemini" | "openai")[] = [];

      if (normalizedImageProvider !== "auto") {
        providersToTry = [normalizedImageProvider as ("fal" | "gemini" | "openai")];
      } else {
        // Primary fallback sequence for image generation: Fal -> Gemini -> OpenAI
        const defaultSequence: ("fal" | "gemini" | "openai")[] = ["fal", "gemini", "openai"];
        providersToTry = defaultSequence.filter(p => config[p]);

        // Prioritize healthy/degraded providers over known unhealthy ones in auto mode
        providersToTry.sort((a, b) => {
          const healthA = healthMap[a]?.status || "unhealthy";
          const healthB = healthMap[b]?.status || "unhealthy";
          if (healthA === "healthy" && healthB !== "healthy") return -1;
          if (healthA !== "healthy" && healthB === "healthy") return 1;
          if (healthA === "degraded" && healthB === "unhealthy") return -1;
          if (healthA === "unhealthy" && healthB === "degraded") return 1;
          return 0;
        });

        // Failure-Aware Reordering in auto mode
        const failedProviders = providersToTry.filter(p => isProviderInFailureCache(p, cacheKey));
        const healthyProviders = providersToTry.filter(p => !isProviderInFailureCache(p, cacheKey));

        if (failedProviders.length > 0 && healthyProviders.length > 0) {
          cacheMetrics.failureCacheBypasses++;
          providersToTry = [...healthyProviders, ...failedProviders];
        }
      }

      const errors: string[] = [];
      const startTime = Date.now();
      let lastUsedProvider: AIImageProvider = providersToTry[0] || "fal";

      serverLogger.info("AIServiceImage", `[ImageGen Request] Prompt: "${prompt.substring(0, 50)}...", Category: ${category || "General"}, AspectRatio: ${aspectRatio}, Quality: ${quality}, Preferred: ${preferredProvider}, Pipeline: [${providersToTry.join(" -> ")}]`);

      for (let i = 0; i < providersToTry.length; i++) {
        const provider = providersToTry[i];
        lastUsedProvider = provider;
        const providerStartTime = Date.now();
        recordAIAttempt(provider);

        if (signal?.aborted) {
          throw new Error("Image generation request was cancelled by user.");
        }

        try {
          serverLogger.info("AIServiceImage", `[Attempt ${i + 1}/${providersToTry.length}] Calling image provider: [${provider}]`);

          let genResult: { imageUrl: string; revisedPrompt?: string } = { imageUrl: "" };

          if (provider === "fal") {
            genResult = await generateImageFal(revisedPrompt, aspectRatio, quality, signal, timeoutMs);
          } else if (provider === "gemini") {
            genResult = await generateImageGemini(revisedPrompt, aspectRatio, quality, signal, timeoutMs);
          } else if (provider === "openai") {
            genResult = await generateImageOpenAI(revisedPrompt, aspectRatio, quality, signal, timeoutMs);
          }

          if (!genResult.imageUrl || typeof genResult.imageUrl !== "string" || !genResult.imageUrl.trim()) {
            throw new Error(`Provider [${provider}] returned an empty image payload.`);
          }

          const duration = Date.now() - providerStartTime;
          recordAISuccess(provider, duration, prompt.length, 0, true);
          recordImageProviderHealthSuccess(provider);

          serverLogger.info("AIServiceImage", `Successfully generated image with provider [${provider}] in ${duration}ms. Format: ${genResult.imageUrl.substring(0, 30)}...`);

          clearFailureCache(provider, cacheKey);
          imageCache.set(cacheKey, {
            imageUrl: genResult.imageUrl,
            providerUsed: provider,
            timestamp: Date.now()
          });

          firebaseDB.saveAIRequestLog({
            id: `imglog-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
            provider,
            endpoint: "generate-image",
            responseTimeMs: duration,
            success: true,
            timestamp: new Date().toISOString()
          }).catch(e => console.error("[AIServiceImage] Failed to save AI request log:", e));

          return {
            imageUrl: genResult.imageUrl,
            providerUsed: provider,
            revisedPrompt: genResult.revisedPrompt || revisedPrompt
          };
        } catch (err: any) {
          const duration = Date.now() - providerStartTime;
          const errMsg = err.message || String(err);
          recordAIFailure(provider, errMsg);
          recordFailureCache(provider, cacheKey, errMsg);
          recordImageProviderHealthFailure(provider, errMsg, !isTransientImageError(err));

          const nextProvider = providersToTry[i + 1] || "pollinations";
          serverLogger.aiFallback(provider, nextProvider, errMsg, duration);
          errors.push(`[${provider.toUpperCase()}] ${errMsg}`);

          if (err?.name === "AbortError" || err?.message?.includes("cancelled") || signal?.aborted) {
            throw new Error("Image generation request was cancelled.");
          }
        }
      }

      const totalDuration = Date.now() - startTime;
      firebaseDB.saveAIRequestLog({
        id: `imglog-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
        provider: lastUsedProvider,
        endpoint: "generate-image",
        responseTimeMs: totalDuration,
        success: false,
        error: errors.join(" | "),
        timestamp: new Date().toISOString()
      }).catch(e => console.error("[AIServiceImage] Failed to save AI request failure log:", e));

      serverLogger.warn("AIServiceImage", `All configured image providers failed or none available (${errors.join("; ") || "No API keys"}). Falling back to Pollinations AI.`);
      try {
        const polRes = await generateImagePollinations(revisedPrompt, aspectRatio, signal, timeoutMs);
        return {
          imageUrl: polRes.imageUrl,
          providerUsed: "fal", // Preserve frontend compatibility badge
          revisedPrompt
        };
      } catch (finalErr: any) {
        throw new Error(`All image generation attempts failed including fallback:\n${errors.join("\n")}`);
      }
    }
  );
}

export const generateImageWithFallback = executeImageGenRequest;

import { generateVideo, getGenerationStatus as getVideoStatus, cancelGeneration as cancelVideoGen, getUserVideoHistory } from "./videoProviders/orchestrator";
import { VideoGenerationInput, NormalizedVideoResult } from "./videoProviders/types";

export async function executeVideoGenRequest(
  options: VideoGenerationInput
): Promise<NormalizedVideoResult> {
  return concurrencyQueue.enqueue(
    {
      category: "image_generation",
      taskName: `video_gen:${options.prompt.slice(0, 20)}`,
      timeoutMs: options.timeoutMs || 240000,
      signal: options.signal
    },
    async () => {
      const result = await generateVideo(options);

      firebaseDB.saveAIRequestLog({
        id: `vidlog-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
        provider: result.provider,
        endpoint: "generate-video",
        responseTimeMs: 0,
        success: result.success,
        error: result.error,
        timestamp: new Date().toISOString()
      }).catch(e => console.error("[AIServiceVideo] Failed to save video AI request log:", e));

      return result;
    }
  );
}

export { getVideoStatus, cancelVideoGen, getUserVideoHistory };

export { AIRouter } from "./aiRouter";
export type { AITaskType, AIRouterOptions, AIRouterResult } from "./aiRouter";

