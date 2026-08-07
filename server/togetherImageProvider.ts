import { serverLogger } from "./logger";
import { recordImageProviderHealthSuccess, recordImageProviderHealthFailure } from "./aiService";

export interface TogetherImageGenInput {
  prompt: string;
  negative_prompt?: string;
  model?: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | string;
  width?: number;
  height?: number;
  steps?: number;
  guidance?: number;
  seed?: number;
  n?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface TogetherImageGenResult {
  imageUrl: string;
  revisedPrompt?: string;
  images?: string[];
}

export const TOGETHER_SUPPORTED_MODELS = [
  { id: "black-forest-labs/FLUX.1-schnell", name: "FLUX.1 Schnell (Fast & High Quality)", defaultSteps: 4 },
  { id: "black-forest-labs/FLUX.1-dev", name: "FLUX.1 Dev (Maximum Detail)", defaultSteps: 28 },
  { id: "black-forest-labs/FLUX.1-schnell-Free", name: "FLUX.1 Schnell Free", defaultSteps: 4 },
  { id: "stabilityai/stable-diffusion-xl-base-1.0", name: "Stable Diffusion XL 1.0", defaultSteps: 30 },
  { id: "stabilityai/stable-diffusion-2-1", name: "Stable Diffusion 2.1", defaultSteps: 25 }
];

let isTogetherDisabled = false;

export function disableTogetherProvider(reason?: string) {
  if (!isTogetherDisabled) {
    isTogetherDisabled = true;
    serverLogger.warn("TogetherAIProvider", `Together AI provider disabled: ${reason || "Authentication/quota failure"}`);
  }
}

export function getTogetherApiKey(): string | null {
  if (isTogetherDisabled) return null;
  const key = (process.env.TOGETHER_API_KEY || process.env.TOGETHER_KEY)?.trim();
  if (!key || key === "" || key.startsWith("MY_") || key.includes("YOUR_") || key === "null" || key === "undefined" || key.length < 5) {
    return null;
  }
  return key;
}

export function isTogetherKeyConfigured(): boolean {
  if (isTogetherDisabled) return false;
  return getTogetherApiKey() !== null;
}

function calculateDimensions(aspectRatio?: string, explicitWidth?: number, explicitHeight?: number): { width: number; height: number } {
  if (explicitWidth && explicitHeight && explicitWidth > 0 && explicitHeight > 0) {
    return { width: Math.min(2048, Math.max(256, explicitWidth)), height: Math.min(2048, Math.max(256, explicitHeight)) };
  }

  switch (aspectRatio) {
    case "16:9":
      return { width: 1280, height: 720 };
    case "9:16":
      return { width: 720, height: 1280 };
    case "4:3":
      return { width: 1024, height: 768 };
    case "3:4":
      return { width: 768, height: 1024 };
    case "1:1":
    default:
      return { width: 1024, height: 1024 };
  }
}

export async function generateImageTogether(
  options: TogetherImageGenInput
): Promise<TogetherImageGenResult> {
  const apiKey = getTogetherApiKey();
  if (!apiKey) {
    recordImageProviderHealthFailure("together", "TOGETHER_API_KEY is missing or invalid", true);
    throw new Error("Together AI API key (TOGETHER_API_KEY) is missing or invalid on the server.");
  }

  const {
    prompt,
    negative_prompt,
    model = "black-forest-labs/FLUX.1-schnell",
    aspectRatio = "1:1",
    width: explicitWidth,
    height: explicitHeight,
    steps,
    guidance,
    seed,
    n = 1,
    signal,
    timeoutMs = 45000
  } = options;

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    throw new Error("Together AI requires a valid non-empty prompt string.");
  }

  const { width, height } = calculateDimensions(aspectRatio, explicitWidth, explicitHeight);

  // Model-aware steps fallback
  const modelInfo = TOGETHER_SUPPORTED_MODELS.find(m => m.id === model);
  const effectiveSteps = steps && steps > 0 ? steps : (modelInfo?.defaultSteps || (model.includes("schnell") ? 4 : 25));

  const payload: Record<string, any> = {
    model,
    prompt: prompt.trim(),
    width,
    height,
    steps: effectiveSteps,
    n: Math.max(1, Math.min(4, n)),
    response_format: "b64_json"
  };

  if (negative_prompt && negative_prompt.trim()) {
    payload.negative_prompt = negative_prompt.trim();
  }

