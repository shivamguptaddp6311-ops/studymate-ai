import crypto from "crypto";
import { VideoGenerationInput, NormalizedVideoResult, classifyVideoError, VideoProviderError } from "./types";
import { fetchJson, pollUntil } from "./httpUtils";

const BASE_URL = "https://app-api.pixverse.ai/openapi/v2";

export async function generatePixVerse(input: VideoGenerationInput): Promise<NormalizedVideoResult> {
  const apiKey = process.env.PIXVERSE_API_KEY?.trim();
  if (!apiKey) {
    throw new VideoProviderError("pixverse", "PIXVERSE_API_KEY environment variable is missing", "not_configured", false);
  }

  try {
    const traceId = crypto.randomUUID();
    const headers = {
      "API-KEY": apiKey,
      "Ai-trace-id": traceId
    };

    const submitRes = await fetchJson<{
      ErrCode: number;
      ErrMsg: string;
      Resp?: { video_id: string | number };
    }>(`${BASE_URL}/video/text/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        prompt: input.prompt,
        model: "v5",
        duration: 5,
        quality: input.resolution || "540p",
        aspect_ratio: input.aspectRatio || "16:9",
        generate_audio_switch: input.generateAudio ?? true
      }),
      signal: input.signal,
      timeoutMs: 30000
    });

    if (submitRes.ErrCode !== 0 || !submitRes.Resp?.video_id) {
      throw new VideoProviderError(
        "pixverse",
        `PixVerse submission error: ${submitRes.ErrMsg || "ErrCode " + submitRes.ErrCode}`,
        "provider_error",
        true
      );
    }

    const videoId = submitRes.Resp.video_id;

    const result = await pollUntil<{
      ErrCode: number;
      ErrMsg: string;
      Resp?: { status: number; url?: string; thumbnail_url?: string };
    }>(
      async () => {
        return fetchJson(`${BASE_URL}/video/result/${videoId}`, {
          method: "GET",
          headers: {
            "API-KEY": apiKey,
            "Ai-trace-id": crypto.randomUUID()
          },
          signal: input.signal,
          timeoutMs: 15000
        });
      },
      (res) => {
        if (res.ErrCode !== 0) return true; // Fail fast
        const status = res.Resp?.status;
        return status === 1 || status === 7 || status === 8;
      },
      {
        intervalMs: 4000,
        maxTimeoutMs: input.timeoutMs || 180000,
        signal: input.signal
      }
    );

    if (result.ErrCode !== 0) {
      throw new VideoProviderError(
        "pixverse",
        `PixVerse result polling error: ${result.ErrMsg}`,
        "provider_error",
        true
      );
    }

    const status = result.Resp?.status;

    if (status === 7) {
      throw new VideoProviderError(
        "pixverse",
        "PixVerse generation flagged by content moderation filter",
        "generation_failed",
        false
      );
    }

    if (status === 8) {
      throw new VideoProviderError(
        "pixverse",
        "PixVerse generation failed during rendering pipeline",
        "generation_failed",
        true
      );
    }

    if (status !== 1 || !result.Resp?.url) {
      throw new VideoProviderError(
        "pixverse",
        `PixVerse video status incomplete (status code: ${status})`,
        "invalid_response",
        true
      );
    }

    return {
      success: true,
      provider: "pixverse",
      jobId: input.jobId || `pixverse-${videoId}`,
      status: "completed",
      videoUrl: result.Resp.url,
      thumbnailUrl: result.Resp.thumbnail_url,
      aspectRatio: input.aspectRatio || "16:9",
      resolution: input.resolution || "540p",
      duration: "5s",
      prompt: input.prompt,
      createdAt: new Date().toISOString(),
      userEmail: input.userEmail
    };
  } catch (err: any) {
    throw classifyVideoError(err, "pixverse");
  }
}
