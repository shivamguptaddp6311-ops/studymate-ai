import { VisualIntent, ProviderId } from "../../types/visual";

export class AnalyticsBridge {
  private static emitEvent(eventName: string, payload: Record<string, any>): void {
    // Sanitize payload to ensure no PII or raw API keys are logged
    const sanitized: Record<string, any> = {};
    for (const [key, val] of Object.entries(payload)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes("key") ||
        lowerKey.includes("secret") ||
        lowerKey.includes("auth") ||
        lowerKey.includes("password") ||
        lowerKey.includes("token") ||
        lowerKey.includes("email")
      ) {
        continue;
      }
      sanitized[key] = val;
    }

    const eventDetail = {
      event: eventName,
      timestamp: new Date().toISOString(),
      ...sanitized
    };

    // Dispatch DOM CustomEvent for active listeners/analytics features
    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(new CustomEvent("studymate_analytics_event", { detail: eventDetail }));
      } catch (e) {
        // Ignore dispatch errors
      }

      // Store in local visual analytics history (max 100 entries)
      try {
        const historyRaw = localStorage.getItem("studymate_visual_analytics_log");
        const history = historyRaw ? JSON.parse(historyRaw) : [];
        history.unshift(eventDetail);
        if (history.length > 100) history.length = 100;
        localStorage.setItem("studymate_visual_analytics_log", JSON.stringify(history));
      } catch (e) {
        // Ignore storage error
      }
    }

    console.info(`[AnalyticsBridge] ${eventName}:`, sanitized);
  }

  static logQuerySubmitted(intent: VisualIntent, normalizedQuery: string): void {
    this.emitEvent("visual_query_submitted", { intent, normalizedQuery });
  }

  static logProviderSuccess(provider: ProviderId | string, latencyMs: number, cacheHit: boolean): void {
    this.emitEvent("visual_provider_success", { provider, latencyMs, cacheHit });
  }

  static logProviderFailure(provider: ProviderId | string, errorType: "transient" | "quota" | "content_safety" | "unknown", message?: string): void {
    this.emitEvent("visual_provider_failure", { provider, errorType, detail: message ? message.substring(0, 100) : undefined });
  }

  static logFallbackTriggered(fromProvider: ProviderId | string, toProvider: ProviderId | string): void {
    this.emitEvent("visual_fallback_triggered", { fromProvider, toProvider });
  }

  // Deprecated legacy aliases maintained for backward compatibility
  static logVisualSearch(intent: VisualIntent, provider: ProviderId, query: string, cacheHit: boolean): void {
    this.logQuerySubmitted(intent, query);
    this.logProviderSuccess(provider, 0, cacheHit);
  }

  static logProviderError(provider: ProviderId, error: string): void {
    this.logProviderFailure(provider, "unknown", error);
  }

  static logQuotaExceeded(provider: ProviderId): void {
    this.logProviderFailure(provider, "quota", "Quota exceeded");
  }
}

