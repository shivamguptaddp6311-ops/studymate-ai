import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import crypto from "crypto";
import { firebaseDB } from "./firebase";

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
