import { VisualIntent } from "../../types/visual";
import { normalizeQuery, extractCoreTopic } from "../../utils/queryNormalizer";

export interface IntentClassificationResult {
  intent: VisualIntent;
  cleanTopic: string;
  confidence: number;
  originalQuery: string;
}

export class IntentClassifier {
  /**
   * Synchronous keyword-dictionary based intent classifier with weighted confidence and Hinglish variants.
   */
  static classifyKeyword(query: string): IntentClassificationResult {
    if (!query || typeof query !== "string") {
      return { intent: "summary", cleanTopic: "", confidence: 0, originalQuery: "" };
    }

    const lower = query.toLowerCase().trim();
    const cleanTopic = extractCoreTopic(query);

    // 1. Flowchart / Mindmap / Process / Algorithm / Timeline
    if (
      /\b(flowchart|flow chart|process flow|mindmap|mind map|algorithm|decision tree|workflow|sequence diagram|state diagram|timeline)\b/i.test(lower) ||
      /\b(flowchart banao|mindmap banao|steps in|how it works|water cycle|carbon cycle)\b/i.test(lower)
    ) {
      let intent: VisualIntent = "flowchart";
      if (lower.includes("mindmap") || lower.includes("mind map")) intent = "mindmap";
      if (lower.includes("timeline")) intent = "timeline";
      if (lower.includes("algorithm")) intent = "algorithm";
      if (lower.includes("process")) intent = "process";

      return {
        intent,
        cleanTopic,
        confidence: 0.95,
        originalQuery: query
      };
    }

    // 2. Chemistry / Molecule / Formula / Compound
    if (
      /\b(molecule|molecular|compound|chemical structure|formula of|pubchem|benzene|caffeine|aspirin|glucose|h2o|dna structure|rasayan)\b/i.test(lower) ||
      /\b(chemical structure of|formula|molecular weight)\b/i.test(lower)
    ) {
      return {
        intent: "chemistry",
        cleanTopic,
        confidence: 0.95,
        originalQuery: query
      };
    }

    // 3. Space / Astronomy / Planet / NASA
    if (
      /\b(planet|galaxy|astronomy|nasa|apod|mars rover|space|nebula|black hole|solar system|saturn rings|hubble|james webb|antariksh)\b/i.test(lower)
    ) {
      return {
        intent: "space",
        cleanTopic,
        confidence: 0.9,
        originalQuery: query
      };
    }

    // 4. Labelled Diagram / Anatomy / Plant
    if (
      /\b(labelled diagram|labeled diagram|diagram with labels|anatomy|anatomical|structure of|parts of|diagram of|human brain|human heart|cell structure|leaf cross section|chitra|diagram banao|chitra banao|shareer|koshika|paudha)\b/i.test(lower) ||
      (lower.includes("diagram") && (lower.includes("label") || lower.includes("parts") || lower.includes("body") || lower.includes("brain") || lower.includes("heart") || lower.includes("eye") || lower.includes("ear") || lower.includes("banao")))
    ) {
      let intent: VisualIntent = "labelled_diagram";
      if (/\b(anatomy|anatomical|human body|brain|heart|eye|ear|organ|shareer)\b/i.test(lower)) {
        intent = "anatomy";
      } else if (/\b(plant|leaf|stem|root|flower|chloroplast|stomata|xylem|phloem|paudha)\b/i.test(lower)) {
        intent = "plant";
      }

      return {
        intent,
        cleanTopic,
        confidence: 0.9,
        originalQuery: query
      };
    }

    // 5. Video / Animation / Lecture
    if (
      /\b(video|tutorial|animation|watch|explain visually|video lecture|youtube|kaise hota hai video|dikhao video|video chalao)\b/i.test(lower)
    ) {
      return {
        intent: "video",
        cleanTopic,
        confidence: 0.9,
        originalQuery: query
      };
    }

    // 6. Photo / Real Picture / Unsplash
    if (
      /\b(real photo|real picture|actual photo|photograph|hd photo|unsplash|picture of|photo of|photo dikhao)\b/i.test(lower)
    ) {
      return {
        intent: "photo",
        cleanTopic,
        confidence: 0.85,
        originalQuery: query
      };
    }

    // 7. Creative Art / Drawing
    if (
      /\b(art|artistic|creative drawing|sketch|painting|illustration)\b/i.test(lower)
    ) {
      return {
        intent: "creative_art",
        cleanTopic,
        confidence: 0.85,
        originalQuery: query
      };
    }

    // 8. Wikipedia Summary / Explanation
    if (
      /\b(summary|wikipedia|what is|explain|who is|overview of|definition of|samajhao|batao)\b/i.test(lower)
    ) {
      return {
        intent: "summary",
        cleanTopic,
        confidence: 0.8,
        originalQuery: query
      };
    }

    // Lower confidence fallback guess based on keywords
    if (/\b(brain|heart|cell|eye|ear|kidney|liver|stomach|lungs)\b/i.test(lower)) {
      return { intent: "anatomy", cleanTopic, confidence: 0.65, originalQuery: query };
    }
    if (/\b(reaction|atom|bond|acid|base)\b/i.test(lower)) {
      return { intent: "chemistry", cleanTopic, confidence: 0.65, originalQuery: query };
    }
    if (/\b(sun|moon|star|orbit|comet)\b/i.test(lower)) {
      return { intent: "space", cleanTopic, confidence: 0.65, originalQuery: query };
    }

    return {
      intent: "summary",
      cleanTopic: cleanTopic || query,
      confidence: 0.3,
      originalQuery: query
    };
  }

