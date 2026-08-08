/**
 * Helper utility to detect image generation and drawing intent in text messages.
 */

// Refusal signature patterns in assistant text replies
export const REFUSAL_IMAGE_PATTERNS = [
  /can'?t (actually )?generate (any )?images?/i,
  /cannot (actually )?generate (any )?images?/i,
  /as a text-based AI/i,
  /as an AI text model/i,
  /can'?t (display|create|produce|draw|render) visual (content|images?)/i,
  /cannot (display|create|produce|draw|render) visual (content|images?)/i,
  /I('m| am) unable to (create|generate|show|draw|produce) (an? )?image/i,
  /I (don't|do not) have the (ability|capability) to (generate|create|draw|produce) images/i,
  /I (cannot|can't) (create|generate|draw|produce) images/i,
  /I am a language model.*(cannot|can't) (generate|create) images/i,
  /don't have image generation capabilities/i,
  /do not have image generation capabilities/i,
  /unable to render images/i
];

export function isTextRefusalForImage(replyText: string): boolean {
  if (!replyText || typeof replyText !== "string") return false;
  return REFUSAL_IMAGE_PATTERNS.some(pattern => pattern.test(replyText));
}

export function isPlausiblyImageRequest(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const lower = text.toLowerCase().trim();

  // Any non-empty request that isn't purely meta/code questions could be a candidate if AI refused
  const nonImageMeta = ["write code", "how to code", "explain theorem", "solve equation"];
  if (nonImageMeta.some(m => lower.startsWith(m))) return false;

  return isImageGenerationRequest(text) || lower.length > 2;
}

export function isImageGenerationRequest(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const lower = text.toLowerCase().trim();

  // Negative phrase filters for idiomatic non-image phrases
  const negativePhrases = [
    "draw conclusion",
    "draw a conclusion",
    "draw conclusions",
    "draw inference",
    "draw inferences",
    "draw a distinction",
    "draw distinctions",
    "draw a line between",
    "draw the line",
    "draw comparison",
    "draw a comparison",
    "big picture",
    "get the picture",
    "word picture",
    "picture this concept",
    "drawback",
    "drawbacks",
    "withdraw",
    "withdrawal",
    "redraw",
    "give an illustration of"
  ];

  if (negativePhrases.some(p => lower.includes(p))) {
    return false;
  }

  // Non-image instructional queries e.g. "kaise banao" (how to make recipe/resume) or "how to draw"
  if (/\bkaise\s+(banao|banaye|banaya)\b/i.test(lower) && !/\b(image|photo|picture|pic)\b/i.test(lower)) {
    return false;
  }
  if (/\bhow\s+to\s+(make|cook|build|create)\b/i.test(lower) && !/\b(image|photo|picture|pic|drawing|sketch|logo|poster|illustration)\b/i.test(lower)) {
    return false;
  }

  // Explicit image intent trigger phrases matched with word boundaries
  const explicitPhrases = [
    "generate image", "generate an image", "generate images",
    "create image", "create an image", "create images",
    "make an image", "make image", "make a picture", "make pictures",
    "draw", "draw a", "draw an", "draw me", "draw a picture", "draw pictures",
    "photo of", "photograph of", "picture of", "pictures of",
    "illustration of", "illustration", "illustrations",
    "logo", "create logo", "generate logo", "design a logo", "design logo",
    "wallpaper", "create wallpaper", "generate wallpaper", "design wallpaper",
    "poster", "create poster", "generate poster", "design a poster", "design poster",
    "diagram of", "generate diagram", "create diagram",
    "painting of", "sketch of", "artwork of", "art of", "3d render of", "render an image",
    "photorealistic picture", "digital art of", "vector art of"
  ];

  if (explicitPhrases.some(phrase => new RegExp(`\\b${phrase}\\b`, "i").test(lower))) {
    return true;
  }

  // Broadened Hinglish generation verbs
  const hinglishVerbs = /\b(bana\s*do|banade|banao|bnado|bnao|bnaa\s*do|bana\s*sakte|bana\s*sakta|chahiye|chaiye|dikhao|dikhado|dikha\s*do|drawing\s*karo|sketch\s*karo|design\s*karo)\b/i;

  // Hinglish image nouns (explicit visual words)
  const hinglishImageNouns = /\b(image|photo|picture|diagram|poster|wallpaper|logo|sketch|drawing|illustration|chart|banner|avatar|pic|pics|scene|scenery)\b/i;

  if (hinglishImageNouns.test(lower) && hinglishVerbs.test(lower)) {
    return true;
  }

  // Broadened Hinglish: ANY noun phrase + generation verb (e.g., "flying aeroplane banao", "red rose dikha do", "car drawing karo", "lion photo chaiye")
  const anyNounHinglishVerb = /^.+\s+(banao|bana\s*do|bnado|bnao|bnaa\s*do|dikhao|dikhado|dikha\s*do|drawing\s*karo|sketch\s*karo|design\s*karo|chaiye|chahiye)\b/i;
  if (anyNounHinglishVerb.test(lower)) {
    return true;
  }

  // English patterns without "of"
  const englishPatterns = [
    /\b(generate|create|draw|make|design|render|paint|produce)\b.*\b(image|picture|photo|illustration|graphic|logo|wallpaper|poster|diagram|sketch|art|artwork|avatar|banner)\b/i,
    /\b(photo|picture|image|illustration|drawing|sketch|painting|logo|poster|wallpaper|3d render)\b\s+of\b/i,
    /\bshow\s+me\s+(a|an|the)?\s*([a-z0-9\s]+)\b/i,
    /\bwhat\s+does\s+(a|an|the)?\s*([a-z0-9\s]+)\s+look\s+like\b/i
  ];

  return englishPatterns.some(pattern => pattern.test(lower));
}


