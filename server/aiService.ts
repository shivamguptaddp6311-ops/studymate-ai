import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import crypto from "crypto";
import { firebaseDB } from "./firebase";

dotenv.config();

// Simple in-memory response cache to optimize quota usage and speed up repetitive tasks
const responseCache = new Map<string, { text: string; providerUsed: AIProvider; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache TTL

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const signal = options.signal
    ? (AbortSignal as any).any([options.signal, controller.signal])
    : controller.signal;

  try {
    const response = await fetch(url, { ...options, signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

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

export type AIProvider = "auto" | "gemini" | "openai" | "groq" | "openrouter" | "anthropic" | "fal";
export type AIImageProvider = "auto" | "gemini" | "openai" | "fal";

export interface ImageGenOptions {
  prompt: string;
  category?: string;
  aspectRatio?: "1:1" | "3:4" | "16:9" | "9:16" | "4:3";
  quality?: "standard" | "hd";
  preferredProvider?: AIImageProvider;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface ImageGenResponse {
  imageUrl: string;
  providerUsed: AIImageProvider;
  revisedPrompt: string;
}

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

// Dynamic tracker to disable Anthropic if we encounter a billing/credit exhaustion error
let isAnthropicDisabled = false;

// Check configured keys
export function getConfiguredProviders() {
  return {
    gemini: isValidKey(process.env.GEMINI_API_KEY),
    openai: isValidKey(process.env.OPENAI_API_KEY),
    groq: isValidKey(process.env.GROQ_API_KEY),
    openrouter: isValidKey(process.env.OPENROUTER_API_KEY),
    anthropic: isValidKey(process.env.ANTHROPIC_API_KEY) && !isAnthropicDisabled,
    fal: isValidKey(process.env.FAL_KEY) || isValidKey(process.env.FAL_API_KEY)
  };
}

export function getConfiguredImageProviders() {
  return {
    gemini: isValidKey(process.env.GEMINI_API_KEY),
    openai: isValidKey(process.env.OPENAI_API_KEY),
    fal: isValidKey(process.env.FAL_KEY) || isValidKey(process.env.FAL_API_KEY)
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

const DEFAULT_TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS) || 30000;

// Upgraded Timeout & AbortSignal promise wrapper
function withTimeoutAndSignal<T>(
  promiseFactory: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  errorMessage: string,
  externalSignal?: AbortSignal
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const controller = new AbortController();
    const signal = controller.signal;

    // Fast-path abort
    if (externalSignal?.aborted) {
      return reject(new Error("Request was cancelled by user."));
    }

    const onExternalAbort = () => {
      controller.abort();
      clearTimeout(timer);
      reject(new Error("Request was cancelled by user."));
    };

    if (externalSignal) {
      externalSignal.addEventListener("abort", onExternalAbort);
    }

    const timer = setTimeout(() => {
      controller.abort();
      if (externalSignal) {
        externalSignal.removeEventListener("abort", onExternalAbort);
      }
      reject(new Error(errorMessage));
    }, timeoutMs);

    promiseFactory(signal)
      .then(res => {
        clearTimeout(timer);
        if (externalSignal) {
          externalSignal.removeEventListener("abort", onExternalAbort);
        }
        resolve(res);
      })
      .catch(err => {
        clearTimeout(timer);
        if (externalSignal) {
          externalSignal.removeEventListener("abort", onExternalAbort);
        }
        reject(err);
      });
  });
}

// Exponential backoff retry utility respecting AbortSignal
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  retries = 3,
  delay = 1000,
  onRetry?: (error: any, attempt: number) => void,
  externalSignal?: AbortSignal
): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= retries; attempt++) {
    if (externalSignal?.aborted) {
      throw new Error("Request was cancelled by user.");
    }
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // If aborted, do not retry
      if (error?.name === "AbortError" || error?.message?.includes("cancelled") || externalSignal?.aborted) {
        throw error;
      }

      // If it's a fatal billing, credit, or auth error, throw immediately without retrying
      const errMsg = error?.message || String(error);
      const isFatal =
        errMsg.includes("credit balance") ||
        errMsg.includes("Credit balance") ||
        errMsg.includes("billing") ||
        errMsg.includes("Billing") ||
        errMsg.includes("invalid_api_key") ||
        errMsg.includes("invalid api key");

      if (isFatal) {
        throw error;
      }

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
      
      // Sleep while checking for external signal abort
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (externalSignal) {
            externalSignal.removeEventListener("abort", onAbortDuringSleep);
          }
          resolve();
        }, actualDelay);

        function onAbortDuringSleep() {
          clearTimeout(timeout);
          reject(new Error("Request was cancelled by user."));
        }

        if (externalSignal) {
          externalSignal.addEventListener("abort", onAbortDuringSleep, { once: true });
        }
      });
    }
  }
  throw lastError;
}

