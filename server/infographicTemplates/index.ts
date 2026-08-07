import { InfographicTemplate } from "./types";
import { brainTemplate } from "./brain";

export * from "./types";
export { brainTemplate };

export const infographicTemplates: InfographicTemplate[] = [
  brainTemplate
];

/**
 * Fuzzy matches a user prompt or topic against registered template topicKeys.
 * Case-insensitive substring matching in both directions.
 */
export function findMatchingTemplate(topic: string): InfographicTemplate | null {
  if (!topic || typeof topic !== "string") return null;
  const cleanTopic = topic.trim().toLowerCase();
  if (!cleanTopic) return null;

  for (const tmpl of infographicTemplates) {
    for (const key of tmpl.topicKeys) {
      const cleanKey = key.trim().toLowerCase();
      if (cleanTopic.includes(cleanKey) || cleanKey.includes(cleanTopic)) {
        return tmpl;
      }
    }
  }
  return null;
}
