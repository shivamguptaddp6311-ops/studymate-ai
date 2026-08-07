import { BaseProvider } from "./BaseProvider";
import { ProviderId, VisualIntent, VisualResult } from "../../types/visual";
import { EnvGuard } from "../../utils/envGuard";
import { QuotaManager } from "../visual/QuotaManager";
import { SafetyFilter } from "../visual/SafetyFilter";
import { safeFetch } from "../../utils/visualHelpers";

export class YoutubeProvider extends BaseProvider {
  id: ProviderId = "youtube";
  name = "YouTube Educational Video Engine";

  supports(intent: VisualIntent): boolean {
    return intent === "video";
  }

  async search(query: string, intent: VisualIntent): Promise<VisualResult | null> {
    if (!EnvGuard.hasKey("VITE_YOUTUBE_KEY", this.name)) {
      return null;
    }

    const quota = await this.checkQuota();
    if (!quota.available) {
      console.warn("[YoutubeProvider] Skipping search due to quota state:", quota.reason);
      return null;
    }

    const apiKey = EnvGuard.getKey("VITE_YOUTUBE_KEY");
    if (!apiKey) return null;

    const topic = query.trim();
    const searchQuery = `${topic} educational explanation tutorial`;

    const params = new URLSearchParams({
      key: apiKey,
      part: "snippet",
      type: "video",
      q: searchQuery,
      safeSearch: "strict",
      videoEmbeddable: "true",
      relevanceLanguage: "en",
      maxResults: "5"
    });

    try {
      const resp = await safeFetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);

      if (!resp.ok) {
        if (QuotaManager.isQuotaError(resp.status)) {
          await QuotaManager.markQuotaExceeded("youtube", 86400000, "YouTube API daily quota limit exceeded");
          return null;
        }
        throw new Error(`YouTube API returned status ${resp.status}`);
      }

      const data = await resp.json();
      const items = data.items || [];

      if (items.length === 0) return null;

      // Filter results with SafetyFilter
      const safeItems = items.filter((item: any) =>
        SafetyFilter.isResultSafe(item.snippet?.title || "", item.snippet?.description || "")
      );

      const bestItem = safeItems[0] || items[0];
      const videoId = bestItem.id?.videoId;

      if (!videoId) return null;

      const snippet = bestItem.snippet || {};

      return {
        id: `yt_${videoId}`,
        provider: "youtube",
        intent: "video",
        type: "video",
        title: snippet.title || `${topic} Video`,
        description: snippet.description || "Educational explanation video.",
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url,
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&rel=0`,
        source: "YouTube Educational",
        sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
        author: snippet.channelTitle || "Educational Channel",
        license: "Standard YouTube License"
      };
    } catch (err: any) {
      console.warn("[YoutubeProvider] Request failed:", err?.message || err);
      return null;
    }
  }
}
