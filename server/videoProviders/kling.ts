import { VideoGenerationInput, NormalizedVideoResult, classifyVideoError, VideoProviderError } from "./types";
import { fetchJson, pollUntil } from "./httpUtils";

const KLING_QUEUE_URL = "https://queue.fal.run/fal-ai/kling-video/v1.6/standard/text-to-video";
const MINIMAX_QUEUE_URL = "https://queue.fal.run/fal-ai/minimax/video-01";

export async function generateKling(input: VideoGenerationInput): Promise<NormalizedVideoResult> {
  const falKey = (process.env.FAL_KEY || process.env.FAL_API_KEY)?.trim();
  if (!falKey) {
    throw new VideoProviderError("kling", "FAL_KEY environment variable is missing", "not_configured", false);
  }

  const headers = {
    Authorization: `Key ${falKey}`
  };

  const durationStr = input.duration?.includes("10") ? "10" : "5";

  // Try Primary: Kling v1.6
  try {
    return await executeFalQueueJob({
      queueUrl: KLING_QUEUE_URL,
      headers,
      body: {
        prompt: input.prompt,
        duration: durationStr,
        generate_audio: input.generateAudio ?? true
      },
      input,
      providerName: "kling"
    });
  } catch (primaryErr: any) {
    const classified = classifyVideoError(primaryErr, "kling");
    
    // If cancelled or unconfigured, do not fallback
    if (classified.reason === "cancelled" || classified.reason === "not_configured") {
      throw classified;
    }

    // Secondary Fallback: MiniMax Video-01 via fal.ai
    console.warn(`[VideoProvider:kling] Kling primary queue failed (${classified.message}). Falling back to MiniMax video-01...`);
    
    try {
      return await executeFalQueueJob({
        queueUrl: MINIMAX_QUEUE_URL,
        headers,
        body: {
          prompt: input.prompt,
          prompt_optimizer: true
        },
        input,
        providerName: "kling"
      });
    } catch (fallbackErr: any) {
      throw classifyVideoError(fallbackErr, "kling");
    }
  }
}

async function executeFalQueueJob(options: {
  queueUrl: string;
  headers: Record<string, string>;
  body: Record<string, any>;
  input: VideoGenerationInput;
  providerName: "kling";
}): Promise<NormalizedVideoResult> {
  const { queueUrl, headers, body, input } = options;

  const submitRes = await fetchJson<{
    request_id?: string;
    status_url?: string;
    response_url?: string;
    status?: string;
    error?: string;
  }>(queueUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: input.signal,
    timeoutMs: 30000
  });

  const requestId = submitRes.request_id;
  const statusUrl = submitRes.status_url;
  const responseUrl = submitRes.response_url;

  if (!statusUrl || !responseUrl) {
    throw new VideoProviderError(
      "kling",
      `fal.ai queue submission failed: ${submitRes.error || "Missing status_url in response"}`,
      "provider_error",
      true
    );
  }

  // Poll status_url until COMPLETED or error
  await pollUntil<{
    status: string;
    error?: string;
  }>(
    async () => {
      return fetchJson(statusUrl, {
        method: "GET",
        headers,
        signal: input.signal,
        timeoutMs: 15000
      });
    },
    (res) => {
      const status = res.status?.toUpperCase();
      return status === "COMPLETED" || status === "FAILED" || status === "CANCELLED";
    },
    {
      intervalMs: 4000,
      maxTimeoutMs: input.timeoutMs || 180000,
      signal: input.signal
    }
  );

  // Fetch response_url for final asset payload
  const finalRes = await fetchJson<{
    video?: { url: string };
    videos?: Array<{ url: string }>;
    error?: string;
  }>(responseUrl, {
    method: "GET",
    headers,
    signal: input.signal,
    timeoutMs: 20000
  });

  const videoUrl = finalRes.video?.url || finalRes.videos?.[0]?.url;

  if (!videoUrl) {
    throw new VideoProviderError(
      "kling",
      `fal.ai completed job but video URL was not present in response payload`,
      "invalid_response",
      true
    );
  }

  return {
    success: true,
    provider: "kling",
    jobId: input.jobId || `kling-${requestId || Date.now()}`,
    status: "completed",
    videoUrl,
    aspectRatio: input.aspectRatio || "16:9",
    duration: `${body.duration || "5"}s`,
    prompt: input.prompt,
    createdAt: new Date().toISOString(),
    userEmail: input.userEmail
  };
}