// Robust state-machine to repair common AI-generated JSON formatting errors
export function repairJsonString(raw: string): string {
  let result = "";
  let inString = false;
  let escaped = false;
  
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    
    if (inString) {
      if (escaped) {
        // We are currently escaping a character.
        // In standard JSON, only certain characters can follow a backslash: ", \, /, b, f, n, r, t, u
        // But in math/LaTeX or rich texts, we might have things like \frac, \alpha, \times, \theta, \beta.
        const isValidEscape = ["\"", "\\", "/", "b", "f", "n", "r", "t"].includes(c) || 
                              (c === "u" && /^[0-9a-fA-F]{4}$/.test(raw.substring(i + 1, i + 5)));
        
        if (!isValidEscape) {
          result += "\\\\" + c;
        } else {
          // If it is f, b, t, n, r but followed by letters (e.g. \frac, \begin, \times, \newline, \right)
          // it is almost certainly a LaTeX keyword or other text keyword rather than a real control character.
          const rest = raw.substring(i);
          const isLatexWord = /^[a-zA-Z]+/.test(rest);
          if (isLatexWord && ["f", "b", "t", "n", "r"].includes(c)) {
            result += "\\\\" + c;
          } else {
            result += "\\" + c;
          }
        }
        escaped = false;
      } else if (c === "\\") {
        escaped = true;
      } else if (c === "\"") {
        inString = false;
        result += c;
      } else if (c === "\n") {
        // Raw literal newlines are invalid in JSON string values. Escape them as \n.
        result += "\\n";
      } else if (c === "\r") {
        result += "\\r";
      } else if (c === "\t") {
        result += "\\t";
      } else {
        result += c;
      }
    } else {
      if (c === "\"") {
        inString = true;
      }
      result += c;
    }
  }
  
  if (escaped) {
    result += "\\\\";
  }
  
  // Clean up trailing commas in objects or arrays
  return result.replace(/,\s*([\]}])/g, "$1");
}

// Robust fallback JSON parser helper
export function parseJsonResponse(text: string): any {
  if (!text) return {};
  const cleaned = text.trim();
  
  // 1. Try standard parsing of the cleaned text
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // continue
  }

  // 2. Try markdown json block extraction
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    try {
      return JSON.parse(jsonMatch[1].trim());
    } catch (e2) {
      // continue
    }
  }

  // 3. Try parsing after relaxed cleanup (stripping code blocks)
  let relaxed = cleaned;
  relaxed = relaxed.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    return JSON.parse(relaxed);
  } catch (e3) {
    // continue
  }

  // 4. Try parsing using our custom state-machine repair helper on the text
  try {
    const repaired = repairJsonString(relaxed);
    return JSON.parse(repaired);
  } catch (e4) {
    // continue
  }

  // 5. Try parsing using our custom state-machine repair helper on raw match
  if (jsonMatch && jsonMatch[1]) {
    try {
      const repairedMatch = repairJsonString(jsonMatch[1].trim());
      return JSON.parse(repairedMatch);
    } catch (e5) {
      // continue
    }
  }

  console.error("[AIService] Failed all attempts to parse JSON response:", text);
  throw new Error("Failed to parse JSON response from AI provider.");
}

