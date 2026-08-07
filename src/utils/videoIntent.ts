/**
 * Helper utility to detect video generation and animation intent in text messages.
 */

export function isVideoGenerationRequest(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const lower = text.toLowerCase().trim();

  // Explicit video intent trigger phrases
  const explicitPhrases = [
    "generate video", "generate a video", "generate videos",
    "create video", "create a video", "create videos",
    "make a video", "make video", "make videos",
    "animate", "animate a", "animate this", "animate image",
    "text to video", "text-to-video", "video generation",
    "render video", "render a video", "produce video", "produce a video",
    "video of", "videos of", "clip of", "generate clip", "create clip",
    "generate animation", "create animation", "make an animation"
  ];

  if (explicitPhrases.some(phrase => lower.includes(phrase))) {
    return true;
  }

  // Flexible regex patterns matching verbs + video-related nouns
  // FIX: Hinglish/casual intent detection
  const hinglishVideoNouns = /\b(video|clip|animation|movie|footage)\b/i;
  const hinglishVerbs = /\b(bana\s*do|banade|banao|bnado|bnao|bana\s*sakte|bana\s*sakta|chahiye|dikhao|dikha\s*do)\b/i;

  if (hinglishVideoNouns.test(lower) && hinglishVerbs.test(lower)) {
    return true;
  }

  const intentPatterns = [
    /\b(generate|create|make|render|produce|animate|build)\b.*\b(video|clip|animation|mp4|movie|footage)\b/i,
    /\b(video|clip|animation)\b\s+of\b/i
  ];

  return intentPatterns.some(pattern => pattern.test(lower));
}
