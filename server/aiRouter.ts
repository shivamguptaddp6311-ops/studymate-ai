import {
  AIProvider,
  AIImageProvider,
  AIMessage,
  executeAIRequest,
  executeImageGenRequest,
  getConfiguredProviders,
  getConfiguredImageProviders,
  parseJsonResponse
} from "./aiService";
import {
  AICapability,
  hasAllCapabilities,
  validateProviderCapabilities,
  getRequiredCapabilitiesForTask,
  filterCapableProviders,
  PROVIDER_CAPABILITIES_REGISTRY
} from "./providerCapabilities";

export type AITaskType =
  | "general_chat"
  | "homework_help"
  | "deep_reasoning"
  | "web_search"
  | "ocr"
  | "vision_analysis"
  | "image_generation"
  | "image_editing"
  | "voice_conversation"
  | "pdf_chat"
  | "code_generation"
  | "math_solving"
  | "translation"
  | "summarization";

export interface AIRouterOptions {
  taskType?: AITaskType | "auto";
  prompt?: string;
  messages?: AIMessage[];
  systemInstruction?: string;
  image?: string; // base64 or URL
  category?: string;
  aspectRatio?: "1:1" | "3:4" | "16:9" | "9:16" | "4:3";
  quality?: "standard" | "hd";
  preferredProvider?: AIProvider | AIImageProvider;
  responseSchema?: any;
  temperature?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  metadata?: Record<string, any>;
}

export interface AIRouterResult {
  taskType: AITaskType;
  providerUsed: AIProvider | AIImageProvider;
  modelUsed: string;
  text?: string;
  imageUrl?: string;
  revisedPrompt?: string;
  data?: any;
  success: boolean;
  error?: string;
}

/**
 * Automatically detects the task type based on request options, user prompt, messages, and attachments.
 */
export function detectTaskType(options: AIRouterOptions): AITaskType {
  if (options.taskType && options.taskType !== "auto") {
    return options.taskType;
  }

  const { prompt = "", messages = [], image, category, metadata } = options;

  const lastMessageText = messages.length > 0 ? messages[messages.length - 1].content : "";
  const combinedText = `${prompt} ${lastMessageText}`.toLowerCase().trim();

  // 1. Image Generation & Editing
  if (category || metadata?.isImageGen) {
    return "image_generation";
  }

  const imageGenKeywords = [
    "generate image", "generate an image", "generate images",
    "create image", "create an image", "create images",
    "make an image", "make image", "make a picture", "make pictures",
    "draw ", "draw a ", "draw an ", "draw me ", "draw a picture",
    "photo of", "photograph of", "picture of", "pictures of",
    "illustration of", "illustration", "illustrations",
    "logo", "create logo", "generate logo", "design a logo", "design logo",
    "wallpaper", "create wallpaper", "generate wallpaper", "design wallpaper",
    "poster", "create poster", "generate poster", "design a poster", "design poster",
    "diagram of", "generate diagram", "create diagram",
    "painting of", "sketch of", "artwork of", "art of", "3d render of", "render an image",
    "photorealistic picture", "digital art of", "vector art of"
  ];
  if (imageGenKeywords.some(kw => combinedText.includes(kw))) {
    const isNegative = ["draw conclusion", "draw a conclusion", "draw conclusions", "draw inference", "draw inferences"].some(neg => combinedText.includes(neg));
    if (!isNegative) {
      return "image_generation";
    }
  }

  const imageEditKeywords = [
    "edit this image", "modify this image", "change background", "remove background",
    "edit photo", "replace background", "transform this image", "add filter"
  ];
  if (image && imageEditKeywords.some(kw => combinedText.includes(kw))) {
    return "image_editing";
  }

  // 2. Attachments Handling (PDF, OCR, Vision)
  const isPdf = !!image && (image.startsWith("data:application/pdf") || image.includes("pdf") || metadata?.isPdf);
  if (isPdf) {
    return "pdf_chat";
  }

  if (image) {
    const ocrKeywords = ["ocr", "extract text", "read text", "transcribe", "read handwritten", "scan document", "copy text from image"];
    if (ocrKeywords.some(kw => combinedText.includes(kw))) {
      return "ocr";
    }
    return "vision_analysis";
  }

  // 3. Voice Conversation
  if (metadata?.isVoice || combinedText.includes("[voice transcription]")) {
    return "voice_conversation";
  }

  // 4. Web Search
  const webSearchKeywords = [
    "search the web", "latest news", "current weather", "real-time data",
    "stock price today", "who won the recent", "today's news", "live info"
  ];
  if (webSearchKeywords.some(kw => combinedText.includes(kw)) || metadata?.forceWebSearch) {
    return "web_search";
  }

  // 5. Code Generation
  const codeKeywords = [
    "write code", "python script", "typescript", "javascript function", "react component",
    "fix bug", "debug this error", "syntax error", "sql query", "html/css", "refactor code",
    "implement function", "algorithm in", "def ", "function ", "const ", "import "
  ];
  if (codeKeywords.some(kw => combinedText.includes(kw))) {
    return "code_generation";
  }

  // 6. Math Solving
  const mathKeywords = [
    "solve equation", "calculus", "algebra", "integral of", "derivative of", "find x",
    "solve for x", "matrix multiplication", "trigonometry", "simplify equation", "math problem",
    "calculate the value"
  ];
  if (mathKeywords.some(kw => combinedText.includes(kw))) {
    return "math_solving";
  }

  // 7. Translation
  const translateKeywords = [
    "translate ", "translation of", "convert to spanish", "translate to french",
    "translate into hindi", "what does this mean in german", "translate this"
  ];
  if (translateKeywords.some(kw => combinedText.includes(kw))) {
    return "translation";
  }

  // 8. Summarization
  const summaryKeywords = [
    "summarize", "summary of", "tl;dr", "tldr", "key takeaways", "bullet point summary",
    "condense this text", "brief summary"
  ];
  if (summaryKeywords.some(kw => combinedText.includes(kw))) {
    return "summarization";
  }

  // 9. Homework Help
  const homeworkKeywords = [
    "homework", "assignment", "practice question", "quiz question", "chapter summary",
    "study guide", "syllabus", "exam preparation", "explain concept for grade"
  ];
  if (homeworkKeywords.some(kw => combinedText.includes(kw))) {
    return "homework_help";
  }

  // 10. Deep Reasoning
  const reasoningKeywords = [
    "think step by step", "deep reasoning", "analyze deeply", "logical proof",
    "complex strategy", "pros and cons", "evaluate trade-offs", "rigorous analysis"
  ];
  if (reasoningKeywords.some(kw => combinedText.includes(kw))) {
    return "deep_reasoning";
  }

  return "general_chat";
}

