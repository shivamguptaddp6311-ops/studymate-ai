import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

// Simple in-memory response cache to optimize quota usage and speed up repetitive tasks
const responseCache = new Map<string, { text: string; providerUsed: AIProvider; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache TTL

// Initialize Gemini client lazily to avoid startup crashes if key is missing
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

export type AIProvider = "auto" | "gemini" | "openai" | "groq" | "openrouter" | "anthropic";

export interface AIMessage {
  role: "user" | "model" | "assistant" | "system";
  content: string;
}

export interface AIResponse {
  text: string;
  providerUsed: AIProvider;
}

// Check configured keys
export function getConfiguredProviders() {
  return {
    gemini: !!process.env.GEMINI_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    groq: !!process.env.GROQ_API_KEY,
    openrouter: !!process.env.OPENROUTER_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
  };
}

// Convert common message roles to provider-specific formats
function convertMessagesToOpenAIFormat(messages: AIMessage[], systemInstruction?: string) {
  const formatted: any[] = [];
  if (systemInstruction) {
    formatted.push({ role: "system", content: systemInstruction });
  }
  messages.forEach(m => {
    // OpenAI/Groq/OpenRouter roles: system, user, assistant
    const role = m.role === "model" ? "assistant" : m.role;
    formatted.push({ role, content: m.content });
  });
  return formatted;
}

function convertMessagesToAnthropicFormat(messages: AIMessage[]) {
  // Anthropic messages cannot contain system messages. System instructions must be passed separately.
  // And it doesn't allow model/assistant consecutive messages or leading model/assistant messages.
  const formatted: any[] = [];
  messages.forEach(m => {
    if (m.role !== "system") {
      const role = m.role === "model" ? "assistant" : m.role;
      formatted.push({ role, content: m.content });
    }
  });
  return formatted;
}

// Main execution function with retries and automatic fallback
export async function executeAIRequest(options: {
  messages: AIMessage[];
  systemInstruction?: string;
  image?: string; // Base64 data (with or without data:image prefix)
  preferredProvider?: AIProvider;
  responseSchema?: any; // optional Gemini-specific schema
  temperature?: number;
}): Promise<AIResponse> {
  const { messages, systemInstruction, image, preferredProvider = "auto", responseSchema } = options;

  // Create unique cache key for lookup
  const cacheKeyInput = JSON.stringify({
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    systemInstruction,
    image: image ? image.substring(0, 100) : "",
    imageLen: image ? image.length : 0,
    preferredProvider,
    responseSchema: responseSchema ? JSON.stringify(responseSchema) : ""
  });
  const cacheKey = crypto.createHash("md5").update(cacheKeyInput).digest("hex");

  const cached = responseCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    console.log(`[AIService] Cache HIT for key: ${cacheKey}`);
    return {
      text: cached.text,
      providerUsed: cached.providerUsed
    };
  }

  // Determine list of providers to try
  const config = getConfiguredProviders();
  const fallbackOrder: AIProvider[] = ["gemini", "openai", "groq", "openrouter", "anthropic"];
  
  let providersToTry: AIProvider[] = [];

  if (preferredProvider !== "auto" && preferredProvider !== undefined) {
    // If a specific provider is preferred, try it first, then try the fallback ones
    providersToTry.push(preferredProvider);
    fallbackOrder.forEach(p => {
      if (p !== preferredProvider) {
        providersToTry.push(p);
      }
    });
  } else {
    providersToTry = [...fallbackOrder];
  }

  // Filter to only those that have keys configured
  providersToTry = providersToTry.filter(p => config[p as keyof typeof config]);

  if (providersToTry.length === 0) {
    // If no keys are set, fallback to attempting Gemini anyway (might be injected by system),
    // or throw a clear error
    if (process.env.GEMINI_API_KEY) {
      providersToTry = ["gemini"];
    } else {
      throw new Error(
        "No AI Providers are configured. Please set GEMINI_API_KEY or other keys (OPENAI_API_KEY, GROQ_API_KEY, etc.) in the Secrets Settings."
      );
    }
  }

  let lastError: any = null;

  for (const provider of providersToTry) {
    try {
      console.log(`[AIService] Attempting request using provider: ${provider}`);
      let resultText = "";

      // Append active provider context to systemInstruction so the model knows which engine is executing the request
      let activeSystemInstruction = systemInstruction || "";
      const providerContext = `\n\n[Active AI Engine Context: You are currently running on the "${provider}" provider backend. If the user asks which AI provider, model, engine, or backend you are currently using, you MUST truthfully tell them that you are currently using ${provider}.]`;
      if (activeSystemInstruction) {
        activeSystemInstruction += providerContext;
      } else {
        activeSystemInstruction = providerContext;
      }

      if (provider === "gemini") {
        resultText = await callGemini(messages, activeSystemInstruction, image, responseSchema);
      } else if (provider === "openai") {
        resultText = await callOpenAI(messages, activeSystemInstruction, image, responseSchema);
      } else if (provider === "groq") {
        resultText = await callGroq(messages, activeSystemInstruction, image, responseSchema);
      } else if (provider === "openrouter") {
        resultText = await callOpenRouter(messages, activeSystemInstruction, image, responseSchema);
      } else if (provider === "anthropic") {
        resultText = await callAnthropic(messages, activeSystemInstruction, image, responseSchema);
      }

      console.log(`[AIService] Successfully received response from provider: ${provider}`);
      // Save in cache
      responseCache.set(cacheKey, {
        text: resultText,
        providerUsed: provider,
        timestamp: Date.now()
      });
      return {
        text: resultText,
        providerUsed: provider
      };
    } catch (err: any) {
      console.warn(`[AIService] Provider ${provider} failed:`, err.message || err);
      lastError = err;
      // Continue to next provider in fallback loop
    }
  }

  throw new Error(`All configured AI Providers failed. Last error: ${lastError?.message || lastError}`);
}

