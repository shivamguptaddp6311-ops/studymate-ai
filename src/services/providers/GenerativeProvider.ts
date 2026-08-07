import { BaseProvider } from "./BaseProvider";
import { ProviderId, VisualIntent, VisualResult } from "../../types/visual";

export class GenerativeProvider extends BaseProvider {
  id: ProviderId = "generative";
  name = "AI Generative Fallback";

  supports(intent: VisualIntent, _topic: string): boolean {
    return intent !== "video";
  }

  async search(query: string, intent: VisualIntent): Promise<VisualResult | null> {
    try {
      // Generate a high quality fallback visual representation using AI Image API
      const res = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: `Educational visual representation of ${query}, high resolution diagram illustration` })
      });

      if (!res.ok) return null;

      const data = await res.json();
      if (!data.imageUrl) return null;

      return {
        id: `gen-${Date.now()}`,
        provider: "generative",
        intent,
        type: "image",
        title: `AI Generated Diagram for ${query}`,
        description: `Educational visual generated for ${query}`,
        url: data.imageUrl,
        source: "AI Visual Generator",
        license: "AI Generated (StudyMate)",
        author: "StudyMate AI Engine"
      };
    } catch (err) {
      console.warn("[GenerativeProvider] Failed to generate AI visual fallback:", err);
      return null;
    }
  }
}