export function getProviderFallbackSequence(
  taskType: AITaskType,
  preferredProvider?: string,
  options?: { image?: string; isPdf?: boolean; isVoice?: boolean; forceWebSearch?: boolean }
): AIProvider[] {
  const defaultSequences: Record<AITaskType, AIProvider[]> = {
    general_chat: ["gemini", "openai", "groq", "anthropic", "openrouter"],
    homework_help: ["gemini", "openai", "groq", "anthropic", "openrouter"],
    deep_reasoning: ["gemini", "openai", "anthropic", "groq", "openrouter"],
    web_search: ["gemini", "openai", "openrouter", "groq"],
    ocr: ["gemini", "openai", "openrouter"],
    vision_analysis: ["gemini", "openai", "openrouter", "groq"],
    image_generation: ["gemini", "openai", "fal"],
    image_editing: ["gemini", "openai", "fal"],
    voice_conversation: ["gemini", "groq", "openai"],
    pdf_chat: ["gemini", "openrouter", "openai"],
    code_generation: ["gemini", "groq", "openai", "anthropic", "openrouter"],
    math_solving: ["gemini", "openai", "anthropic", "groq", "openrouter"],
    translation: ["gemini", "groq", "openai", "anthropic"],
    summarization: ["gemini", "groq", "openai", "anthropic"]
  };

  const rawSeq = defaultSequences[taskType] || defaultSequences.general_chat;
  const requiredCapabilities = getRequiredCapabilitiesForTask(taskType, options);

  let seq = filterCapableProviders(rawSeq, requiredCapabilities) as AIProvider[];
  if (seq.length === 0) {
    seq = rawSeq; // fallback safety
  }

  if (preferredProvider && preferredProvider !== "auto") {
    const p = preferredProvider as AIProvider;
    const { valid, missing } = validateProviderCapabilities(p, requiredCapabilities);
    if (valid) {
      return [p, ...seq.filter(x => x !== p)];
    } else {
      console.warn(`[AIRouter] Preferred provider '${preferredProvider}' lacks required capabilities [${missing.join(", ")}]. Skipping preference and using capable fallback sequence.`);
    }
  }
  return seq;
}

export function getDefaultModelForProvider(provider: string, taskType: AITaskType): string {
  switch (provider) {
    case "gemini":
      if (taskType === "image_generation" || taskType === "image_editing") return "imagen-3.0-generate-002";
      if (taskType === "deep_reasoning" || taskType === "math_solving") return "gemini-2.5-pro";
      return "gemini-2.5-flash";
    case "openai":
      if (taskType === "image_generation" || taskType === "image_editing") return "dall-e-3";
      if (taskType === "deep_reasoning" || taskType === "math_solving" || taskType === "code_generation") return "gpt-4o";
      return "gpt-4o-mini";
    case "groq":
      return "llama-3.3-70b-versatile";
    case "anthropic":
      return "claude-3-5-sonnet-20241022";
    case "openrouter":
      return "meta-llama/llama-3.3-70b-instruct";
    case "fal":
      return "fal-ai/flux/schnell";
    default:
      return "default-model";
  }
}