// ----------------------------------------------------
// PROVIDER IMPLEMENTATIONS
// ----------------------------------------------------

async function callGemini(
  messages: AIMessage[],
  systemInstruction?: string,
  image?: string,
  responseSchema?: any
): Promise<string> {
  const gemini = getGeminiClient();
  if (!gemini) throw new Error("Gemini API key is not configured");

  // Reconstruct parts
  const contents: any[] = [];
  
  // Format history
  messages.forEach((m, idx) => {
    // For Gemini, we push as parts
    const isLast = idx === messages.length - 1;
    const parts: any[] = [{ text: m.content }];

    if (isLast && image) {
      let mimeType = "image/png";
      let base64Data = image.trim();

      if (base64Data.startsWith("data:")) {
        const urlParts = base64Data.split(";base64,");
        if (urlParts.length === 2) {
          mimeType = urlParts[0].replace("data:", "").trim();
          base64Data = urlParts[1].trim();
        }
      }

      parts.push({
        inlineData: {
          mimeType,
          data: base64Data
        }
      });
    }

    contents.push({
      role: m.role === "model" || m.role === "assistant" ? "model" : "user",
      parts
    });
  });

  const config: any = {};
  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }
  if (responseSchema) {
    config.responseMimeType = "application/json";
    config.responseSchema = responseSchema;
  }

  const fetchWithRetry = async (modelName: string): Promise<any> => {
    let lastErr: any = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await gemini.models.generateContent({
          model: modelName,
          contents,
          config
        });
        if (res.text) return res;
        throw new Error("Empty text response from Gemini");
      } catch (e: any) {
        lastErr = e;
        const isQuotaOr429 = e?.message?.includes("429") || e?.message?.includes("RESOURCE_EXHAUSTED") || e?.message?.includes("quota");
        if (isQuotaOr429 && modelName === "gemini-3.5-flash") {
          // If it is a quota limit, don't waste retries, trigger fallback immediately
          break;
        }
        console.warn(`[AIService] Gemini attempt ${attempt} failed: ${e?.message || e}. Retrying...`);
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        }
      }
    }
    throw lastErr || new Error("Failed to generate content from Gemini");
  };

  try {
    const response = await fetchWithRetry("gemini-3.5-flash");
    return response.text;
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota")) {
      console.warn("[AIService] gemini-3.5-flash hit 429/quota limit. Retrying with gemini-3.1-flash-lite...");
      try {
        const fallbackResponse = await fetchWithRetry("gemini-3.1-flash-lite");
        return fallbackResponse.text;
      } catch (fallbackErr) {
        console.error("[AIService] gemini-3.1-flash-lite fallback also failed:", fallbackErr);
      }
    }
    throw err;
  }
}

