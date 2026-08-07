import { BaseProvider } from "./BaseProvider";
import { ProviderId, VisualIntent, VisualResult } from "../../types/visual";
import { EnvGuard } from "../../utils/envGuard";
import { QuotaManager } from "../visual/QuotaManager";
import { safeFetch } from "../../utils/visualHelpers";

export class NASAProvider extends BaseProvider {
  id: ProviderId = "nasa";
  name = "NASA Imagery & Astronomy API";

  supports(intent: VisualIntent): boolean {
    return intent === "space";
  }

  async search(query: string, intent: VisualIntent): Promise<VisualResult | null> {
    if (!EnvGuard.hasKey("VITE_NASA_KEY", this.name)) {
      return null;
    }

    const quota = await this.checkQuota();
    if (!quota.available) {
      console.warn("[NASAProvider] Skipping search due to quota state:", quota.reason);
      return null;
    }

    const apiKey = EnvGuard.getKey("VITE_NASA_KEY") || "DEMO_KEY";
    const topic = query.trim().toLowerCase();

    // 1. If asking for APOD or Picture of the Day
    if (topic.includes("picture of the day") || topic.includes("apod") || topic === "space") {
      try {
        const resp = await safeFetch(`https://api.nasa.gov/planetary/apod?api_key=${apiKey}`);
        if (resp.ok) {
          const apod = await resp.json();
          if (apod.media_type === "image") {
            return {
              id: `nasa_apod_${apod.date}`,
              provider: "nasa",
              intent: "space",
              type: "image",
              title: apod.title || "NASA Astronomy Picture of the Day",
              description: apod.explanation || `NASA APOD from ${apod.date}`,
              url: apod.hdurl || apod.url,
              thumbnailUrl: apod.url,
              source: "NASA APOD",
              sourceUrl: "https://apod.nasa.gov",
              license: "Public Domain (NASA)",
              author: apod.copyright || "NASA"
            };
          }
        }
      } catch (e) {
        // Fall through to image search
      }
    }

    // 2. NASA Image & Video Library Search
    try {
      const searchUrl = `https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&media_type=image`;
      const resp = await safeFetch(searchUrl);

      if (!resp.ok) {
        if (QuotaManager.isQuotaError(resp.status)) {
          await QuotaManager.markQuotaExceeded("nasa", 3600000, "NASA API rate limit exceeded");
          return null;
        }
        throw new Error(`NASA Image Library error status ${resp.status}`);
      }

      const data = await resp.json();
      const items = data.collection?.items || [];

      if (items.length === 0) return null;

      const bestItem = items[0];
      const itemData = bestItem.data?.[0] || {};
      const links = bestItem.links || [];

      const thumbLink = links.find((l: any) => l.rel === "preview")?.href || links[0]?.href;

      return {
        id: `nasa_${itemData.nasa_id || Date.now()}`,
        provider: "nasa",
        intent: "space",
        type: "image",
        title: itemData.title || `${query} Space Image`,
        description: itemData.description || `NASA space imagery for ${query}`,
        url: thumbLink,
        thumbnailUrl: thumbLink,
        source: "NASA Image & Video Library",
        sourceUrl: "https://images.nasa.gov",
        license: "Public Domain (NASA)",
        author: itemData.center || "NASA"
      };
    } catch (err: any) {
      console.warn("[NASAProvider] Search error:", err?.message || err);
      return null;
    }
  }
}
