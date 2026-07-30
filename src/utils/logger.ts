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

  const message = typeof rawError === "string" 
    ? rawError 
    : rawError.message || String(rawError);

  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes("networkerror") || lowerMsg.includes("failed to fetch") || lowerMsg.includes("network error")) {
    return "Network connection issue. Please check your internet connection and try again.";
  }

  if (lowerMsg.includes("429") || lowerMsg.includes("resource_exhausted") || lowerMsg.includes("rate limit") || lowerMsg.includes("quota")) {
    return "StudyMate AI is receiving high traffic right now. Please wait a few seconds and try again.";
  }

  if (lowerMsg.includes("504") || lowerMsg.includes("gateway timeout") || lowerMsg.includes("timeout")) {
    return "The AI request timed out. Retrying with high-speed response mode...";
  }

  if (lowerMsg.includes("401") || lowerMsg.includes("unauthorized") || lowerMsg.includes("jwt") || lowerMsg.includes("session expired")) {
    return "Your study session expired. Please sign in again to continue.";
  }

  if (lowerMsg.includes("credit balance") || lowerMsg.includes("billing") || lowerMsg.includes("key")) {
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
    const reasonMsg = event.reason?.message || (typeof event.reason === "string" ? event.reason : "Unhandled promise rejection detected");
    logger.error("GlobalUnhandledRejection", reasonMsg, event.reason);
    if (typeof event.preventDefault === "function") {
      event.preventDefault();
    }
  };

  window.addEventListener("error", handleWindowError);
  window.addEventListener("unhandledrejection", handleUnhandledRejection);

  return () => {
    window.removeEventListener("error", handleWindowError);
    window.removeEventListener("unhandledrejection", handleUnhandledRejection);
  };
}