// Main execution function with retries and automatic fallback
export async function executeAIRequest(options: {
  messages: AIMessage[];
  systemInstruction?: string;
  image?: string; // Base64 data (with or without data: prefix)
  preferredProvider?: AIProvider;
  responseSchema?: any; // optional Gemini-specific schema
  temperature?: number;
  timeoutMs?: number; // Configurable timeout limit
  signal?: AbortSignal; // Allow external AbortSignal to cancel
}): Promise<AIResponse> {
  const { messages, systemInstruction, image, preferredProvider = "auto", responseSchema, timeoutMs, signal } = options;

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
  let success = false;
  let finalResult: AIResponse | null = null;
  const startTime = Date.now();
  let providerUsed: AIProvider = preferredProvider;

  try {
    for (const provider of providersToTry) {
      if (signal?.aborted) {
        throw new Error("Request was cancelled by user.");
      }
      try {
        // Validate support for document/PDF format
        if (isPdf && ["openai", "groq", "anthropic"].includes(provider)) {
          console.info(`[AIService] Skipping provider ${provider} because PDF document input is only natively supported by Gemini/OpenRouter.`);
          continue;
        }

        console.log(`[AIService] Attempting request using provider: ${provider}`);
        let resultText = "";
        providerUsed = provider;

        // Append active provider context
        let activeSystemInstruction = systemInstruction || "";
        const providerContext = `\n\n[Active AI Engine Context: You are currently running on the "${provider}" provider backend. If the user asks which AI provider, model, engine, or backend you are currently using, you MUST truthfully tell them that you are currently using ${provider}.]`;
        if (activeSystemInstruction) {
          activeSystemInstruction += providerContext;
        } else {
          activeSystemInstruction = providerContext;
        }

        if (provider === "gemini") {
          resultText = await callGemini(messages, activeSystemInstruction, image, responseSchema, timeoutMs, signal);
        } else if (provider === "openai") {
          resultText = await callOpenAI(messages, activeSystemInstruction, image, responseSchema, timeoutMs, signal);
        } else if (provider === "groq") {
          resultText = await callGroq(messages, activeSystemInstruction, image, responseSchema, timeoutMs, signal);
        } else if (provider === "openrouter") {
          resultText = await callOpenRouter(messages, activeSystemInstruction, image, responseSchema, timeoutMs, signal);
        } else if (provider === "anthropic") {
          resultText = await callAnthropic(messages, activeSystemInstruction, image, responseSchema, timeoutMs, signal);
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
        
        success = true;
        finalResult = {
          text: resultText,
          providerUsed: provider
        };
        break;
      } catch (err: any) {
        const errMsg = err.message || String(err);
        if (provider === "anthropic" && (errMsg.includes("credit balance") || errMsg.includes("Credit balance") || errMsg.includes("billing") || errMsg.includes("Billing") || errMsg.includes("status 400"))) {
          console.info("[AIService] Disabling Anthropic provider dynamically due to credit balance/billing failure.");
          isAnthropicDisabled = true;
        }
        console.info(`[AIService] Provider ${provider} failed, attempting fallback:`, err.message || err);
        lastError = err;
        
        // Propagate immediate aborts
        if (err?.name === "AbortError" || err?.message?.includes("cancelled") || signal?.aborted) {
          throw err;
        }
      }
    }

    if (finalResult) {
      return finalResult;
    }
    throw new Error(`All configured AI Providers failed. Last error: ${lastError?.message || lastError}`);
  } catch (err: any) {
    lastError = err;
    throw err;
  } finally {
    const responseTimeMs = Date.now() - startTime;
    // Log details of request
    const errorMsg = success ? null : (lastError?.message || String(lastError));
    firebaseDB.saveAIRequestLog({
      id: `ailog-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
      provider: providerUsed,
      endpoint: messages.length > 1 ? "chat" : "solve",
      responseTimeMs,
      success,
      error: errorMsg,
      timestamp: new Date().toISOString()
    }).catch(e => console.error("[AIService] Failed to write AI request metrics log:", e));
  }
}

// ----------------------------------------------------
// PROVIDER IMPLEMENTATIONS
// ----------------------------------------------------

async function callGemini(
  messages: AIMessage[],
  systemInstruction?: string,
  image?: string,
  responseSchema?: any,
  timeoutMs?: number,
  signal?: AbortSignal
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
      return await withTimeoutAndSignal(
        async (mergedSignal) => {
          const response = await gemini.models.generateContent({
            model: modelName,
            contents,
            config: {
              ...config,
              httpOptions: {
                headers: {
                  "User-Agent": "aistudio-build",
                },
                signal: mergedSignal
              }
            }
          });
          if (response.text) return response.text;
          throw new Error("Empty text response received from Gemini SDK.");
        },
        timeoutMs || DEFAULT_TIMEOUT_MS,
        `Gemini API request timed out after ${Math.round((timeoutMs || DEFAULT_TIMEOUT_MS) / 1000)} seconds for model: ${modelName}`,
        signal
      );
    }, 3, 1000, (err, attempt) => {
      console.info(`[AIService] Gemini attempt ${attempt} failed with error: ${err.message || err}. Retrying...`);
    }, signal);
  };

  try {
    return await executeCall("gemini-3.5-flash");
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (
      errMsg.includes("429") ||
      errMsg.includes("RESOURCE_EXHAUSTED") ||
      errMsg.includes("quota") ||
      errMsg.includes("503") ||
      errMsg.includes("UNAVAILABLE") ||
      errMsg.includes("high demand") ||
      errMsg.includes("timed out") ||
      errMsg.includes("timeout")
    ) {
      console.info(`[AIService] gemini-3.5-flash failed with: ${errMsg}. Instantly falling back to gemini-3.1-flash-lite...`);
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
  responseSchema?: any,
  timeoutMs?: number,
  signal?: AbortSignal
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
    return await withTimeoutAndSignal(
      async (mergedSignal) => {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify(body),
          signal: mergedSignal
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`OpenAI API returned status ${response.status}: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
      },
      timeoutMs || DEFAULT_TIMEOUT_MS,
      `OpenAI API request timed out after ${Math.round((timeoutMs || DEFAULT_TIMEOUT_MS) / 1000)} seconds.`,
      signal
    );
  }, 3, 1000, (err, attempt) => {
    console.info(`[AIService] OpenAI attempt ${attempt} failed with error: ${err.message || err}. Retrying...`);
  }, signal);
}