  /**
   * Main classifier entry point.
   * If keyword confidence >= 80%: Returns keyword classification immediately.
   * If keyword confidence < 80%: Asks Gemini (with 3s timeout).
   * Fallback on Gemini error or timeout: best keyword-match guess, or "summary" (Wikipedia).
   */
  static async classify(query: string): Promise<IntentClassificationResult> {
    const keywordResult = this.classifyKeyword(query);

    // If confidence >= 80%, return immediately
    if (keywordResult.confidence >= 0.80) {
      return keywordResult;
    }

    // If confidence < 80%, query Gemini with a strict 3-second timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch("/api/ai/classify-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const geminiIntentRaw = (data.intent || "").toLowerCase();
        const normQuery = data.normalizedQuery || keywordResult.cleanTopic || query;

        let mappedIntent: VisualIntent = "summary";
        if (geminiIntentRaw.includes("diagram")) mappedIntent = "labelled_diagram";
        else if (geminiIntentRaw.includes("photo")) mappedIntent = "photo";
        else if (geminiIntentRaw.includes("video")) mappedIntent = "video";
        else if (geminiIntentRaw.includes("flowchart")) mappedIntent = "flowchart";
        else if (geminiIntentRaw.includes("chemistry")) mappedIntent = "chemistry";
        else if (geminiIntentRaw.includes("space")) mappedIntent = "space";
        else if (geminiIntentRaw.includes("creative")) mappedIntent = "creative_art";
        else if (geminiIntentRaw.includes("summary")) mappedIntent = "summary";

        return {
          intent: mappedIntent,
          cleanTopic: normQuery,
          confidence: 0.90,
          originalQuery: query
        };
      }
    } catch (err) {
      console.warn("[IntentClassifier] Gemini intent classification timed out or failed, falling back:", err);
    }

    // Gemini classification failure/timeout fallback:
    // If keywordResult had any match guess (> 0.3), return best guess.
    // Otherwise default to "summary" (Wikipedia) as safest generic fallback.
    if (keywordResult.confidence > 0.3) {
      return keywordResult;
    }

    return {
      intent: "summary",
      cleanTopic: extractCoreTopic(query) || query,
      confidence: 0.50,
      originalQuery: query
    };
  }
}
