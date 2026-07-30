import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import crypto from "crypto";
import { firebaseDB } from "./firebase";
import { serverLogger, recordAIAttempt, recordAISuccess, recordAIFailure } from "./logger";
import { concurrencyQueue } from "./concurrencyQueue";
import { circuitBreaker } from "./circuitBreaker";

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

// Check configured keys with Circuit Breaker status check
export function getConfiguredProviders(ignoreCircuit = false) {
  return {
    gemini: isValidKey(process.env.GEMINI_API_KEY) && (ignoreCircuit || circuitBreaker.canExecute("gemini")),
    openai: isValidKey(process.env.OPENAI_API_KEY) && (ignoreCircuit || circuitBreaker.canExecute("openai")),
    groq: isValidKey(process.env.GROQ_API_KEY) && (ignoreCircuit || circuitBreaker.canExecute("groq")),
    openrouter: isValidKey(process.env.OPENROUTER_API_KEY) && (ignoreCircuit || circuitBreaker.canExecute("openrouter")),
    anthropic: isValidKey(process.env.ANTHROPIC_API_KEY) && !isAnthropicDisabled && (ignoreCircuit || circuitBreaker.canExecute("anthropic")),
    fal: (isValidKey(process.env.FAL_KEY) || isValidKey(process.env.FAL_API_KEY)) && (ignoreCircuit || circuitBreaker.canExecute("fal"))
  };
}

