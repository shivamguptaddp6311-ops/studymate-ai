import { GoogleGenAI } from "@google/genai";
import { VideoGenerationInput, NormalizedVideoResult, classifyVideoError, VideoProviderError } from "./types";
import { sleep } from "./httpUtils";

export async function generateVeo(input: VideoGenerationInput): Promise<NormalizedVideoResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new VideoProviderError("veo", "GEMINI_API_KEY environment variable is missing", "not_configured", false);
  }

  const startTime = Date.now();
  const timeoutMs = input.timeoutMs || 240000;

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });

    // Discover available models via SDK model listing
    let availableModels: string[] = [];
    try {
      const listRes = await ai.models.list();
      if (Symbol.asyncIterator in Object(listRes)) {
        for await (const m of (listRes as any)) {
          const mName = m.name || m.model || "";
          if (mName) availableModels.push(mName);
        }
      } else if (Array.isArray((listRes as any)?.models)) {
        for (const m of (listRes as any).models) {
          const mName = m.name || m.model || "";
          if (mName) availableModels.push(mName);
        }
      } else if (Array.isArray(listRes)) {
        for (const m of listRes as any[]) {
          const mName = m.name || m.model || "";
          if (mName) availableModels.push(mName);
        }
      }
    } catch (listErr: any) {
      console.warn(`[Veo] Model list fetch failed: ${listErr?.message || listErr}`);
    }

    const veoModels = availableModels.filter(m => m.toLowerCase().includes("veo"));
    console.info(`[Veo] Discovered ${availableModels.length} models via SDK. Veo candidates: [${veoModels.join(", ")}]`);

    if (veoModels.length === 0 && availableModels.length > 0) {
      throw new VideoProviderError(
        "veo",
        `No Veo video generation models found for this API key/project (available models: ${availableModels.slice(0, 10).join(", ")}...). This is an access/billing/whitelist limitation on the Google Cloud project.`,
        "not_configured",
        false
      );
    }

    const modelCandidates = veoModels.length > 0 ? veoModels : ["models/veo-3.1-generate-preview", "models/veo-3.1-fast-generate-preview", "models/veo-3.1-lite-generate-preview"];
    let operation: any = null;
    let lastError: any = null;

    // Prepare image payload if image-to-video is requested
    let imagePayload: any = undefined;
    if (input.imageBase64) {
      const cleanBase64 = input.imageBase64.includes(",") ? input.imageBase64.split(",")[1] : input.imageBase64;
      imagePayload = {
        imageBytes: cleanBase64,
        mimeType: input.imageMimeType || "image/png"
      };
    }

    for (const modelName of modelCandidates) {
      try {
        const genOptions: any = {
          model: modelName,
          prompt: input.prompt || "Animate with dynamic cinematic movement",
          config: {
            aspectRatio: input.aspectRatio || "16:9",
            numberOfVideos: 1
          }
        };

        if (imagePayload) {
          genOptions.image = imagePayload;
        }

        operation = await ai.models.generateVideos(genOptions);
        if (operation && operation.name) {
          console.info(`[Veo] Successfully initiated video generation operation with model: [${modelName}]`);
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Veo] Model [${modelName}] initialization failed: ${err?.message || err}. Trying next model...`);
      }
    }

    if (!operation) {
      throw lastError || new Error("Failed to initialize Veo video generation across available model candidates");
    }

    while (!operation.done) {
      if (input.signal?.aborted) {
        throw new Error("Veo video generation cancelled by client signal");
      }
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Veo video generation timed out after ${timeoutMs}ms`);
      }
      await sleep(8000, input.signal);
      operation = await ai.operations.getVideosOperation({ operation });
    }

    const video = operation.response?.generatedVideos?.[0];
    if (!video || !video.video?.uri) {
      throw new VideoProviderError("veo", "Veo API completed without returning a valid video URI", "invalid_response", true);
    }

    const rawUri = video.video.uri;
    const videoUrl = rawUri.includes("key=") ? rawUri : `${rawUri}&key=${apiKey}`;

    return {
      success: true,
      provider: "veo",
      jobId: input.jobId || `veo-${Date.now()}`,
      status: "completed",
      videoUrl,
      aspectRatio: input.aspectRatio || "16:9",
      duration: input.duration || "5s",
      prompt: input.prompt,
      createdAt: new Date().toISOString(),
      userEmail: input.userEmail
    };
  } catch (err: any) {
    throw classifyVideoError(err, "veo");
  }
}