export function getTaskTypeSystemContext(taskType: AITaskType): string {
  switch (taskType) {
    case "math_solving":
      return "[Task Context: You are an expert Math & Logic Engine. Solve equations step-by-step with clear formulas, calculations, and LaTeX formatting.]";
    case "code_generation":
      return "[Task Context: You are an expert Senior Software Engineer. Provide clean, production-ready, well-commented code with syntax highlighting.]";
    case "ocr":
      return "[Task Context: You are a precise Document OCR Engine. Extract all visible text accurately from the image preserving structure.]";
    case "pdf_chat":
      return "[Task Context: You are a Document Analysis Assistant. Analyze the provided PDF document and answer questions based strictly on its content.]";
    case "deep_reasoning":
      return "[Task Context: You are a Deep Reasoning AI. Analyze problems step-by-step, evaluate trade-offs, and provide rigorous logic.]";
    case "translation":
      return "[Task Context: You are a professional Translator. Provide accurate, natural-sounding translations preserving nuance and tone.]";
    case "summarization":
      return "[Task Context: You are a Concise Summarizer. Extract key insights, bullet points, and high-level summaries without fluff.]";
    case "homework_help":
      return "[Task Context: You are an encouraging Expert Academic Tutor. Explain concepts clearly for students, breaking down tough topics simply.]";
    case "web_search":
      return "[Task Context: You are a Real-Time Information Assistant. Provide accurate, up-to-date answers with cited sources where applicable.]";
    case "voice_conversation":
      return "[Task Context: You are a Conversational Voice Assistant. Provide concise, natural, spoken-style responses easy to listen to.]";
    default:
      return "";
  }
}

/**
 * Centralized AI Router - Routes all text, chat, image, document, reasoning, and multimodal requests
 * through a unified resilience pipeline with automatic task detection, provider fallback, timeouts, and rate limits.
 */
export class AIRouter {
  static detectTaskType(options: AIRouterOptions): AITaskType {
    return detectTaskType(options);
  }

  static async route(options: AIRouterOptions): Promise<AIRouterResult> {
    const taskType = detectTaskType(options);

    try {
      if (taskType === "image_generation" || taskType === "image_editing") {
        const promptText = options.prompt || (options.messages && options.messages.length > 0 ? options.messages[options.messages.length - 1].content : "Generate image");
        
        const imgResult = await executeImageGenRequest({
          prompt: promptText,
          category: options.category,
          aspectRatio: options.aspectRatio,
          quality: options.quality,
          preferredProvider: options.preferredProvider as any,
          timeoutMs: options.timeoutMs,
          signal: options.signal
        });

        return {
          taskType,
          providerUsed: imgResult.providerUsed,
          modelUsed: getDefaultModelForProvider(imgResult.providerUsed, taskType),
          imageUrl: imgResult.imageUrl,
          revisedPrompt: imgResult.revisedPrompt,
          success: true
        };
      }

      // Text / Chat Task Types
      let messages = options.messages || [];
      if (messages.length === 0 && options.prompt) {
        messages = [{ role: "user", content: options.prompt }];
      }

      let systemInstruction = options.systemInstruction || "";
      const taskContext = getTaskTypeSystemContext(taskType);
      if (taskContext) {
        systemInstruction = systemInstruction ? `${systemInstruction}\n\n${taskContext}` : taskContext;
      }

      const textResult = await executeAIRequest({
        messages,
        systemInstruction,
        image: options.image,
        preferredProvider: options.preferredProvider as AIProvider,
        responseSchema: options.responseSchema,
        temperature: options.temperature,
        timeoutMs: options.timeoutMs,
        signal: options.signal
      });

      let parsedData: any = null;
      if (options.responseSchema) {
        try {
          parsedData = parseJsonResponse(textResult.text);
        } catch (e) {
          // ignore
        }
      }

      return {
        taskType,
        providerUsed: textResult.providerUsed,
        modelUsed: getDefaultModelForProvider(textResult.providerUsed, taskType),
        text: textResult.text,
        data: parsedData,
        success: true
      };
    } catch (err: any) {
      console.error(`[AIRouter] Request for taskType=${taskType} failed:`, err);
      return {
        taskType,
        providerUsed: options.preferredProvider || "auto",
        modelUsed: "unknown",
        success: false,
        error: err.message || String(err)
      };
    }
  }
}