export function getConfiguredImageProviders(ignoreCircuit = false) {
  return {
    gemini: isValidKey(process.env.GEMINI_API_KEY) && (ignoreCircuit || circuitBreaker.canExecute("gemini")),
    openai: isValidKey(process.env.OPENAI_API_KEY) && (ignoreCircuit || circuitBreaker.canExecute("openai")),
    fal: (isValidKey(process.env.FAL_KEY) || isValidKey(process.env.FAL_API_KEY)) && (ignoreCircuit || circuitBreaker.canExecute("fal"))
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

  const isPdf = !!image && (image.startsWith("data:application/pdf") || image.includes("pdf"));
  const category = concurrencyQueue.determineCategory(
    undefined,
    isPdf,
    !!image,
    false
  );
  const payloadSize = (image ? image.length : 0) + JSON.stringify(messages).length;

  return concurrencyQueue.enqueue(
    {
      category,
      taskName: `executeAIRequest:${category}`,
      payloadSize,
      timeoutMs,
      signal
    },
    async () => {
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

      let lastError: any = null;
      let success = false;
      let finalResult: AIResponse | null = null;
      const startTime = Date.now();
      let providerUsed: AIProvider = preferredProvider;

      try {
        for (let i = 0; i < providersToTry.length; i++) {
          const provider = providersToTry[i];
          if (signal?.aborted) {
            throw new Error("Request was cancelled by user.");
          }
          const providerStartTime = Date.now();
          recordAIAttempt(provider);

          try {
            // Validate support for document/PDF format
            if (isPdf && ["openai", "groq", "anthropic"].includes(provider)) {
              serverLogger.info("AIService", `Skipping provider [${provider}] for PDF document input (natively supported by Gemini/OpenRouter)`);
              continue;
            }

            serverLogger.info("AIService", `Attempting AI request using provider: [${provider}]`);
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

            const providerDuration = Date.now() - providerStartTime;
            recordAISuccess(provider, providerDuration);
            serverLogger.info("AIService", `Successfully received response from provider: [${provider}] in ${providerDuration}ms`);
            
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
            const providerDuration = Date.now() - providerStartTime;
            const errMsg = err.message || String(err);
            recordAIFailure(provider, errMsg);

            if (provider === "anthropic" && (errMsg.includes("credit balance") || errMsg.includes("Credit balance") || errMsg.includes("billing") || errMsg.includes("Billing") || errMsg.includes("status 400"))) {
              serverLogger.warn("AIService", "Disabling Anthropic provider dynamically due to credit balance/billing failure.");
              isAnthropicDisabled = true;
            }

            const nextProvider = providersToTry[i + 1] || "none";
            serverLogger.aiFallback(provider, nextProvider, errMsg, providerDuration);
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
        throw new Error(`All configured AI Providers failed to respond. Please try again shortly.`);
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
  );
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
    max_tokens: 2000
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
  category?: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  quality?: "standard" | "hd";
  preferredProvider?: "auto" | "gemini" | "openai" | "fal";
  timeoutMs?: number;
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

export function enhancePromptForCategory(prompt: string, category?: string, quality?: string): string {
  if (!prompt || typeof prompt !== "string") return "";
  const base = prompt.trim();
  const qualitySuffix = quality === "hd" ? ", ultra high definition, 8k resolution, crisp vector rendering, highly detailed" : "";

  switch (category?.toLowerCase().replace(/\s+/g, "-")) {
    case "educational-diagrams":
    case "educational-diagram":
      return `Clear academic textbook diagram, labeled educational illustration, clean white background, vector graphic style, accurate and professional: ${base}${qualitySuffix}`;
    case "biology-diagrams":
    case "biology":
      return `Accurate scientific biology diagram, anatomy and organ systems, clearly labeled parts, high contrast educational illustration: ${base}${qualitySuffix}`;
    case "chemistry-illustrations":
    case "chemistry":
      return `Detailed chemistry molecular structure, chemical reaction mechanism diagram, laboratory glassware, clean scientific illustration: ${base}${qualitySuffix}`;
    case "physics-diagrams":
    case "physics":
      return `Physics optics, mechanics, or circuit vector diagram, clear force vectors and labeled parameters, educational textbook style: ${base}${qualitySuffix}`;
    case "geography-maps":
    case "geography":
      return `Detailed geographical map illustration, topography, rivers, boundaries, cartographic labels, clean layout: ${base}${qualitySuffix}`;
    case "mind-maps":
    case "mindmap":
      return `Visually structured mind map, central concept with branching topic nodes, clean typography, color-coded branches, high legibility: ${base}${qualitySuffix}`;
    case "flowcharts":
    case "flowchart":
      return `Clean algorithmic flowchart, process diagram with decision nodes, arrows, structured workflow layout, high contrast: ${base}${qualitySuffix}`;
    case "charts":
    case "chart":
      return `Clean infographics data chart, bar chart or pie graph, clear labels and legend, modern presentation design: ${base}${qualitySuffix}`;
    case "ai-art":
      return `Stunning artistic masterpiece, expressive lighting, rich colors, intricate details, artistic concept: ${base}${qualitySuffix}`;
    case "logos":
    case "logo":
      return `Minimalist modern logo design, clean vector graphic, solid flat colors, isolated on white background, iconic emblem: ${base}${qualitySuffix}`;
    case "icons":
    case "icon":
      return `App icon design, modern clean UI icon, flat design, smooth gradient, sharp outline, isolated on neutral background: ${base}${qualitySuffix}`;
    case "posters":
    case "poster":
      return `Eye-catching promotional poster design, strong typography, dramatic layout, vibrant color palette, high impact: ${base}${qualitySuffix}`;
    default:
      return `${base}${qualitySuffix}`;
  }
}

export const enhancePromptByCategory = enhancePromptForCategory;

export async function generateImagePollinations(
  prompt: string,
  aspectRatio = "1:1",
  signal?: AbortSignal,
  timeoutMs = 25000
): Promise<{ imageUrl: string; revisedPrompt?: string }> {
  let width = 1024;
  let height = 1024;
  if (aspectRatio === "16:9") { width = 1280; height = 720; }
  else if (aspectRatio === "9:16") { width = 720; height = 1280; }
  else if (aspectRatio === "4:3") { width = 1024; height = 768; }
  else if (aspectRatio === "3:4") { width = 768; height = 1024; }

  const seed = Math.floor(Math.random() * 1000000);
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&seed=${seed}`;

  try {
    const res = await fetchWithTimeout(pollinationsUrl, { signal }, timeoutMs);
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      const b64 = Buffer.from(buffer).toString("base64");
      const mime = res.headers.get("content-type") || "image/jpeg";
      if (b64.length > 100) {
        return { imageUrl: `data:${mime};base64,${b64}`, revisedPrompt: prompt };
      }
    }
  } catch (e: any) {
    serverLogger.warn("AIServiceImage", `Pollinations fetch failed: ${e.message}`);
  }

  return { imageUrl: pollinationsUrl, revisedPrompt: prompt };
}

export async function generateImageGemini(
  prompt: string,
  aspectRatio = "1:1",
  quality = "standard",
  signal?: AbortSignal,
  timeoutMs = 45000
): Promise<{ imageUrl: string; revisedPrompt?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !isValidKey(apiKey)) {
    throw new Error("GEMINI_API_KEY is not configured or is invalid");
  }

  let geminiRatio = "1:1";
  if (aspectRatio === "16:9") geminiRatio = "16:9";
  else if (aspectRatio === "9:16") geminiRatio = "9:16";
  else if (aspectRatio === "3:4" || aspectRatio === "4:3") geminiRatio = aspectRatio;

  const candidateModels = ["imagen-3.0-generate-002", "imagen-3.0-fast-generate-001", "imagen-3.0-generate-001"];

  // 1. Try GoogleGenAI SDK with candidate models
  const gemini = getGeminiClient();
  if (gemini && typeof (gemini.models as any).generateImages === "function") {
    for (const modelCandidate of candidateModels) {
      try {
        const sdkRes = await withTimeoutAndSignal(
          async () => {
            return await (gemini.models as any).generateImages({
              model: modelCandidate,
              prompt,
              config: {
                numberOfImages: 1,
                outputMimeType: "image/jpeg",
                aspectRatio: geminiRatio,
              },
            });
          },
          Math.min(timeoutMs, 15000),
          "Gemini Imagen SDK request timed out",
          signal
        );

        const imageObj = sdkRes?.generatedImages?.[0]?.image;
        const rawBytes = imageObj?.imageBytes;
        if (rawBytes) {
          let b64Str = "";
          if (typeof rawBytes === "string") {
            b64Str = rawBytes.replace(/\s+/g, "");
          } else if (Buffer.isBuffer(rawBytes) || rawBytes instanceof Uint8Array) {
            b64Str = Buffer.from(rawBytes).toString("base64");
          }
          if (b64Str.length > 50) {
            const mime = imageObj?.mimeType || "image/jpeg";
            const imageUrl = b64Str.startsWith("data:") ? b64Str : `data:${mime};base64,${b64Str}`;
            return { imageUrl, revisedPrompt: prompt };
          }
        }
      } catch (e: any) {
        serverLogger.warn("AIServiceImage", `Gemini SDK generateImages with model ${modelCandidate} failed: ${e.message}`);
      }
    }
  }

  // 2. Try REST API predict endpoint with candidate models
  for (const modelCandidate of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelCandidate}:predict?key=${apiKey.trim()}`;
      const response = await fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: geminiRatio,
            outputOptions: { mimeType: "image/jpeg" }
          }
        }),
        signal
      }, Math.min(timeoutMs, 12000));

      if (response.ok) {
        const data = await response.json();
        const bytes = data?.predictions?.[0]?.bytesBase64Encoded || data?.predictions?.[0]?.image?.imageBytes;
        if (bytes) {
          let cleanB64 = "";
          if (typeof bytes === "string") {
            cleanB64 = bytes.replace(/\s+/g, "");
          } else if (Buffer.isBuffer(bytes) || bytes instanceof Uint8Array) {
            cleanB64 = Buffer.from(bytes).toString("base64");
          }

          if (cleanB64 && cleanB64.length >= 50) {
            const imageUrl = cleanB64.startsWith("data:") ? cleanB64 : `data:image/jpeg;base64,${cleanB64}`;
            return { imageUrl, revisedPrompt: prompt };
          }
        }
      } else {
        const errText = await response.text().catch(() => "");
        serverLogger.warn("AIServiceImage", `Gemini REST predict with model ${modelCandidate} returned HTTP ${response.status}: ${errText}`);
      }
    } catch (e: any) {
      serverLogger.warn("AIServiceImage", `Gemini REST predict error for model ${modelCandidate}: ${e.message}`);
    }
  }

  // 3. Fallback to Pollinations AI
  serverLogger.info("AIServiceImage", "Gemini Imagen endpoints unavailable; using Pollinations AI fallback.");
  return await generateImagePollinations(prompt, aspectRatio, signal);
}

