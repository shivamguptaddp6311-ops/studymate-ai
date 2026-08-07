import { VisualProvider, VisualIntent, VisualResult } from "../../types/visual";
import { QuotaManager } from "./QuotaManager";
import { SafetyFilter } from "./SafetyFilter";
import { AnalyticsBridge } from "./AnalyticsBridge";

export type ErrorType = "transient" | "quota" | "content_safety" | "unknown";

function classifyError(err: any): ErrorType {
  if (!err) return "unknown";
  const msg = (typeof err === "string" ? err : err.message || String(err)).toLowerCase();
  const status = err.status || err.statusCode || err.response?.status;

  if (
    status === 429 ||
    status === 403 ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("exceeded") ||
    msg.includes("429") ||
    msg.includes("403")
  ) {
    return "quota";
  }

  if (
    msg.includes("safety") ||
    msg.includes("blocked") ||
    msg.includes("inappropriate") ||
    msg.includes("unsafe") ||
    msg.includes("content_safety")
  ) {
    return "content_safety";
  }

  if (
    (status && status >= 500) ||
    msg.includes("network") ||
    msg.includes("fetch") ||
    msg.includes("timeout") ||
    msg.includes("econnreset") ||
    msg.includes("failed to fetch") ||
    msg.includes("500") ||
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("504")
  ) {
    return "transient";
  }

  return "transient"; // Default fallback execution error treated as transient network
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class FallbackManager {
  static async executeWithFallback(
    providers: VisualProvider[],
    query: string,
    intent: VisualIntent,
    options?: Record<string, any>
  ): Promise<VisualResult | null> {
    // Stage 1: Pre-query safety check
    if (!SafetyFilter.isQuerySafe(query)) {
      console.warn(`[FallbackManager] Query blocked by pre-query safety filter: "${query}"`);
      AnalyticsBridge.logProviderFailure("unknown", "content_safety", "Pre-query safety filter rejection");
      return null;
    }

    const backoffDelays = [500, 1000, 2000]; // 3 retry attempts with exponential backoff for transient errors

    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      const nextProvider = providers[i + 1];

      // Check Quota state before calling
      const quota = await QuotaManager.checkQuota(provider.id);
      if (!quota.available) {
        console.info(`[FallbackManager] Skipping ${provider.name} due to active quota lock (${quota.reason}).`);
        AnalyticsBridge.logProviderFailure(provider.id, "quota", quota.reason || "Quota lock active");
        if (nextProvider) {
          AnalyticsBridge.logFallbackTriggered(provider.id, nextProvider.id);
        }
        continue;
      }

      console.info(`[FallbackManager] Executing provider '${provider.name}' for intent '${intent}'...`);
      const startTime = Date.now();

      let result: VisualResult | null = null;
      let lastError: any = null;
      let errorType: ErrorType = "unknown";

      // Attempt loop with exponential backoff for transient errors
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          const delay = backoffDelays[attempt - 1] || 1000;
          console.info(`[FallbackManager] Retrying provider ${provider.name} (Attempt ${attempt + 1}/3) after ${delay}ms...`);
          await sleep(delay);
        }

        try {
          result = await provider.search(query, intent, options);
          if (result) {
            break; // Success!
          } else {
            lastError = new Error("Provider returned empty result");
            errorType = "transient";
          }
        } catch (err: any) {
          lastError = err;
          errorType = classifyError(err);

          // If quota error or content safety error: DO NOT retry this provider
          if (errorType === "quota" || errorType === "content_safety") {
            console.warn(`[FallbackManager] Immediate break for ${provider.name} due to ${errorType} error:`, err?.message || err);
            break;
          }
        }
      }

      // Handle Quota Error
      if (errorType === "quota") {
        await QuotaManager.markQuotaExceeded(provider.id, 86400000, lastError?.message || "Quota 403/429 limit reached");
        AnalyticsBridge.logProviderFailure(provider.id, "quota", lastError?.message);
        if (nextProvider) {
          AnalyticsBridge.logFallbackTriggered(provider.id, nextProvider.id);
        }
        continue;
      }

      // Handle Content Safety Error or Empty Result
      if (result) {
        // Stage 2: Post-result safety filter check
        if (SafetyFilter.isResultSafe(provider.id, result.title, result.description, result.metadata?.tags)) {
          const latencyMs = Date.now() - startTime;
          console.info(`[FallbackManager] Provider '${provider.name}' succeeded in ${latencyMs}ms.`);
          AnalyticsBridge.logProviderSuccess(provider.id, latencyMs, false);
          return result;
        } else {
          console.warn(`[FallbackManager] Result from provider '${provider.name}' failed post-result safety filter.`);
          AnalyticsBridge.logProviderFailure(provider.id, "content_safety", "Post-result content safety filter rejection");
          if (nextProvider) {
            AnalyticsBridge.logFallbackTriggered(provider.id, nextProvider.id);
          }
          continue;
        }
      }

      // Handling Transient / Failure case
      console.warn(`[FallbackManager] Provider '${provider.name}' failed after attempts with errorType '${errorType}'.`);
      AnalyticsBridge.logProviderFailure(provider.id, errorType, lastError?.message);
      if (nextProvider) {
        AnalyticsBridge.logFallbackTriggered(provider.id, nextProvider.id);
      }
    }

    console.warn(`[FallbackManager] All visual providers exhausted in fallback chain for query "${query}".`);
    return null;
  }
}

