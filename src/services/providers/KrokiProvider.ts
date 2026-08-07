import { BaseProvider } from "./BaseProvider";
import { ProviderId, VisualIntent, VisualResult } from "../../types/visual";
import { safeFetch } from "../../utils/visualHelpers";

export class KrokiProvider extends BaseProvider {
  id: ProviderId = "kroki";
  name = "Kroki Diagram Gateway";

  supports(intent: VisualIntent): boolean {
    return ["flowchart", "process", "algorithm", "diagram"].includes(intent);
  }

  async search(query: string, intent: VisualIntent): Promise<VisualResult | null> {
    const topic = query.trim();
    const diagramText = `digraph G {
      rankdir=LR;
      node [shape=box, style=filled, fillcolor="#1e293b", fontcolor="#ffffff", fontname="sans-serif"];
      edge [color="#3b82f6", fontname="sans-serif"];
      
      Start [label="Start: ${topic}", fillcolor="#1d4ed8"];
      Step1 [label="Primary Component"];
      Step2 [label="Secondary Mechanism"];
      Result [label="Target Outcome", fillcolor="#059669"];
      
      Start -> Step1;
      Step1 -> Step2;
      Step2 -> Result;
    }`;

    try {
      const resp = await safeFetch("https://kroki.io/graphviz/svg", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: diagramText
      });

      if (!resp.ok) {
        throw new Error(`Kroki request failed with status ${resp.status}`);
      }

      const svgData = await resp.text();

      return {
        id: `kroki_${Date.now()}`,
        provider: "kroki",
        intent,
        type: "diagram_svg",
        title: `${topic} Architectural Diagram`,
        description: `Vector Graphviz SVG rendered via Kroki.io for ${topic}`,
        mediaData: svgData,
        source: "Kroki.io Open Diagram Service",
        sourceUrl: "https://kroki.io",
        license: "Free Open Service"
      };
    } catch (err: any) {
      console.warn("[KrokiProvider] Render failed:", err?.message || err);
      return null;
    }
  }
}
