/**
 * Centralized Provider Capability Registry
 * Manages capabilities for all AI providers (Gemini, OpenAI, Groq, OpenRouter, Anthropic, Fal, Pollinations).
 * Enforces validation prior to routing and prevents unsupported provider execution.
 */

export type AICapability =
  | "chat"
  | "reasoning"
  | "vision"
  | "ocr"
  | "pdf"
  | "image_generation"
  | "image_editing"
  | "video_generation"
  | "streaming"
  | "web_search";

export type AIProviderName =
  | "gemini"
  | "openai"
  | "groq"
  | "openrouter"
  | "anthropic"
  | "fal"
  | "pollinations";

export interface ProviderCapabilityProfile {
  provider: AIProviderName;
  displayName: string;
  capabilities: Record<AICapability, boolean>;
  description?: string;
}

export const PROVIDER_CAPABILITIES_REGISTRY: Record<AIProviderName, ProviderCapabilityProfile> = {
  gemini: {
    provider: "gemini",
    displayName: "Google Gemini",
    capabilities: {
      chat: true,
      reasoning: true,
      vision: true,
      ocr: true,
      pdf: true,
      image_generation: true,
      image_editing: true,
      video_generation: false,
      streaming: true,
      web_search: true
    },
    description: "Full multimodal AI suite with native PDF, vision, search grounding, and image generation."
  },
  openai: {
    provider: "openai",
    displayName: "OpenAI",
    capabilities: {
      chat: true,
      reasoning: true,
      vision: true,
      ocr: true,
      pdf: true,
      image_generation: true,
      image_editing: true,
      video_generation: false,
      streaming: true,
      web_search: true
    },
    description: "GPT-4o and DALL-E 3 engine supporting text, vision, reasoning, and image synthesis."
  },
  groq: {
    provider: "groq",
    displayName: "Groq",
    capabilities: {
      chat: true,
      reasoning: true,
      vision: true,
      ocr: true,
      pdf: false,
      image_generation: false,
      image_editing: false,
      video_generation: false,
      streaming: true,
      web_search: false
    },
    description: "Ultra-low latency Llama inference for high-speed chat, reasoning, and vision."
  },
  anthropic: {
    provider: "anthropic",
    displayName: "Anthropic Claude",
    capabilities: {
      chat: true,
      reasoning: true,
      vision: true,
      ocr: true,
      pdf: true,
      image_generation: false,
      image_editing: false,
      video_generation: false,
      streaming: true,
      web_search: false
    },
    description: "Claude 3.5 Sonnet featuring deep reasoning, document parsing, and vision."
  },
  openrouter: {
    provider: "openrouter",
    displayName: "OpenRouter",
    capabilities: {
      chat: true,
      reasoning: true,
      vision: true,
      ocr: true,
      pdf: true,
      image_generation: true,
      image_editing: false,
      video_generation: false,
      streaming: true,
      web_search: true
    },
    description: "Multi-model router aggregating top open-weights and commercial AI models."
  },
  fal: {
    provider: "fal",
    displayName: "fal.ai",
    capabilities: {
      chat: false,
      reasoning: false,
      vision: false,
      ocr: false,
      pdf: false,
      image_generation: true,
      image_editing: true,
      video_generation: true,
      streaming: true,
      web_search: false
    },
    description: "Specialized media generation engine for Flux image generation, inpainting, and video."
  },
  pollinations: {
    provider: "pollinations",
    displayName: "Pollinations.ai",
    capabilities: {
      chat: false,
      reasoning: false,
      vision: false,
      ocr: false,
      pdf: false,
      image_generation: true,
      image_editing: false,
      video_generation: false,
      streaming: false,
      web_search: false
    },
    description: "Free fallback image synthesis provider."
  }
};

/**
 * Checks if a specific provider supports a given single capability
 */
export function hasCapability(provider: string, capability: AICapability): boolean {
  const profile = PROVIDER_CAPABILITIES_REGISTRY[provider as AIProviderName];
  if (!profile) return false;
  return !!profile.capabilities[capability];
}

/**
 * Checks if a provider supports ALL required capabilities
 */
export function hasAllCapabilities(provider: string, capabilities: AICapability[]): boolean {
  if (!capabilities || capabilities.length === 0) return true;
  return capabilities.every((cap) => hasCapability(provider, cap));
}

/**
 * Validates a provider against a list of required capabilities.
 * Returns valid status and an array of missing capabilities.
 */
export function validateProviderCapabilities(
  provider: string,
  requiredCapabilities: AICapability[]
): { valid: boolean; missing: AICapability[] } {
  const missing = requiredCapabilities.filter((cap) => !hasCapability(provider, cap));
  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Helper mapping task types or request parameters to required capability lists
 */
export function getRequiredCapabilitiesForTask(
  taskType: string,
  options?: {
    image?: string;
    isPdf?: boolean;
    isVoice?: boolean;
    forceWebSearch?: boolean;
    isStreaming?: boolean;
  }
): AICapability[] {
  const required = new Set<AICapability>();

  switch (taskType) {
    case "image_generation":
      required.add("image_generation");
      break;
    case "image_editing":
      required.add("image_editing");
      break;
    case "video_generation":
      required.add("video_generation");
      break;
    case "deep_reasoning":
    case "math_solving":
      required.add("chat");
      required.add("reasoning");
      break;
    case "ocr":
      required.add("ocr");
      break;
    case "vision_analysis":
      required.add("vision");
      break;
    case "pdf_chat":
      required.add("pdf");
      required.add("chat");
      break;
    case "web_search":
      required.add("chat");
      required.add("web_search");
      break;
    case "voice_conversation":
      required.add("chat");
      required.add("streaming");
      break;
    case "code_generation":
    case "homework_help":
    case "translation":
    case "summarization":
    case "general_chat":
    default:
      required.add("chat");
      break;
  }

  // Dynamic checks based on attachments or options
  if (options?.image) {
    if (options.isPdf || options.image.startsWith("data:application/pdf") || options.image.includes("pdf")) {
      required.add("pdf");
    } else {
      required.add("vision");
    }
  }

  if (options?.forceWebSearch) {
    required.add("web_search");
  }

  if (options?.isStreaming) {
    required.add("streaming");
  }

  return Array.from(required);
}

/**
 * Filters a sequence of providers to keep only those supporting ALL required capabilities
 */
export function filterCapableProviders(
  providers: string[],
  requiredCapabilities: AICapability[]
): string[] {
  return providers.filter((provider) => hasAllCapabilities(provider, requiredCapabilities));
}
