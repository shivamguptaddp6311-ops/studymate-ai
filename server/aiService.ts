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
  if (!apiKey || !isValidKey(apiKey)) return null;
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

// Check if API key is a valid non-placeholder value
function isValidKey(key: string | undefined): boolean {
  if (!key) return false;
  const k = key.trim();
  return (
    k !== "" &&
    !k.startsWith("MY_") &&
    !k.includes("YOUR_") &&
    k !== "null" &&
    k !== "undefined" &&
    k.length > 5
  );
}

// Check configured keys
export function getConfiguredProviders() {
  return {
    gemini: isValidKey(process.env.GEMINI_API_KEY),
    openai: isValidKey(process.env.OPENAI_API_KEY),
    groq: isValidKey(process.env.GROQ_API_KEY),
    openrouter: isValidKey(process.env.OPENROUTER_API_KEY),
    anthropic: isValidKey(process.env.ANTHROPIC_API_KEY),
  };
}

// Convert common message roles to provider-specific formats
function convertMessagesToOpenAIFormat(messages: AIMessage[], systemInstruction?: string) {
  const formatted: any[] = [];
  if (systemInstruction) {
    formatted.push({ role: "system", content: systemInstruction });
  }
  messages.forEach(m => {
    const role = m.role === "model" ? "assistant" : m.role;
    formatted.push({ role, content: m.content });
  });
  return formatted;
}

function convertMessagesToAnthropicFormat(messages: AIMessage[]) {
  const formatted: any[] = [];
  messages.forEach(m => {
    if (m.role !== "system") {
      const role = m.role === "model" ? "assistant" : m.role;
      formatted.push({ role, content: m.content });
    }
  });
  return formatted;
}

// Timeout promise wrapper
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    promise
      .then(res => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch(err => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Exponential backoff retry utility
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  retries = 3,
  delay = 1000,
  onRetry?: (error: any, attempt: number) => void
): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const is429 =
        error?.status === 429 ||
        error?.message?.includes("429") ||
        error?.message?.includes("RESOURCE_EXHAUSTED") ||
        error?.message?.includes("quota") ||
        error?.message?.includes("rate limit") ||
        error?.message?.includes("Rate limit");
      
      if (attempt === retries) {
        break;
      }
      if (onRetry) onRetry(error, attempt);
      const actualDelay = is429 ? delay * 3 * attempt : delay * attempt;
      await new Promise(resolve => setTimeout(resolve, actualDelay));
    }
  }
  throw lastError;
}

// Robust fallback JSON parser helper
export function parseJsonResponse(text: string): any {
  if (!text) return {};
  const cleaned = text.trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Attempt markdown json extraction
    const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch (e2) {
        // continue
      }
    }
    // Attempt relaxed cleanup (e.g. strip wrapping ```, trim whitespaces)
    let relaxed = cleaned;
    relaxed = relaxed.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
    try {
      return JSON.parse(relaxed.trim());
    } catch (e3) {
      console.error("[AIService] Failed all attempts to parse JSON response:", text);
      throw new Error("Failed to parse JSON response from AI provider.");
    }
  }
}

