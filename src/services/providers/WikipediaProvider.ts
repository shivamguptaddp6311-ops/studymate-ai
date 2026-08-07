import { BaseProvider } from "./BaseProvider";
import { ProviderId, VisualIntent, VisualResult } from "../../types/visual";
import { safeFetch } from "../../utils/visualHelpers";

export class WikipediaProvider extends BaseProvider {
  id: ProviderId = "wikipedia";
  name = "Wikipedia Educational Summaries";

  supports(intent: VisualIntent): boolean {
    return ["summary", "topic_explanation", "diagram"].includes(intent);
  }

  async search(query: string, intent: VisualIntent): Promise<VisualResult | null> {
    const topic = query.trim();
    const encodedTopic = encodeURIComponent(topic.replace(/\s+/g, "_"));
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodedTopic}`;

    try {
      const resp = await safeFetch(url);
      if (!resp.ok) {
        if (resp.status === 404) return null;
        throw new Error(`Wikipedia REST API status ${resp.status}`);
      }

      const data = await resp.json();
      if (!data || data.type === "disambiguation") return null;

      const imageUrl = data.originalimage?.source || data.thumbnail?.source;

      return {
        id: `wiki_${data.pageid || Date.now()}`,
        provider: "wikipedia",
        intent: "summary",
        type: "wikipedia_summary",
        title: data.title || topic,
        description: data.extract || "No overview summary available.",
        url: imageUrl,
        thumbnailUrl: data.thumbnail?.source || imageUrl,
        source: "Wikipedia",
        sourceUrl: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodedTopic}`,
        license: "Creative Commons Attribution-ShareAlike",
        author: "Wikipedia Contributors"
      };
    } catch (err: any) {
      console.warn("[WikipediaProvider] Failed to fetch summary:", err?.message || err);
      return null;
    }
  }
}
