import { VisualProvider, ProviderId, VisualIntent } from "../../types/visual";
import { WikimediaProvider } from "../providers/WikimediaProvider";
import { WikipediaProvider } from "../providers/WikipediaProvider";
import { UnsplashProvider } from "../providers/UnsplashProvider";
import { YoutubeProvider } from "../providers/YoutubeProvider";
import { NASAProvider } from "../providers/NASAProvider";
import { PubChemProvider } from "../providers/PubChemProvider";
import { MermaidProvider } from "../providers/MermaidProvider";
import { KrokiProvider } from "../providers/KrokiProvider";
import { GenerativeProvider } from "../providers/GenerativeProvider";

export class ProviderRegistry {
  private static providers: Map<ProviderId, VisualProvider> = new Map();

  static initialize(): void {
    if (this.providers.size > 0) return;

    const allProviders: VisualProvider[] = [
      new WikimediaProvider(),
      new WikipediaProvider(),
      new UnsplashProvider(),
      new YoutubeProvider(),
      new NASAProvider(),
      new PubChemProvider(),
      new MermaidProvider(),
      new KrokiProvider(),
      new GenerativeProvider()
    ];

    allProviders.forEach(p => {
      this.providers.set(p.id, p);
    });

    console.log(`[ProviderRegistry] Initialized ${this.providers.size} visual content providers.`);
  }

  static getProvider(id: ProviderId): VisualProvider | undefined {
    this.initialize();
    return this.providers.get(id);
  }

  static getProvidersForIntent(intent: VisualIntent): VisualProvider[] {
    this.initialize();
    const list: VisualProvider[] = [];

    // Prioritize providers strictly according to SMART INTENT ROUTER specifications:
    // - Labelled diagram: Wikimedia -> Wikipedia -> AI
    // - Anatomy: Wikimedia -> Wikipedia -> AI
    // - Plant: Wikimedia -> Wikipedia -> AI
    // - Flowchart: Mermaid -> Kroki -> AI
    // - Process: Mermaid -> Kroki -> AI
    // - Algorithm: Mermaid -> Kroki -> AI
    // - Mind map: Mermaid -> AI
    // - Timeline: Mermaid -> AI
    // - Chemistry: PubChem -> Wikipedia -> AI
    // - Astronomy (Space): NASA -> Wikimedia -> AI
    // - Real photo: Unsplash -> Wikipedia -> AI
    // - Video: YouTube -> Wikipedia
    // - Creative art: AI (No routing)

    const priorityMap: Record<VisualIntent, ProviderId[]> = {
      labelled_diagram: ["wikimedia", "wikipedia", "generative"],
      anatomy: ["wikimedia", "wikipedia", "generative"],
      plant: ["wikimedia", "wikipedia", "generative"],
      diagram: ["wikimedia", "wikipedia", "generative"],
      flowchart: ["mermaid", "kroki", "generative"],
      process: ["mermaid", "kroki", "generative"],
      algorithm: ["mermaid", "kroki", "generative"],
      mindmap: ["mermaid", "generative"],
      timeline: ["mermaid", "generative"],
      chemistry: ["pubchem", "wikipedia", "generative"],
      space: ["nasa", "wikimedia", "generative"],
      photo: ["unsplash", "wikipedia", "generative"],
      video: ["youtube", "generative", "wikipedia"],
      creative_art: ["generative"],
      summary: ["wikipedia", "wikimedia"],
      topic_explanation: ["wikipedia", "wikimedia"]
    };

    const preferredIds = priorityMap[intent] || ["wikipedia", "wikimedia"];

    preferredIds.forEach(id => {
      const p = this.providers.get(id);
      if (p) list.push(p);
    });

    return list;
  }
}

