export interface RegionCallout {
  name: string;
  color: string;
  bullets: string[];
  calloutPosition: { x: number; y: number }; // Percentage coordinates (0-100) on central illustration
  side?: "left" | "right";
}

export interface FooterCard {
  icon: string;
  title: string;
  description: string;
}

export interface InfographicTemplate {
  id: string;
  topicKeys: string[];
  title: string;
  subtitle?: string;
  baseIllustration: string;
  regions: RegionCallout[];
  footerCards?: FooterCard[];
}