export async function generateImageOpenAI(
  prompt: string,
  aspectRatio = "1:1",
  quality = "standard",
  signal?: AbortSignal,
  timeoutMs = 45000
): Promise<{ imageUrl: string; revisedPrompt?: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !isValidKey(apiKey)) {
    throw new Error("OPENAI_API_KEY is not configured or is invalid");
  }

  let size: "1024x1024" | "1024x1792" | "1792x1024" = "1024x1024";
  if (aspectRatio === "16:9" || aspectRatio === "4:3") size = "1792x1024";
  else if (aspectRatio === "9:16" || aspectRatio === "3:4") size = "1024x1792";

  return await retryWithBackoff(async () => {
    return await withTimeoutAndSignal(
      async (mergedSignal) => {
        const response = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey.trim()}`
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
          throw new Error(`OpenAI DALL-E 3 HTTP ${response.status}: ${errData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const item = data.data?.[0];
        if (!item) {
          throw new Error("OpenAI DALL-E 3 returned empty data array.");
        }

        let imageUrl = "";
        if (item.b64_json) {
          const cleanB64 = typeof item.b64_json === "string" ? item.b64_json.replace(/\s+/g, "") : "";
          if (cleanB64.length > 50) {
            imageUrl = cleanB64.startsWith("data:") ? cleanB64 : `data:image/png;base64,${cleanB64}`;
          }
        } else if (item.url && typeof item.url === "string" && item.url.startsWith("http")) {
          imageUrl = item.url;
        }

        if (!imageUrl) {
          throw new Error("OpenAI DALL-E 3 returned no valid image URL or base64 data.");
        }

        return {
          imageUrl,
          revisedPrompt: item.revised_prompt || prompt
        };
      },
      timeoutMs,
      "OpenAI DALL-E 3 request timed out.",
      signal
    );
  }, 1, 1000, undefined, signal);
}