async function callGroq(
  messages: AIMessage[],
  systemInstruction?: string,
  image?: string,
  responseSchema?: any,
  timeoutMs?: number,
  signal?: AbortSignal
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
    return await withTimeoutAndSignal(
      async (mergedSignal) => {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify(body),
          signal: mergedSignal
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Groq API returned status ${response.status}: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
      },
      timeoutMs || DEFAULT_TIMEOUT_MS,
      `Groq API request timed out after ${Math.round((timeoutMs || DEFAULT_TIMEOUT_MS) / 1000)} seconds.`,
      signal
    );
  }, 3, 1000, (err, attempt) => {
    console.info(`[AIService] Groq attempt ${attempt} failed with error: ${err.message || err}. Retrying...`);
  }, signal);
}

async function callOpenRouter(
  messages: AIMessage[],
  systemInstruction?: string,
  image?: string,
  responseSchema?: any,
  timeoutMs?: number,
  signal?: AbortSignal
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
    return await withTimeoutAndSignal(
      async (mergedSignal) => {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": "https://studymate-ai.com",
            "X-Title": "StudyMate AI"
          },
          body: JSON.stringify(body),
          signal: mergedSignal
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`OpenRouter API returned status ${response.status}: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
      },
      timeoutMs || DEFAULT_TIMEOUT_MS,
      `OpenRouter API request timed out after ${Math.round((timeoutMs || DEFAULT_TIMEOUT_MS) / 1000)} seconds.`,
      signal
    );
  }, 3, 1000, (err, attempt) => {
    console.info(`[AIService] OpenRouter attempt ${attempt} failed with error: ${err.message || err}. Retrying...`);
  }, signal);
}

async function callAnthropic(
  messages: AIMessage[],
  systemInstruction?: string,
  image?: string,
  responseSchema?: any,
  timeoutMs?: number,
  signal?: AbortSignal
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
    return await withTimeoutAndSignal(
      async (mergedSignal) => {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify(body),
          signal: mergedSignal
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Anthropic API returned status ${response.status}: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.content?.[0]?.text || "";
      },
      timeoutMs || DEFAULT_TIMEOUT_MS,
      `Anthropic API request timed out after ${Math.round((timeoutMs || DEFAULT_TIMEOUT_MS) / 1000)} seconds.`,
      signal
    );
  }, 3, 1000, (err, attempt) => {
    console.info(`[AIService] Anthropic attempt ${attempt} failed with error: ${err.message || err}. Retrying...`);
  }, signal);
}

// ==========================================
// Centralized Multi-Provider Image Generator
// ==========================================

export interface GenerateImageOptions {
  prompt: string;
  category?:
    | "text-to-image"
    | "educational-diagram"
    | "biology"
    | "chemistry"
    | "physics"
    | "geography"
    | "mindmap"
    | "flowchart"
    | "chart"
    | "ai-art"
    | "logo"
    | "icon"
    | "poster";
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  quality?: "standard" | "hd";
  preferredProvider?: "auto" | "gemini" | "openai" | "fal";
  signal?: AbortSignal;
}

export interface GenerateImageResult {
  imageUrl: string;
  providerUsed: "gemini" | "openai" | "fal";
  revisedPrompt?: string;
  cached?: boolean;
}

const imageCache = new Map<string, { imageUrl: string; providerUsed: "gemini" | "openai" | "fal"; timestamp: number }>();
const IMAGE_CACHE_TTL_MS = 30 * 60 * 1000;

export function enhancePromptByCategory(prompt: string, category?: string): string {
  if (!prompt || typeof prompt !== "string") return "";
  const cleanPrompt = prompt.trim();
  switch (category) {
    case "educational-diagram":
      return `High quality educational diagram, white background, crisp vector styling, clearly labeled components, informative educational graphic: ${cleanPrompt}`;
    case "biology":
      return `Detailed scientific biology illustration, anatomical precision, clean white vector background, labeled scientific diagram: ${cleanPrompt}`;
    case "chemistry":
      return `Chemistry scientific diagram, molecular structures and laboratory glassware visual illustration, crisp vector style: ${cleanPrompt}`;
    case "physics":
      return `Physics visual diagram, force vectors, field lines and physical principles annotated clearly, white background: ${cleanPrompt}`;
    case "geography":
      return `Detailed geography map graphic, topographic features, clean legend and regional details, high resolution: ${cleanPrompt}`;
    case "mindmap":
      return `Structured colorful mind map diagram, central concept node with organized branching subtopics, modern UI infographic style: ${cleanPrompt}`;
    case "flowchart":
      return `Clean modern flowchart diagram, clear process nodes, directional arrows, organized step-by-step logic layout: ${cleanPrompt}`;
    case "chart":
      return `High resolution infographic data chart, clear metrics visual typography, modern corporate design: ${cleanPrompt}`;
    case "ai-art":
      return `Cinematic AI masterpiece artwork, vibrant digital painting, 8k resolution, artistic lighting: ${cleanPrompt}`;
    case "logo":
      return `Minimalist modern vector logo design, clean shapes, isolated white background, professional branding: ${cleanPrompt}`;
    case "icon":
      return `Modern 3D flat app icon design, high contrast, clean centered graphic, isolated background: ${cleanPrompt}`;
    case "poster":
      return `Graphic design educational poster, bold visual layout, balanced typography, vibrant color scheme: ${cleanPrompt}`;
    default:
      return cleanPrompt;
  }
}

export async function generateImageGemini(
  prompt: string,
  aspectRatio = "1:1",
  quality = "standard",
  signal?: AbortSignal
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !isValidKey(apiKey)) throw new Error("Gemini API key is not configured");

  const gemini = getGeminiClient();
  if (gemini && typeof (gemini.models as any).generateImages === "function") {
    try {
      const sdkRes = await (gemini.models as any).generateImages({
        model: "imagen-3.0-generate-002",
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: "image/jpeg",
          aspectRatio: aspectRatio,
        },
      });
      const b64 = sdkRes?.generatedImages?.[0]?.image?.imageBytes;
      if (b64) return `data:image/jpeg;base64,${b64}`;
    } catch (e: any) {
      console.warn("[AIService] Gemini SDK generateImages failed, falling back to REST API:", e.message);
    }
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: aspectRatio,
        outputOptions: { mimeType: "image/jpeg" }
      }
    }),
    signal
  }, 35000);

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Gemini Imagen HTTP ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const bytes = data?.predictions?.[0]?.bytesBase64Encoded;
  if (!bytes) throw new Error("No image data returned from Gemini Imagen");
  return `data:image/jpeg;base64,${bytes}`;
}

export async function generateImageOpenAI(
  prompt: string,
  aspectRatio = "1:1",
  quality = "standard",
  signal?: AbortSignal
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !isValidKey(apiKey)) throw new Error("OpenAI API key is not configured");

  let size = "1024x1024";
  if (aspectRatio === "16:9" || aspectRatio === "4:3") size = "1792x1024";
  else if (aspectRatio === "9:16" || aspectRatio === "3:4") size = "1024x1792";

  const response = await fetchWithTimeout("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: size,
      quality: quality === "hd" ? "hd" : "standard",
      response_format: "url"
    }),
    signal
  }, 40000);

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(`OpenAI DALL-E HTTP ${response.status}: ${errData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const url = data?.data?.[0]?.url;
  if (!url) throw new Error("No image URL returned from OpenAI DALL-E 3");
  return url;
}

export async function generateImageFal(
  prompt: string,
  aspectRatio = "1:1",
  quality = "standard",
  signal?: AbortSignal
): Promise<string> {
  const apiKey = process.env.FAL_KEY || process.env.FAL_API_KEY;
  if (!apiKey || !isValidKey(apiKey)) throw new Error("Fal.ai API key is not configured");

  let imageSize = "square_hd";
  if (aspectRatio === "16:9") imageSize = "landscape_16_9";
  else if (aspectRatio === "9:16") imageSize = "portrait_16_9";
  else if (aspectRatio === "4:3") imageSize = "landscape_4_3";
  else if (aspectRatio === "3:4") imageSize = "portrait_4_3";

  const response = await fetchWithTimeout("https://fal.run/fal-ai/flux/schnell", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Key ${apiKey.trim()}`
    },
    body: JSON.stringify({
      prompt: prompt,
      image_size: imageSize,
      num_inference_steps: quality === "hd" ? 6 : 4,
      enable_safety_checker: true
    }),
    signal
  }, 35000);

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Fal.ai HTTP ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const url = data?.images?.[0]?.url;
  if (!url) throw new Error("No image URL returned from Fal.ai Flux");
  return url;
}

export async function generateImageWithFallback(
  options: GenerateImageOptions
): Promise<GenerateImageResult> {
  const { prompt, category, aspectRatio = "1:1", quality = "standard", preferredProvider = "auto", signal } = options;
  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    throw new Error("Prompt is required for image generation.");
  }

  const enhancedPrompt = enhancePromptByCategory(prompt, category);
  const cacheKey = `${enhancedPrompt}_${aspectRatio}_${quality}`;

  const cached = imageCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < IMAGE_CACHE_TTL_MS)) {
    console.log(`[AIService Image] Cache HIT for prompt: "${enhancedPrompt.substring(0, 40)}..."`);
    return {
      imageUrl: cached.imageUrl,
      providerUsed: cached.providerUsed,
      revisedPrompt: enhancedPrompt,
      cached: true
    };
  }

  const configured = getConfiguredImageProviders();
  const errors: string[] = [];

  let providerQueue: ("gemini" | "openai" | "fal")[] = [];

  if (preferredProvider !== "auto" && configured[preferredProvider]) {
    providerQueue.push(preferredProvider);
  }

  // Priority: Gemini -> OpenAI -> Fal.ai
  ["gemini", "openai", "fal"].forEach((p) => {
    const prov = p as "gemini" | "openai" | "fal";
    if (!providerQueue.includes(prov) && configured[prov]) {
      providerQueue.push(prov);
    }
  });

  if (providerQueue.length === 0) {
    throw new Error("No image generation API key is configured. Please configure GEMINI_API_KEY, OPENAI_API_KEY, or FAL_KEY.");
  }

  for (const provider of providerQueue) {
    try {
      console.log(`[AIService Image] Attempting image generation with provider: ${provider}`);
      let imageUrl = "";
      if (provider === "gemini") {
        imageUrl = await generateImageGemini(enhancedPrompt, aspectRatio, quality, signal);
      } else if (provider === "openai") {
        imageUrl = await generateImageOpenAI(enhancedPrompt, aspectRatio, quality, signal);
      } else if (provider === "fal") {
        imageUrl = await generateImageFal(enhancedPrompt, aspectRatio, quality, signal);
      }

      if (imageUrl) {
        imageCache.set(cacheKey, {
          imageUrl,
          providerUsed: provider,
          timestamp: Date.now()
        });

        return {
          imageUrl,
          providerUsed: provider,
          revisedPrompt: enhancedPrompt
        };
      }
    } catch (err: any) {
      const errMsg = `${provider.toUpperCase()} failed: ${err.message || err}`;
      console.warn(`[AIService Image] ${errMsg}`);
      errors.push(errMsg);
    }
  }

  throw new Error(`All image generation attempts failed:\n${errors.join("\n")}`);
}

// ----------------------------------------------------
// AI IMAGE GENERATION ROUTER & PROVIDERS (Gemini, OpenAI, Fal.ai)
// ----------------------------------------------------

export function enhancePromptForCategory(prompt: string, category?: string, quality?: string): string {
  let base = prompt.trim();
  const qualitySuffix = quality === "hd" ? ", ultra high definition, 8k resolution, crisp vector rendering, highly detailed" : "";

  switch (category) {
    case "Educational Diagrams":
      return `Clear academic textbook diagram, labeled educational illustration, clean white background, vector graphic style, accurate and professional: ${base}${qualitySuffix}`;
    case "Biology Diagrams":
      return `Accurate scientific biology diagram, anatomy and organ systems, clearly labeled parts, high contrast educational illustration: ${base}${qualitySuffix}`;
    case "Chemistry Illustrations":
      return `Detailed chemistry molecular structure, chemical reaction mechanism diagram, laboratory glassware, clean scientific illustration: ${base}${qualitySuffix}`;
    case "Physics Diagrams":
      return `Physics optics, mechanics, or circuit vector diagram, clear force vectors and labeled parameters, educational textbook style: ${base}${qualitySuffix}`;
    case "Geography Maps":
      return `Detailed geographical map illustration, topography, rivers, boundaries, cartographic labels, clean layout: ${base}${qualitySuffix}`;
    case "Mind Maps":
      return `Visually structured mind map, central concept with branching topic nodes, clean typography, color-coded branches, high legibility: ${base}${qualitySuffix}`;
    case "Flowcharts":
      return `Clean algorithmic flowchart, process diagram with decision nodes, arrows, structured workflow layout, high contrast: ${base}${qualitySuffix}`;
    case "Charts":
      return `Clean infographics data chart, bar chart or pie graph, clear labels and legend, modern presentation design: ${base}${qualitySuffix}`;
    case "AI Art":
      return `Stunning artistic masterpiece, expressive lighting, rich colors, intricate details, artistic concept: ${base}${qualitySuffix}`;
    case "Logos":
      return `Minimalist modern logo design, clean vector graphic, solid flat colors, isolated on white background, iconic emblem: ${base}${qualitySuffix}`;
    case "Icons":
      return `App icon design, modern clean UI icon, flat design, smooth gradient, sharp outline, isolated on neutral background: ${base}${qualitySuffix}`;
    case "Posters":
      return `Eye-catching promotional poster design, strong typography, dramatic layout, vibrant color palette, high impact: ${base}${qualitySuffix}`;
    default:
      return `${base}${qualitySuffix}`;
  }
}

async function callGeminiImageGen(
  prompt: string,
  aspectRatio: string = "1:1",
  timeoutMs?: number,
  signal?: AbortSignal
): Promise<string> {
  const gemini = getGeminiClient();
  if (!gemini) throw new Error("Gemini API key is not configured.");

  let geminiRatio = "1:1";
  if (aspectRatio === "16:9") geminiRatio = "16:9";
  else if (aspectRatio === "9:16") geminiRatio = "9:16";
  else if (aspectRatio === "3:4" || aspectRatio === "4:3") geminiRatio = aspectRatio;

  return await retryWithBackoff(async () => {
    return await withTimeoutAndSignal(
      async (mergedSignal) => {
        const response = await (gemini.models as any).generateImages({
          model: "imagen-3.0-generate-002",
          prompt,
          config: {
            numberOfImages: 1,
            aspectRatio: geminiRatio,
            outputMimeType: "image/jpeg",
          }
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
          const imgObj = response.generatedImages[0];
          if (imgObj.image?.imageBytes) {
            return `data:image/jpeg;base64,${imgObj.image.imageBytes}`;
          }
        }
        throw new Error("Gemini Image SDK returned empty response.");
      },
      timeoutMs || 45000,
      "Gemini Image request timed out.",
      signal
    );
  }, 2, 1000, undefined, signal);
}

async function callOpenAIImageGen(
  prompt: string,
  aspectRatio: string = "1:1",
  quality: string = "standard",
  timeoutMs?: number,
  signal?: AbortSignal
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API key is not configured.");

  let size: "1024x1024" | "1024x1792" | "1792x1024" = "1024x1024";
  if (aspectRatio === "9:16" || aspectRatio === "3:4") size = "1024x1792";
  if (aspectRatio === "16:9" || aspectRatio === "4:3") size = "1792x1024";

  return await retryWithBackoff(async () => {
    return await withTimeoutAndSignal(
      async (mergedSignal) => {
        const response = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt,
            n: 1,
            size,
            quality: quality === "hd" ? "hd" : "standard",
            response_format: "b64_json"
          }),
          signal: mergedSignal
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(`OpenAI DALL-E returned status ${response.status}: ${errData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        if (data.data?.[0]?.b64_json) {
          return `data:image/png;base64,${data.data[0].b64_json}`;
        }
        if (data.data?.[0]?.url) {
          return data.data[0].url;
        }
        throw new Error("OpenAI DALL-E returned no image content.");
      },
      timeoutMs || 50000,
      "OpenAI DALL-E request timed out.",
      signal
    );
  }, 2, 1000, undefined, signal);
}

