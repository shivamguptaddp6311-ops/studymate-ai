import { BaseProvider } from "./BaseProvider";
import { ProviderId, VisualIntent, VisualResult } from "../../types/visual";

export class MermaidProvider extends BaseProvider {
  id: ProviderId = "mermaid";
  name = "Mermaid.js Diagram Engine";

  supports(intent: VisualIntent): boolean {
    return ["flowchart", "mindmap", "process", "algorithm"].includes(intent);
  }

  async search(query: string, intent: VisualIntent): Promise<VisualResult | null> {
    return this.generateDiagram(query, intent);
  }

  private generateDiagram(query: string, intent: VisualIntent): VisualResult {
    const topic = query.trim();
    let markup = "";

    if (intent === "mindmap") {
      markup = `mindmap
  root(( ${topic.toUpperCase()} ))
    Core Concept
      Sub-topic 1
      Sub-topic 2
    Key Functions
      Primary Mechanism
      Secondary Effect
    Applications
      Practical Use 1
      Practical Use 2`;
    } else if (intent === "process" || intent === "algorithm" || intent === "flowchart") {
      markup = `graph TD
  A[Start: ${topic}] --> B[Input Data / Initial State]
  B --> C{Validation Check}
  C -- Valid --> D[Process Step 1: Execution]
  C -- Invalid --> E[Error Handling / Retry]
  E --> B
  D --> F[Process Step 2: Transformation]
  F --> G[Output / Final Result]
  G --> H[End]`;
    } else {
      markup = `graph LR
  A[${topic}] --> B[Component 1]
  A --> C[Component 2]
  B --> D[Output A]
  C --> E[Output B]`;
    }

    return {
      id: `mermaid_${Date.now()}`,
      provider: "mermaid",
      intent,
      type: "mermaid_code",
      title: `${topic} (${intent.toUpperCase()})`,
      description: `Interactive client-rendered Mermaid diagram for ${topic}`,
      mediaData: markup,
      source: "Mermaid.js Open-Source Renderer",
      license: "MIT License"
    };
  }
}