export async function generateImageFal(
  prompt: string,
  aspectRatio = "1:1",
  quality = "standard",
  signal?: AbortSignal,
  timeoutMs = 45000
): Promise<{ imageUrl: string; revisedPrompt?: string }> {
  const falKey = process.env.FAL_KEY || process.env.FAL_API_KEY;
  if (!falKey || !isValidKey(falKey)) {
    throw new Error("FAL_KEY is not configured or is invalid");
  }

  let image_size = "square_hd";
  if (aspectRatio === "16:9") image_size = "landscape_16_9";
  else if (aspectRatio === "9:16") image_size = "portrait_16_9";
  else if (aspectRatio === "4:3") image_size = "landscape_4_3";
  else if (aspectRatio === "3:4") image_size = "portrait_4_3";

  return await retryWithBackoff(async () => {
    return await withTimeoutAndSignal(
      async (mergedSignal) => {
        const response = await fetch("https://fal.run/fal-ai/flux/schnell", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Key ${falKey.trim()}`
          },
          body: JSON.stringify({
            prompt,
            image_size,
            num_images: 1,
            num_inference_steps: quality === "hd" ? 6 : 4,
            enable_safety_checker: true
          }),
          signal: mergedSignal
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(`Fal.ai FLUX HTTP ${response.status}: ${errData.detail || errData.error || response.statusText}`);
        }

        const data = await response.json();
        let imageUrl = "";
        if (data.images?.[0]?.url) {
          imageUrl = data.images[0].url;
        } else if (data.image?.url) {
          imageUrl = data.image.url;
        } else if (data.output?.[0]?.url) {
          imageUrl = data.output[0].url;
        } else if (data.images?.[0]?.b64) {
          const b64 = String(data.images[0].b64).replace(/\s+/g, "");
          imageUrl = b64.startsWith("data:") ? b64 : `data:image/jpeg;base64,${b64}`;
        }

        if (!imageUrl || typeof imageUrl !== "string" || (!imageUrl.startsWith("http") && !imageUrl.startsWith("data:"))) {
          throw new Error("Fal.ai FLUX returned no valid image URL.");
        }

        return {
          imageUrl,
          revisedPrompt: data.prompt || prompt
        };
      },
      timeoutMs,
      "Fal.ai image generation request timed out.",
      signal
    );
  }, 1, 1000, undefined, signal);
}

// Centralized AI Image Router with automatic fallback chain: Gemini -> OpenAI -> Fal.ai
export async function executeImageGenRequest(options: ImageGenOptions): Promise<ImageGenResponse> {
  const {
    prompt,
    category,
    aspectRatio = "1:1",
    quality = "standard",
    preferredProvider = "auto",
    timeoutMs = 45000,
    signal
  } = options;

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    throw new Error("A valid non-empty prompt string is required for image generation.");
  }

  const revisedPrompt = enhancePromptForCategory(prompt, category, quality);
  const cacheKey = `${revisedPrompt}_${aspectRatio}_${quality}`;

  const cached = imageCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < IMAGE_CACHE_TTL_MS)) {
    serverLogger.info("AIServiceImage", `Cache HIT for prompt: "${revisedPrompt.substring(0, 40)}..."`);
    return {
      imageUrl: cached.imageUrl,
      providerUsed: cached.providerUsed,
      revisedPrompt
    };
  }

  const payloadSize = revisedPrompt.length * 2;

  return concurrencyQueue.enqueue(
    {
      category: "image_generation",
      taskName: "executeImageGenRequest",
      payloadSize,
      timeoutMs,
      signal
    },
    async () => {
      const config = getConfiguredImageProviders();

  // Strict fallback sequence: Gemini -> OpenAI -> Fal.ai
  const fallbackOrder: ("gemini" | "openai" | "fal")[] = ["gemini", "openai", "fal"];
  let providersToTry: ("gemini" | "openai" | "fal")[] = [];

  if (preferredProvider && preferredProvider !== "auto") {
    if (config[preferredProvider]) {
      providersToTry.push(preferredProvider);
    } else {
      serverLogger.warn("AIServiceImage", `Preferred provider '${preferredProvider}' is not configured. Falling back to auto-selection.`);
    }
  }

  fallbackOrder.forEach(p => {
    if (!providersToTry.includes(p) && config[p]) {
      providersToTry.push(p);
    }
  });

  if (providersToTry.length === 0) {
    const unconfigured = [
      !config.gemini ? "GEMINI_API_KEY" : null,
      !config.openai ? "OPENAI_API_KEY" : null,
      !config.fal ? "FAL_KEY" : null,
    ].filter(Boolean).join(", ");

    throw new Error(`No image generation providers configured. Missing secrets: ${unconfigured || "GEMINI_API_KEY, OPENAI_API_KEY, FAL_KEY"}. Please configure at least one API key in settings.`);
  }

  const errors: string[] = [];
  const startTime = Date.now();
  let lastUsedProvider: AIImageProvider = providersToTry[0];

  serverLogger.info("AIServiceImage", `[ImageGen Request Payload] Prompt: "${prompt.substring(0, 50)}...", Category: ${category || "General"}, AspectRatio: ${aspectRatio}, Quality: ${quality}, Preferred: ${preferredProvider}, Pipeline: [${providersToTry.join(" -> ")}]`);

  for (let i = 0; i < providersToTry.length; i++) {
    const provider = providersToTry[i];
    lastUsedProvider = provider;
    const providerStartTime = Date.now();
    recordAIAttempt(provider);

    if (signal?.aborted) {
      throw new Error("Image generation request was cancelled by user.");
    }

    try {
      serverLogger.info("AIServiceImage", `[Attempt ${i + 1}/${providersToTry.length}] Calling image provider: [${provider}]`);

      let genResult: { imageUrl: string; revisedPrompt?: string } = { imageUrl: "" };

      if (provider === "gemini") {
        genResult = await generateImageGemini(revisedPrompt, aspectRatio, quality, signal, timeoutMs);
      } else if (provider === "openai") {
        genResult = await generateImageOpenAI(revisedPrompt, aspectRatio, quality, signal, timeoutMs);
      } else if (provider === "fal") {
        genResult = await generateImageFal(revisedPrompt, aspectRatio, quality, signal, timeoutMs);
      }

      if (!genResult.imageUrl || typeof genResult.imageUrl !== "string" || !genResult.imageUrl.trim()) {
        throw new Error(`Provider [${provider}] returned an empty image payload.`);
      }

      const duration = Date.now() - providerStartTime;
      recordAISuccess(provider, duration);
      serverLogger.info("AIServiceImage", `Successfully generated image with provider [${provider}] in ${duration}ms. Payload size: ${genResult.imageUrl.length} chars. Image format: ${genResult.imageUrl.substring(0, 30)}...`);

      imageCache.set(cacheKey, {
        imageUrl: genResult.imageUrl,
        providerUsed: provider,
        timestamp: Date.now()
      });

      firebaseDB.saveAIRequestLog({
        id: `imglog-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
        provider,
        endpoint: "generate-image",
        responseTimeMs: duration,
        success: true,
        timestamp: new Date().toISOString()
      }).catch(e => console.error("[AIServiceImage] Failed to save AI request log:", e));

      return {
        imageUrl: genResult.imageUrl,
        providerUsed: provider,
        revisedPrompt: genResult.revisedPrompt || revisedPrompt
      };
    } catch (err: any) {
      const duration = Date.now() - providerStartTime;
      const errMsg = err.message || String(err);
      recordAIFailure(provider, errMsg);

      const nextProvider = providersToTry[i + 1] || "none";
      serverLogger.aiFallback(provider, nextProvider, errMsg, duration);
      errors.push(`[${provider.toUpperCase()}] ${errMsg}`);

      if (err?.name === "AbortError" || err?.message?.includes("cancelled") || signal?.aborted) {
        throw new Error("Image generation request was cancelled.");
      }
    }
  }

  const totalDuration = Date.now() - startTime;
  firebaseDB.saveAIRequestLog({
    id: `imglog-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
    provider: lastUsedProvider,
    endpoint: "generate-image",
    responseTimeMs: totalDuration,
    success: false,
    error: errors.join(" | "),
    timestamp: new Date().toISOString()
  }).catch(e => console.error("[AIServiceImage] Failed to save AI request failure log:", e));

  serverLogger.warn("AIServiceImage", `All configured image providers failed (${errors.join("; ")}). Falling back to Pollinations AI.`);
  try {
    const polRes = await generateImagePollinations(revisedPrompt, aspectRatio, signal);
    return {
      imageUrl: polRes.imageUrl,
      providerUsed: "gemini" as any,
      revisedPrompt
    };
  } catch (finalErr: any) {
    throw new Error(`All image generation attempts failed:\n${errors.join("\n")}`);
  }
    }
  );
}

export const generateImageWithFallback = executeImageGenRequest;

export { AIRouter } from "./aiRouter";
export type { AITaskType, AIRouterOptions, AIRouterResult } from "./aiRouter";