async function callFalImageGen(
  prompt: string,
  aspectRatio: string = "1:1",
  timeoutMs?: number,
  signal?: AbortSignal
): Promise<string> {
  const falKey = process.env.FAL_KEY || process.env.FAL_API_KEY;
  if (!falKey) throw new Error("Fal.ai API key is not configured.");

  let image_size = "square_hd";
  if (aspectRatio === "16:9" || aspectRatio === "4:3") image_size = "landscape_16_9";
  if (aspectRatio === "9:16" || aspectRatio === "3:4") image_size = "portrait_16_9";

  return await retryWithBackoff(async () => {
    return await withTimeoutAndSignal(
      async (mergedSignal) => {
        const response = await fetch("https://fal.run/fal-ai/flux/schnell", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Key ${falKey}`
          },
          body: JSON.stringify({
            prompt,
            image_size,
            num_images: 1,
            enable_safety_checker: true
          }),
          signal: mergedSignal
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(`Fal.ai API returned status ${response.status}: ${errData.detail || errData.error || response.statusText}`);
        }

        const data = await response.json();
        if (data.images && data.images.length > 0 && data.images[0].url) {
          return data.images[0].url;
        }
        throw new Error("Fal.ai returned no valid image URL.");
      },
      timeoutMs || 45000,
      "Fal.ai image generation request timed out.",
      signal
    );
  }, 2, 1000, undefined, signal);
}

// Centralized AI Image Router with automatic fallback chain: Gemini -> OpenAI -> Fal.ai
export async function executeImageGenRequest(options: ImageGenOptions): Promise<ImageGenResponse> {
  const {
    prompt,
    category,
    aspectRatio = "1:1",
    quality = "standard",
    preferredProvider = "auto",
    timeoutMs,
    signal
  } = options;

  if (!prompt || !prompt.trim()) {
    throw new Error("A prompt is required for image generation.");
  }

  const revisedPrompt = enhancePromptForCategory(prompt, category, quality);
  const config = getConfiguredImageProviders();

  // Strict fallback sequence requested: Gemini -> OpenAI -> Fal.ai
  const fallbackOrder: AIImageProvider[] = ["gemini", "openai", "fal"];
  let providersToTry: AIImageProvider[] = [];

  if (preferredProvider !== "auto" && preferredProvider !== undefined) {
    providersToTry.push(preferredProvider);
    fallbackOrder.forEach(p => {
      if (p !== preferredProvider) providersToTry.push(p);
    });
  } else {
    providersToTry = [...fallbackOrder];
  }

  // Filter based on configured keys
  providersToTry = providersToTry.filter(p => config[p as keyof typeof config]);

  if (providersToTry.length === 0) {
    throw new Error("No Image Generation AI providers are configured. Please configure GEMINI_API_KEY, OPENAI_API_KEY, or FAL_KEY in Secrets Settings.");
  }

  let lastError: any = null;
  const startTime = Date.now();
  let providerUsed: AIImageProvider = preferredProvider;

  for (const provider of providersToTry) {
    if (signal?.aborted) {
      throw new Error("Image generation request was cancelled by user.");
    }
    try {
      console.log(`[AIService] Generating image using provider: ${provider}`);
      providerUsed = provider;
      let imageUrl = "";

      if (provider === "gemini") {
        imageUrl = await callGeminiImageGen(revisedPrompt, aspectRatio, timeoutMs, signal);
      } else if (provider === "openai") {
        imageUrl = await callOpenAIImageGen(revisedPrompt, aspectRatio, quality, timeoutMs, signal);
      } else if (provider === "fal") {
        imageUrl = await callFalImageGen(revisedPrompt, aspectRatio, timeoutMs, signal);
      }

      if (!imageUrl) {
        throw new Error(`Provider ${provider} returned empty image output.`);
      }

      console.log(`[AIService] Successfully generated image with provider: ${provider}`);

      firebaseDB.saveAIRequestLog({
        id: `imglog-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
        provider,
        endpoint: "generate-image",
        responseTimeMs: Date.now() - startTime,
        success: true,
        timestamp: new Date().toISOString()
      }).catch(e => console.error("[AIService] Failed to write image request log:", e));

      return {
        imageUrl,
        providerUsed: provider,
        revisedPrompt
      };
    } catch (err: any) {
      console.warn(`[AIService] Image generation provider ${provider} failed, trying next provider:`, err.message || err);
      lastError = err;
      if (err?.name === "AbortError" || err?.message?.includes("cancelled") || signal?.aborted) {
        throw err;
      }
    }
  }

  firebaseDB.saveAIRequestLog({
    id: `imglog-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
    provider: providerUsed,
    endpoint: "generate-image",
    responseTimeMs: Date.now() - startTime,
    success: false,
    error: lastError?.message || String(lastError),
    timestamp: new Date().toISOString()
  }).catch(e => console.error("[AIService] Failed to write image request log:", e));

  throw new Error(`All image generation providers failed. Last error: ${lastError?.message || lastError}`);
}

export { AIRouter } from "./aiRouter";
export type { AITaskType, AIRouterOptions, AIRouterResult } from "./aiRouter";
