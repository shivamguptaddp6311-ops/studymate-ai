import { BaseProvider } from "./BaseProvider";
import { ProviderId, VisualIntent, VisualResult } from "../../types/visual";
import { safeFetch, formatLicenseName } from "../../utils/visualHelpers";

export class WikimediaProvider extends BaseProvider {
  id: ProviderId = "wikimedia";
  name = "Wikimedia Commons Diagrams";

  supports(intent: VisualIntent): boolean {
    return ["diagram", "labelled_diagram", "summary", "topic_explanation"].includes(intent);
  }

  async search(query: string, intent: VisualIntent): Promise<VisualResult | null> {
    const cleanTopic = query.trim();
    const searchQuery = `${cleanTopic} diagram diagram labeled anatomy`;
    
    const params = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: searchQuery,
      gsrnamespace: "6", // File namespace
      gsrlimit: "5",
      prop: "imageinfo",
      iiprop: "url|mime|extmetadata|user",
      format: "json",
      origin: "*"
    });

    try {
      const resp = await safeFetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`, {
        headers: {
          "Api-User-Agent": "StudyMate/1.0 (Educational App; student-support@studymate.ai)"
        }
      });

      if (!resp.ok) {
        throw new Error(`Wikimedia API returned ${resp.status}`);
      }

      const json = await resp.json();
      const pages = json?.query?.pages;

      if (!pages) {
        return null;
      }

      // Find first valid image page with imageinfo
      const pageList = Object.values(pages) as any[];
      const validPage = pageList.find(p => p.imageinfo && p.imageinfo.length > 0 && p.imageinfo[0].url);

      if (!validPage) return null;

      const info = validPage.imageinfo[0];
      const meta = info.extmetadata || {};

      const rawAuthor = meta.Artist?.value || info.user || "Wikimedia Contributor";
      // Strip HTML tags from author string
      const author = rawAuthor.replace(/<[^>]*>/g, "").trim();

      const rawLicense = meta.LicenseShortName?.value || "CC-BY-SA";
      const license = formatLicenseName(rawLicense);

      const titleClean = validPage.title.replace(/^File:/i, "").replace(/\.[^/.]+$/, "").replace(/_/g, " ");

      return {
        id: `wikimedia_${validPage.pageid || Date.now()}`,
        provider: "wikimedia",
        intent: "labelled_diagram",
        type: "image",
        title: titleClean || `${cleanTopic} Diagram`,
        description: meta.ObjectName?.value || meta.ImageDescription?.value?.replace(/<[^>]*>/g, "") || `Educational diagram for ${cleanTopic}`,
        url: info.url,
        thumbnailUrl: info.thumburl || info.url,
        source: "Wikimedia Commons",
        sourceUrl: info.descriptionurl || "https://commons.wikimedia.org",
        license,
        author,
        attributionLink: info.descriptionurl || "https://commons.wikimedia.org"
      };
    } catch (err: any) {
      console.warn("[WikimediaProvider] Search error:", err?.message || err);
      return null;
    }
  }
}
