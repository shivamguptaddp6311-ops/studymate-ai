import { VisualResult, RouteOptions } from "../../types/visual";
import { IntentClassifier } from "./IntentClassifier";
import { ProviderRegistry } from "./ProviderRegistry";
import { CacheManager } from "./CacheManager";
import { FallbackManager } from "./FallbackManager";
import { AnalyticsBridge } from "./AnalyticsBridge";
import { SafetyFilter } from "./SafetyFilter";
import { normalizeQuery } from "../../utils/queryNormalizer";

export class VisualContentRouter {
  static async route(query: string, options: RouteOptions = {}): Promise<VisualResult | null> {
    if (!query || typeof query !== "string" || !query.trim()) {
      return null;
    }

    const { normalizedQuery } = normalizeQuery(query);

    // Stage 1: Pre-query safety check
    if (!SafetyFilter.isQuerySafe(query)) {
      console.warn(`[VisualContentRouter] Query blocked pre-execution by SafetyFilter: "${query}"`);
      AnalyticsBridge.logProviderFailure("unknown", "content_safety", "Pre-query safety filter rejection");
      return null;
    }

    // 1. Classify intent asynchronously
    const classification = await IntentClassifier.classify(query);
    const { intent, cleanTopic } = classification;
    const searchTopic = cleanTopic || query.trim();

    // Emit analytics event for submitted query
    AnalyticsBridge.logQuerySubmitted(intent, normalizedQuery);

    // 2. Cache First: Check cache (with normalized query)
    if (!options.skipCache) {
      const cached = await CacheManager.get(query);
      if (cached) {
        AnalyticsBridge.logProviderSuccess(cached.provider, 0, true);
        return cached;
      }
    }

    // 3. Provider selection for intent based on priority chains
    ProviderRegistry.initialize();
    let providers = ProviderRegistry.getProvidersForIntent(intent);

    if (options.forceProvider) {
      const forced = ProviderRegistry.getProvider(options.forceProvider);
      if (forced) {
        providers = [forced, ...providers.filter(p => p.id !== options.forceProvider)];
      }
    }

    if (providers.length === 0) {
      return null;
    }

    // 4. Execute network search with fallback chain
    const result = await FallbackManager.executeWithFallback(providers, searchTopic, intent);

    if (result) {
      // 5. Save to cache
      await CacheManager.set(query, result.provider, intent, result);
      return result;
    }

    return null;
  }
}

