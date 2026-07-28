import { logger, getFriendlyErrorMessage } from "./logger";

export interface ApiClientOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  dedupe?: boolean; // Deduplicate in-flight identical requests
}

// In-flight active request cache for deduplication
const inFlightRequests = new Map<string, Promise<any>>();

/**
 * Robust fetch wrapper with exponential backoff retries, request deduplication, timeout control, and error logging
 */
export async function fetchWithRetry<T = any>(
  url: string,
  options: ApiClientOptions = {}
): Promise<T> {
  const {
    timeoutMs = 30000,
    retries = 2,
    retryDelayMs = 1000,
    dedupe = false,
    ...fetchOptions
  } = options;

  const method = (fetchOptions.method || "GET").toUpperCase();
  const bodyString = typeof fetchOptions.body === "string" ? fetchOptions.body : "";
  const dedupeKey = `${method}:${url}:${bodyString}`;

  // Check if identical request is already in flight
  if (dedupe && method === "GET" && inFlightRequests.has(dedupeKey)) {
    logger.info("APIClient", `Deduplicating identical in-flight request: ${url}`);
    return inFlightRequests.get(dedupeKey)!;
  }

  const executeRequest = async (): Promise<T> => {
    let lastError: any = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      // Link external signal if provided
      let onExternalAbort: (() => void) | null = null;
      if (fetchOptions.signal) {
        onExternalAbort = () => controller.abort();
        fetchOptions.signal.addEventListener("abort", onExternalAbort);
      }

      const start = Date.now();

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        if (fetchOptions.signal && onExternalAbort) {
          fetchOptions.signal.removeEventListener("abort", onExternalAbort);
        }

        const duration = Date.now() - start;

        if (duration > 1500) {
          logger.perf("APIClient", `Slow API request to ${url} took ${duration}ms`, duration);
        }

        if (response.ok) {
          const contentType = response.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            return await response.json();
          }
          return (await response.text()) as unknown as T;
        }

        // Handle error statuses
        const status = response.status;
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: await response.text().catch(() => `HTTP ${status}`) };
        }

        const errorMessage = errorData.error || errorData.message || `HTTP ${status} Error`;

        // Check if retryable (5xx, 429 rate limit, network timeout)
        const isRetryable = status === 429 || status >= 500;
        if (!isRetryable || attempt === retries) {
          throw new Error(errorMessage);
        }

        lastError = new Error(errorMessage);
        const backoffDelay = status === 429 ? retryDelayMs * 3 * (attempt + 1) : retryDelayMs * (attempt + 1);
        logger.warn("APIClient", `Retrying failed request (${attempt + 1}/${retries}) to ${url} in ${backoffDelay}ms. Reason: ${errorMessage}`);
        await new Promise((res) => setTimeout(res, backoffDelay));

      } catch (err: any) {
        clearTimeout(timeoutId);
        if (fetchOptions.signal && onExternalAbort) {
          fetchOptions.signal.removeEventListener("abort", onExternalAbort);
        }

        if (err.name === "AbortError") {
          throw new Error("Request timed out or was cancelled.");
        }

        lastError = err;
        if (attempt === retries) {
          logger.error("APIClient", `Failed all ${retries + 1} attempts for ${url}`, err);
          throw new Error(getFriendlyErrorMessage(err));
        }

        const backoffDelay = retryDelayMs * (attempt + 1);
        logger.warn("APIClient", `Retrying request after network exception (${attempt + 1}/${retries}) to ${url} in ${backoffDelay}ms`);
        await new Promise((res) => setTimeout(res, backoffDelay));
      }
    }

    throw new Error(getFriendlyErrorMessage(lastError));
  };

  const requestPromise = executeRequest().finally(() => {
    inFlightRequests.delete(dedupeKey);
  });

  if (dedupe && method === "GET") {
    inFlightRequests.set(dedupeKey, requestPromise);
  }

  return requestPromise;
}
