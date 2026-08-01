import { VideoGenerationInput, NormalizedVideoResult, classifyVideoError, VideoProviderError } from "./types";
import { fetchJson, pollUntil } from "./httpUtils";

const BASE_URL = "https://api.lumalabs.ai/dream-machine/v1";

export async function generateLuma(input: VideoGenerationInput): Promise<NormalizedVideoResult> {
  const apiKey = process.env.LUMA_API_KEY?.trim();
  if (!apiKey) {
    throw new VideoProviderError("luma", "LUMA_API_KEY environment variable is missing", "not_configured", false);
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`
  };

  try {
    const submitRes = await fetchJson<{
      id: string;
      state: string;
      failure_reason?: string;
    }>(`${BASE_URL}/generations`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        prompt: input.prompt,
        model: "ray-2",
        resolution: input.resolution || "720p",
        duration: input.duration || "5s"
      }),
      signal: input.signal,
      timeoutMs: 30000
    });

    if (!submitRes.id) {
      throw new VideoProviderError("luma", "Luma submission failed to return a generation ID", "invalid_response", true);
    }

    const genId = submitRes.id;

    const result = await pollUntil<{
      id: string;
      state: string;
      assets?: { video?: string; image?: string };
      failure_reason?: string;
    }>(
      async () => {
        return fetchJson(`${BASE_URL}/generations/${genId}`, {
          method: "GET",
          headers,
          signal: input.signal,
          timeoutMs: 15000
        });
      },
      (res) => {
        const state = res.state?.toLowerCase();
        return state === "completed" || state === "failed" || state === "cancelled";
      },
      {
        intervalMs: 4000,
        maxTimeoutMs: input.timeoutMs || 180000,
        signal: input.signal
      }
    );

    const state = result.state?.toLowerCase();
    if (state === "failed") {
      const reason = result.failure_reason || "Luma generation process failed";
      throw new VideoProviderError("luma", reason, "generation_failed", true);
    }

    if (state === "cancelled") {
      throw new VideoProviderError("luma", "Luma generation was cancelled", "cancelled", false);
    }

    if (state !== "completed" || !result.assets?.video) {
      throw new VideoProviderError("luma", "Luma completed without video asset URL", "invalid_response", true);
    }

    return {
      success: true,
      provider: "luma",
      jobId: input.jobId || `luma-${genId}`,
      status: "completed",
      videoUrl: result.assets.video,
      thumbnailUrl: result.assets.image,
      aspectRatio: input.aspectRatio || "16:9",
      resolution: input.resolution || "720p",
      duration: input.duration || "5s",
      prompt: input.prompt,
      createdAt: new Date().toISOString(),
      userEmail: input.userEmail
    };
  } catch (err: any) {
    throw classifyVideoError(err, "luma");
  }
}

export async function cancelLumaGeneration(id: string): Promise<boolean> {
  const apiKey = process.env.LUMA_API_KEY?.trim();
  if (!apiKey || !id) return false;

  try {
    await fetchJson(`${BASE_URL}/generations/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
      timeoutMs: 10000
    });
    return true;
  } catch {
    return false;
  }
}