// Main execution function with retries and automatic fallback
export async function executeAIRequest(options: {
  messages: AIMessage[];
  systemInstruction?: string;
  image?: string; // Base64 data (with or without data: prefix)
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
  // Standard fallback sequence requested by user
  const fallbackOrder: AIProvider[] = ["gemini", "openai", "groq", "anthropic", "openrouter"];
  
  let providersToTry: AIProvider[] = [];

  if (preferredProvider !== "auto" && preferredProvider !== undefined) {
    providersToTry.push(preferredProvider);
    fallbackOrder.forEach(p => {
      if (p !== preferredProvider) {
        providersToTry.push(p);
      }
    });
  } else {
    providersToTry = [...fallbackOrder];
  }

  // Filter based on configured keys
  providersToTry = providersToTry.filter(p => config[p as keyof typeof config]);

  if (providersToTry.length === 0) {
    if (isValidKey(process.env.GEMINI_API_KEY)) {
      providersToTry = ["gemini"];
    } else {
      throw new Error(
        "No AI Providers are configured. Please set GEMINI_API_KEY or other keys (OPENAI_API_KEY, GROQ_API_KEY, etc.) in the Secrets Settings."
      );
    }
  }

  const isPdf = !!image && (image.startsWith("data:application/pdf") || image.includes("pdf"));

  let lastError: any = null;

  for (const provider of providersToTry) {
    try {
      // Validate support for document/PDF format
      if (isPdf && ["openai", "groq", "anthropic"].includes(provider)) {
        console.warn(`[AIService] Skipping provider ${provider} because PDF document input is only natively supported by Gemini/OpenRouter.`);
        continue;
      }

      console.log(`[AIService] Attempting request using provider: ${provider}`);
      let resultText = "";

      // Append active provider context
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

      if (!resultText || resultText.trim() === "") {
        throw new Error(`Provider ${provider} returned an empty or invalid response.`);
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

  const contents: any[] = [];
  
  messages.forEach((m, idx) => {
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

  const executeCall = async (modelName: string): Promise<string> => {
    return await retryWithBackoff(async () => {
      const responsePromise = gemini.models.generateContent({
        model: modelName,
        contents,
        config
      });

      const res = await withTimeout(
        responsePromise,
        30000,
        `Gemini API request timed out after 30 seconds for model: ${modelName}`
      );

      if (res.text) return res.text;
      throw new Error("Empty text response received from Gemini SDK.");
    }, 3, 1000, (err, attempt) => {
      console.warn(`[AIService] Gemini attempt ${attempt} failed with error: ${err.message || err}. Retrying...`);
    });
  };

  try {
    return await executeCall("gemini-3.5-flash");
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota")) {
      console.warn("[AIService] gemini-3.5-flash hit 429/quota limit. Instantly falling back to gemini-3.1-flash-lite...");
      try {
        return await executeCall("gemini-3.1-flash-lite");
      } catch (fallbackErr) {
        console.error("[AIService] gemini-3.1-flash-lite fallback failed:", fallbackErr);
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
    const sysMsg = formattedMessages.find(m => m.role === "system");
    const jsonInstruction = "\nCRITICAL: Respond strictly with a JSON object.";
    if (sysMsg) {
      sysMsg.content += jsonInstruction;
    } else {
      formattedMessages.unshift({ role: "system", content: jsonInstruction });
    }
  }

  return await retryWithBackoff(async () => {
    const fetchPromise = fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    const response = await withTimeout(
      fetchPromise,
      30000,
      "OpenAI API request timed out after 30 seconds."
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API returned status ${response.status}: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }, 3, 1000, (err, attempt) => {
    console.warn(`[AIService] OpenAI attempt ${attempt} failed with error: ${err.message || err}. Retrying...`);
  });
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

  return await retryWithBackoff(async () => {
    const fetchPromise = fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    const response = await withTimeout(
      fetchPromise,
      30000,
      "Groq API request timed out after 30 seconds."
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Groq API returned status ${response.status}: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }, 3, 1000, (err, attempt) => {
    console.warn(`[AIService] Groq attempt ${attempt} failed with error: ${err.message || err}. Retrying...`);
  });
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

  return await retryWithBackoff(async () => {
    const fetchPromise = fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://studymate-ai.com",
        "X-Title": "StudyMate AI"
      },
      body: JSON.stringify(body)
    });

    const response = await withTimeout(
      fetchPromise,
      30000,
      "OpenRouter API request timed out after 30 seconds."
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenRouter API returned status ${response.status}: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }, 3, 1000, (err, attempt) => {
    console.warn(`[AIService] OpenRouter attempt ${attempt} failed with error: ${err.message || err}. Retrying...`);
  });
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
    const jsonInstruction = "\nCRITICAL: Respond strictly with a JSON object.";
    if (body.system) {
      body.system += jsonInstruction;
    } else {
      body.system = jsonInstruction;
    }
  }

  return await retryWithBackoff(async () => {
    const fetchPromise = fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(body)
    });

    const response = await withTimeout(
      fetchPromise,
      30000,
      "Anthropic API request timed out after 30 seconds."
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Anthropic API returned status ${response.status}: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || "";
  }, 3, 1000, (err, attempt) => {
    console.warn(`[AIService] Anthropic attempt ${attempt} failed with error: ${err.message || err}. Retrying...`);
  });
}