async function callOpenAI(
  messages: AIMessage[],
  systemInstruction?: string,
  image?: string,
  responseSchema?: any
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API key is not configured");

  const formattedMessages = convertMessagesToOpenAIFormat(messages, systemInstruction);

  // Handle multi-modal if image is provided
  if (image && formattedMessages.length > 0) {
    const lastMsg = formattedMessages[formattedMessages.length - 1];
    if (lastMsg.role === "user") {
      let imageFullUrl = image;
      if (!image.startsWith("data:")) {
        imageFullUrl = `data:image/png;base64,${image}`;
      }
      lastMsg.content = [
        { type: "text", text: lastMsg.content },
        { type: "image_url", image_url: { url: imageFullUrl } }
      ];
    }
  }

  const body: any = {
    model: "gpt-4o-mini",
    messages: formattedMessages,
    temperature: 0.7
  };

  if (responseSchema) {
    body.response_format = { type: "json_object" };
    // Force json in system prompt as well
    const sysMsg = formattedMessages.find(m => m.role === "system");
    const jsonInstruction = "\nCRITICAL: Respond strictly with a JSON object.";
    if (sysMsg) {
      sysMsg.content += jsonInstruction;
    } else {
      formattedMessages.unshift({ role: "system", content: jsonInstruction });
    }
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API returned status ${response.status}: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callGroq(
  messages: AIMessage[],
  systemInstruction?: string,
  image?: string,
  responseSchema?: any
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Groq API key is not configured");

  const formattedMessages = convertMessagesToOpenAIFormat(messages, systemInstruction);

  // If there's an image, Groq's standard models don't support it unless we use llama-3.2-11b-vision-instruct
  // Let's use llama-3.2-11b-vision-instruct if image is uploaded, else llama-3.3-70b-versatile
  const model = image ? "llama-3.2-11b-vision-instruct" : "llama-3.3-70b-versatile";

  if (image && formattedMessages.length > 0) {
    const lastMsg = formattedMessages[formattedMessages.length - 1];
    if (lastMsg.role === "user") {
      let imageFullUrl = image;
      if (!image.startsWith("data:")) {
        imageFullUrl = `data:image/png;base64,${image}`;
      }
      lastMsg.content = [
        { type: "text", text: lastMsg.content },
        { type: "image_url", image_url: { url: imageFullUrl } }
      ];
    }
  }

  const body: any = {
    model,
    messages: formattedMessages,
    temperature: 0.7
  };

  if (responseSchema) {
    body.response_format = { type: "json_object" };
    const sysMsg = formattedMessages.find(m => m.role === "system");
    const jsonInstruction = "\nCRITICAL: Respond strictly with a JSON object.";
    if (sysMsg) {
      sysMsg.content += jsonInstruction;
    } else {
      formattedMessages.unshift({ role: "system", content: jsonInstruction });
    }
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Groq API returned status ${response.status}: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callOpenRouter(
  messages: AIMessage[],
  systemInstruction?: string,
  image?: string,
  responseSchema?: any
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OpenRouter API key is not configured");

  const formattedMessages = convertMessagesToOpenAIFormat(messages, systemInstruction);

  // We'll use google/gemini-2.5-flash as the default model on OpenRouter since it's robust and supports images
  const model = "google/gemini-2.5-flash";

  if (image && formattedMessages.length > 0) {
    const lastMsg = formattedMessages[formattedMessages.length - 1];
    if (lastMsg.role === "user") {
      let imageFullUrl = image;
      if (!image.startsWith("data:")) {
        imageFullUrl = `data:image/png;base64,${image}`;
      }
      lastMsg.content = [
        { type: "text", text: lastMsg.content },
        { type: "image_url", image_url: { url: imageFullUrl } }
      ];
    }
  }

  const body: any = {
    model,
    messages: formattedMessages,
    temperature: 0.7,
    max_tokens: 4000
  };

  if (responseSchema) {
    body.response_format = { type: "json_object" };
    const sysMsg = formattedMessages.find(m => m.role === "system");
    const jsonInstruction = "\nCRITICAL: Respond strictly with a JSON object.";
    if (sysMsg) {
      sysMsg.content += jsonInstruction;
    } else {
      formattedMessages.unshift({ role: "system", content: jsonInstruction });
    }
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://studymate-ai.com",
      "X-Title": "StudyMate AI"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenRouter API returned status ${response.status}: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callAnthropic(
  messages: AIMessage[],
  systemInstruction?: string,
  image?: string,
  responseSchema?: any
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Anthropic API key is not configured");

  const formattedMessages = convertMessagesToAnthropicFormat(messages);

  // If there's an image, Anthropic requires a special base64 format block
  if (image && formattedMessages.length > 0) {
    const lastMsg = formattedMessages[formattedMessages.length - 1];
    if (lastMsg.role === "user") {
      let mimeType = "image/png";
      let base64Data = image.trim();

      if (base64Data.startsWith("data:")) {
        const urlParts = base64Data.split(";base64,");
        if (urlParts.length === 2) {
          mimeType = urlParts[0].replace("data:", "").trim();
          base64Data = urlParts[1].trim();
        }
      }

      lastMsg.content = [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: mimeType,
            data: base64Data
          }
        },
        { type: "text", text: lastMsg.content }
      ];
    }
  }

  const body: any = {
    model: "claude-3-5-haiku-20241022",
    max_tokens: 4000,
    messages: formattedMessages,
    temperature: 0.7
  };

  if (systemInstruction) {
    body.system = systemInstruction;
  }

  if (responseSchema) {
    // Append JSON instruction to system instruction
    const jsonInstruction = "\nCRITICAL: Respond strictly with a JSON object.";
    if (body.system) {
      body.system += jsonInstruction;
    } else {
      body.system = jsonInstruction;
    }
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Anthropic API returned status ${response.status}: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || "";
}
