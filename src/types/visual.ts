export type VisualIntent =
  | "diagram"
  | "labelled_diagram"
  | "anatomy"
  | "plant"
  | "flowchart"
  | "process"
  | "algorithm"
  | "mindmap"
  | "timeline"
  | "summary"
  | "topic_explanation"
  | "video"
  | "photo"
  | "space"
  | "chemistry"
  | "creative_art";

export type ProviderId =
  | "wikimedia"
  | "wikipedia"
  | "unsplash"
  | "youtube"
  | "nasa"
  | "pubchem"
  | "mermaid"
  | "kroki"
  | "generative";

export interface QuotaState {
  available: boolean;
  remaining?: number;
  resetTime?: number; // Timestamp in ms
  reason?: string;
}

export interface VisualResult {
  id: string;
  provider: ProviderId;
  intent: VisualIntent;
  type: "image" | "video" | "diagram_svg" | "mermaid_code" | "wikipedia_summary";
  title: string;
  description?: string;
  url?: string;
  thumbnailUrl?: string;
  embedUrl?: string;
  mediaData?: string; // Mermaid markup, SVG string, or HTML snippet
  source: string;
  sourceUrl?: string;
  license?: string;
  author?: string;
  attributionLink?: string;
  downloadLocation?: string; // Unsplash download location ping
  metadata?: Record<string, any>;
  cachedAt?: number;
}

export interface VisualProvider {
  id: ProviderId;
  name: string;
  supports(intent: VisualIntent, topic: string): boolean;
  search(query: string, intent: VisualIntent, options?: Record<string, any>): Promise<VisualResult | null>;
  generate?(query: string, intent: VisualIntent): Promise<VisualResult | null>;
  checkQuota(): Promise<QuotaState>;
}

export interface RouteOptions {
  forceProvider?: ProviderId;
  skipCache?: boolean;
  safeMode?: boolean;
}
