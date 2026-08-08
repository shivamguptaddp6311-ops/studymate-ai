/**
 * Centralized Client-Side Monitoring & Structured Error Logging Utility
 */

export type ClientLogLevel = "info" | "warn" | "error" | "perf" | "ai";

export interface ClientLogPayload {
  level: ClientLogLevel;
  tag: string;
  message: string;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
  timestamp: string;
}

// In-memory set for deduplicating recent error logs sent to server
const sentErrorsCache = new Set<string>();
const MAX_CACHE_SIZE = 50;

/**
 * User-friendly error message transformer
 * Ensures students and users never see scary stack traces, raw secret keys, or internal HTTP exception dumps.
 */
export function getFriendlyErrorMessage(rawError: any): string {
  if (!rawError) return "An unexpected error occurred. Please try again.";

  let errorCode: string | undefined = undefined;
  let providerName: string | undefined = undefined;
  let message: string = "";

  if (typeof rawError === "object" && rawError !== null) {
    errorCode = rawError.errorCode || rawError.code || rawError.data?.errorCode;
    providerName = rawError.provider || rawError.data?.provider;
    message = rawError.message || rawError.error || String(rawError);
  } else if (typeof rawError === "string") {
    message = rawError;
    if (rawError.trim().startsWith("{") && rawError.trim().endsWith("}")) {
      try {
        const parsed = JSON.parse(rawError.trim());
        if (parsed && typeof parsed === "object") {
          errorCode = parsed.errorCode || parsed.code;
          providerName = parsed.provider;
          message = parsed.error || parsed.message || rawError;
        }
      } catch {
        // Not valid JSON
      }
    }
  } else {
    message = String(rawError);
  }

  const formattedProvider = providerName 
    ? (providerName.charAt(0).toUpperCase() + providerName.slice(1)) 
    : "AI";

  // 1. Structured Error Code Path
  if (errorCode) {
    switch (errorCode) {
      case "AUTH_SESSION_EXPIRED":
        return "Your study session expired. Please sign in again.";
      case "PROVIDER_AUTH_FAILED":
        return `The ${formattedProvider} AI connection has an invalid API key. We're switching you to another provider — or check Settings > API Keys.`;
      case "PROVIDER_BILLING_FAILED":
        return "AI Provider undergoing scheduled maintenance. Automatically routing to backup AI engine...";
      case "RATE_LIMITED":
        return "StudyMate AI is receiving high traffic right now. Please wait a few seconds and try again.";
      case "TIMEOUT":
        return "The AI request timed out. Retrying with high-speed response mode...";
      case "NETWORK_ERROR":
        return "Network connection issue. Please check your internet connection and try again.";
      default:
        break;
    }
  }

  // 2. Legacy / Unstructured Error Fallback Path
  console.warn("[getFriendlyErrorMessage] Unstructured error encountered (missing errorCode):", message);

  const lowerMsg = message.toLowerCase();

  // Explicit AI provider / API key check to prevent false positive "session expired" diagnosis
  const mentionsProviderOrKey = 
    lowerMsg.includes("gemini") || lowerMsg.includes("openai") || 
    lowerMsg.includes("claude") || lowerMsg.includes("groq") || 
    lowerMsg.includes("grok") || lowerMsg.includes("deepseek") || 
    lowerMsg.includes("openrouter") || lowerMsg.includes("anthropic") ||
    lowerMsg.includes("api key") || lowerMsg.includes("api_key");

  if (mentionsProviderOrKey && (lowerMsg.includes("401") || lowerMsg.includes("unauthorized") || lowerMsg.includes("invalid") || lowerMsg.includes("forbidden"))) {
    return `The ${formattedProvider} AI connection has an invalid API key. We're switching you to another provider — or check Settings > API Keys.`;
  }

  if (lowerMsg.includes("networkerror") || lowerMsg.includes("failed to fetch") || lowerMsg.includes("network error")) {
    return "Network connection issue. Please check your internet connection and try again.";
  }

  if (lowerMsg.includes("429") || lowerMsg.includes("resource_exhausted") || lowerMsg.includes("rate limit") || lowerMsg.includes("quota")) {
    return "StudyMate AI is receiving high traffic right now. Please wait a few seconds and try again.";
  }

  if (lowerMsg.includes("504") || lowerMsg.includes("gateway timeout") || lowerMsg.includes("timeout")) {
    return "The AI request timed out. Retrying with high-speed response mode...";
  }

  if (lowerMsg.includes("session expired") || lowerMsg.includes("jwt") || lowerMsg.includes("re-login") || lowerMsg.includes("log in again")) {
    return "Your study session expired. Please sign in again to continue.";
  }

  if (lowerMsg.includes("credit balance") || lowerMsg.includes("insufficient_quota") || lowerMsg.includes("billing") || lowerMsg.includes("no credits remaining")) {
    return "AI Provider undergoing scheduled maintenance. Automatically routing to backup AI engine...";
  }

  if (lowerMsg.includes("abort") || lowerMsg.includes("cancelled")) {
    return "Request was cancelled.";
  }

  // Clean raw message without leaking file paths or stacks
  const cleanMsg = message.split("\n")[0].replace(/http:\/\/[^\s]+/g, "").substring(0, 150);
  return cleanMsg.length > 5 ? cleanMsg : "Unable to complete request. Please refresh or try again.";
}

