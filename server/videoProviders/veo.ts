import { GoogleGenAI } from "@google/genai";
import { VideoGenerationInput, NormalizedVideoResult, classifyVideoError, VideoProviderError } from "./types";
import { sleep } from "./httpUtils";

export async function generateVeo(input: VideoGenerationInput): Promise<NormalizedVideoResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new VideoProviderError("veo", "GEMINI_API_KEY environment variable is missing", "not_configured", false);
  }

  const startTime = Date.now();
  const timeoutMs = input.timeoutMs || 180000;

  try {
    const ai = new GoogleGenAI({ apiKey });

    let operation = await ai.models.generateVideos({
      model: "veo-3.0-fast-generate-001",
      prompt: input.prompt,
      config: {
        aspectRatio: input.aspectRatio || "16:9",
        personGeneration: "dont_allow"
      }
    });

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
