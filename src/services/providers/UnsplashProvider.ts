import { BaseProvider } from "./BaseProvider";
import { ProviderId, VisualIntent, VisualResult } from "../../types/visual";
import { EnvGuard } from "../../utils/envGuard";
import { QuotaManager } from "../visual/QuotaManager";
import { SafetyFilter } from "../visual/SafetyFilter";
import { safeFetch } from "../../utils/visualHelpers";

export class UnsplashProvider extends BaseProvider {
  id: ProviderId = "unsplash";
  name = "Unsplash High-Res Photos";

  supports(intent: VisualIntent): boolean {
    return intent === "photo";
  }

  async search(query: string, intent: VisualIntent): Promise<VisualResult | null> {
    if (!EnvGuard.hasKey("VITE_UNSPLASH_ACCESS_KEY", this.name)) {
      return null;
    }

    const quota = await this.checkQuota();
    if (!quota.available) {
      console.warn("[UnsplashProvider] Skipping search due to quota state:", quota.reason);
      return null;
    }

    const apiKey = EnvGuard.getKey("VITE_UNSPLASH_ACCESS_KEY");
    if (!apiKey) return null;

    const topic = query.trim();
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(topic)}&per_page=5&content_filter=high`;

    try {
      const resp = await safeFetch(url, {
        headers: {
          Authorization: `Client-ID ${apiKey}`,
          "Accept-Version": "v1"
        }
      });

      if (!resp.ok) {
        if (QuotaManager.isQuotaError(resp.status)) {
          await QuotaManager.markQuotaExceeded("unsplash", 3600000, "Unsplash hourly rate limit reached");
          return null;
        }
        throw new Error(`Unsplash API error status ${resp.status}`);
      }

      const data = await resp.json();
      const results = data.results || [];

      if (results.length === 0) return null;

      // Safety filter
      const safeResults = results.filter((item: any) =>
        SafetyFilter.isResultSafe("unsplash", item.alt_description || item.description || topic, item.description)
      );

      const best = safeResults[0] || results[0];
      const user = best.user || {};
      const utm = "?utm_source=StudyMate&utm_medium=referral";

      return {
        id: `unsplash_${best.id}`,
        provider: "unsplash",
        intent: "photo",
        type: "image",
        title: best.description || best.alt_description || `${topic} Photograph`,
        description: best.alt_description || `High resolution photo of ${topic}`,
        url: best.urls?.regular || best.urls?.full,
        thumbnailUrl: best.urls?.thumb || best.urls?.small,
        source: "Unsplash",
        sourceUrl: `${best.links?.html || "https://unsplash.com"}${utm}`,
        license: "Unsplash License (Free Commercial & Personal Use)",
        author: user.name || user.username || "Unsplash Photographer",
        attributionLink: `${user.links?.html || "https://unsplash.com"}${utm}`,
        downloadLocation: best.links?.download_location
      };
    } catch (err: any) {
      console.warn("[UnsplashProvider] Search error:", err?.message || err);
      return null;
    }
  }

  /**
   * Fires download tracking ping required by Unsplash API terms
   */
  static async triggerDownloadPing(downloadLocationUrl?: string): Promise<void> {
    if (!downloadLocationUrl) return;
    const apiKey = EnvGuard.getKey("VITE_UNSPLASH_ACCESS_KEY");
    if (!apiKey) return;

    try {
      await safeFetch(downloadLocationUrl, {
        headers: {
          Authorization: `Client-ID ${apiKey}`
        }
      });
      console.log("[UnsplashProvider] Download ping sent successfully.");
    } catch (err) {
      console.warn("[UnsplashProvider] Download ping failed:", err);
    }
  }
}
