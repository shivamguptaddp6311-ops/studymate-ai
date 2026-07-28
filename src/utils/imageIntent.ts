/**
 * Helper utility to detect image generation and drawing intent in text messages.
 */

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
    "picture this concept"
  ];

  if (negativePhrases.some(p => lower.includes(p))) {
    return false;
  }

  // Explicit image intent trigger phrases
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

  if (explicitPhrases.some(phrase => lower.includes(phrase))) {
    return true;
  }

  // Flexible regex patterns matching verbs + image-related nouns
  const intentPatterns = [
    /\b(generate|create|draw|make|design|render|paint|produce)\b.*\b(image|picture|photo|illustration|graphic|logo|wallpaper|poster|diagram|sketch|art|artwork|avatar|banner)\b/i,
    /\b(photo|picture|image|illustration|drawing|sketch|painting|logo|poster|wallpaper|3d render)\b\s+of\b/i
  ];

  return intentPatterns.some(pattern => pattern.test(lower));
}