  if (typeof guidance === "number" && guidance > 0) {
    payload.guidance = guidance;
  }

  if (typeof seed === "number" && !isNaN(seed)) {
    payload.seed = seed;
  }

  serverLogger.info(
    "TogetherAIProvider",
    `[Request] Model: ${model}, Dims: ${width}x${height}, Steps: ${effectiveSteps}, N: ${payload.n}, Prompt: "${prompt.slice(0, 40)}..."`
  );

  let lastError: Error | null = null;
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (signal?.aborted) {
      throw new Error("Together AI image generation request was cancelled.");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const onParentAbort = () => controller.abort();
    if (signal) {
      signal.addEventListener("abort", onParentAbort);
    }

    try {
      const response = await fetch("https://api.together.xyz/v1/images/generations", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": "StudyMate-AI/1.0"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timer);
      if (signal) {
        signal.removeEventListener("abort", onParentAbort);
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        let errorData: any = {};
        try {
          errorData = JSON.parse(errorText);
        } catch (_) {}

        const statusMsg = errorData?.error?.message || errorData?.message || response.statusText || errorText;
        const isAuthError = response.status === 401 || response.status === 403;
        const isRateLimit = response.status === 429;

        if (isAuthError) {
          disableTogetherProvider(`Together AI HTTP ${response.status}: Invalid or unauthorized API key`);
          recordImageProviderHealthFailure("together", `Together AI HTTP ${response.status}: Invalid or unauthorized API key`, true);
          throw new Error(`Together AI Authentication Failed (${response.status}): ${statusMsg || "Please verify TOGETHER_API_KEY."}`);
        }

        if (isRateLimit) {
          recordImageProviderHealthFailure("together", `Together AI HTTP 429 Rate Limit Exceeded`, false);
          throw new Error(`Together AI Rate Limit Exceeded (HTTP 429): ${statusMsg || "Please retry in a moment."}`);
        }

        throw new Error(`Together AI HTTP ${response.status} error: ${statusMsg || "Unknown provider failure"}`);
      }

      const responseData = await response.json();
      const items = responseData?.data;

      if (!Array.isArray(items) || items.length === 0) {
        throw new Error("Together AI returned an empty response array with no image data.");
      }

      const imageUrls: string[] = [];
      for (const item of items) {
        if (item.b64_json) {
          const cleanB64 = typeof item.b64_json === "string" ? item.b64_json.replace(/\s+/g, "") : "";
          if (cleanB64.length > 50) {
            imageUrls.push(cleanB64.startsWith("data:") ? cleanB64 : `data:image/png;base64,${cleanB64}`);
          }
        } else if (item.url && typeof item.url === "string" && item.url.startsWith("http")) {
          imageUrls.push(item.url);
        }
      }

      if (imageUrls.length === 0) {
        throw new Error("Together AI response did not contain valid base64 image data or image URLs.");
      }

      recordImageProviderHealthSuccess("together");
      serverLogger.info("TogetherAIProvider", `Successfully generated ${imageUrls.length} image(s) with model [${model}]`);

      return {
        imageUrl: imageUrls[0],
        revisedPrompt: prompt,
        images: imageUrls
      };

    } catch (err: any) {
      clearTimeout(timer);
      if (signal) {
        signal.removeEventListener("abort", onParentAbort);
      }

      lastError = err;
      const isAbort = err.name === "AbortError" || signal?.aborted;
      const isHardAuth = err.message?.includes("Authentication Failed") || err.message?.includes("Invalid or unauthorized API key");

      if (isHardAuth) {
        disableTogetherProvider(err.message);
        recordImageProviderHealthFailure("together", err.message || "Together AI provider error", true);
        serverLogger.warn("TogetherAIProvider", `Together AI Authentication Failed: ${err.message}. Disabling provider.`);
        throw err;
      }

      serverLogger.warn(
        "TogetherAIProvider",
        `Attempt ${attempt}/${maxAttempts} failed for Together AI: ${err.message || String(err)}`
      );

      if (isAbort) {
        throw new Error("Together AI image generation request timed out or was cancelled.");
      }

      if (isHardAuth || attempt >= maxAttempts) {
        recordImageProviderHealthFailure("together", err.message || "Together AI provider error", isHardAuth);
        throw err;
      }

      // Wait 1 second before retry
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  throw lastError || new Error("Together AI image generation failed after retries.");
}