/**
 * Async client-side log report to server endpoint
 */
async function sendLogToServer(payload: ClientLogPayload): Promise<void> {
  if (payload.level !== "error" && payload.level !== "ai") return;

  const dedupKey = `${payload.tag}:${payload.message}:${payload.error?.message || ""}`;
  if (sentErrorsCache.has(dedupKey)) {
    return; // Skip duplicate log
  }

  if (sentErrorsCache.size > MAX_CACHE_SIZE) {
    sentErrorsCache.clear();
  }
  sentErrorsCache.add(dedupKey);

  try {
    if (typeof fetch === "function") {
      fetch("/api/logs/client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      }).catch(() => {
        // Silently catch network failures when reporting client logs
      });
    }
  } catch (err) {
    // Ignore report errors
  }
}

export const logger = {
  info(tag: string, message: string, metadata?: Record<string, any>) {
    if (import.meta.env.DEV) {
      console.log(`%c[INFO] [${tag}]`, "color: #3b82f6; font-weight: bold;", message, metadata || "");
    }
  },

  warn(tag: string, message: string, metadata?: Record<string, any>) {
    console.warn(`[WARN] [${tag}]`, message, metadata || "");
  },

  error(tag: string, message: string, err?: any, metadata?: Record<string, any>) {
    const errorObj = err instanceof Error
      ? { name: err.name, message: err.message, stack: import.meta.env.DEV ? err.stack : undefined }
      : err ? { name: "Error", message: String(err) } : undefined;

    console.error(`[ERROR] [${tag}]`, message, errorObj || "", metadata || "");

    const payload: ClientLogPayload = {
      level: "error",
      tag,
      message,
      error: errorObj,
      metadata,
      timestamp: new Date().toISOString()
    };

    sendLogToServer(payload);
  },

  perf(tag: string, message: string, durationMs: number, metadata?: Record<string, any>) {
    if (import.meta.env.DEV || durationMs > 1000) {
      console.log(`%c[PERF] [${tag}] ${durationMs}ms`, "color: #a855f7; font-weight: bold;", message, metadata || "");
    }
  },

  ai(tag: string, message: string, metadata?: Record<string, any>) {
    console.log(`%c[AI-ROUTER] [${tag}]`, "color: #10b981; font-weight: bold;", message, metadata || "");
    sendLogToServer({
      level: "ai",
      tag,
      message,
      metadata,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Initializes global window runtime error & promise rejection listeners
 */
export function setupGlobalErrorMonitoring(): () => void {
  const handleWindowError = (event: ErrorEvent) => {
    logger.error("GlobalUncaughtException", event.message, event.error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    const reasonMsg = event.reason?.message || (typeof event.reason === "string" ? event.reason : "Unhandled promise rejection detected");
    logger.warn("UnhandledRejection", reasonMsg);
  };

  window.addEventListener("error", handleWindowError);
  window.addEventListener("unhandledrejection", handleUnhandledRejection);

  return () => {
    window.removeEventListener("error", handleWindowError);
    window.removeEventListener("unhandledrejection", handleUnhandledRejection);
  };
}
