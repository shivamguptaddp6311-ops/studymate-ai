import { AIProvider } from "../aiService";

export type VideoProviderName = "veo" | "pixverse" | "luma" | "kling";

export interface VideoGenerationInput {
  jobId?: string;
  prompt: string;
  imageUrl?: string;
  imageBase64?: string;
  imageMimeType?: string;
  aspectRatio?: "16:9" | "9:16" | "1:1" | "4:3";
  duration?: "5s" | "10s" | "5" | "10";
  resolution?: "540p" | "720p" | "1080p";
  generateAudio?: boolean;
  userEmail?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  preferredProvider?: VideoProviderName;
}

export interface NormalizedVideoResult {
  success: boolean;
  provider: VideoProviderName;
  jobId: string;
  status: "completed" | "failed" | "processing" | "cancelled";
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: string | number;
  aspectRatio?: string;
  resolution?: string;
  prompt: string;
  seed?: number;
  createdAt: string;
  userEmail?: string;
  error?: string;
}

export type VideoErrorReason =
  | "timeout"
  | "rate_limit"
  | "quota_exceeded"
  | "network_error"
  | "provider_error"
  | "invalid_response"
  | "generation_failed"
  | "cancelled"
  | "not_configured";

export class VideoProviderError extends Error {
  public provider: VideoProviderName;
  public reason: VideoErrorReason;
  public retryable: boolean;
  public statusCode?: number;

  constructor(
    provider: VideoProviderName,
    message: string,
    reason: VideoErrorReason,
    retryable = true,
    statusCode?: number
  ) {
    super(`[VideoProvider:${provider}] ${message}`);
    this.name = "VideoProviderError";
    this.provider = provider;
    this.reason = reason;
    this.retryable = retryable;
    this.statusCode = statusCode;
  }
}

export function classifyVideoError(err: any, provider: VideoProviderName): VideoProviderError {
  if (err instanceof VideoProviderError) {
    return err;
  }

  const message = err?.message || String(err || "Unknown video provider error");
  const lowerMsg = message.toLowerCase();
  const status = err?.status || err?.statusCode || err?.response?.status;

  if (err?.name === "AbortError" || lowerMsg.includes("abort") || lowerMsg.includes("cancelled")) {
    return new VideoProviderError(provider, "Request was cancelled or timed out", "cancelled", false);
  }

  if (status === 429 || lowerMsg.includes("rate limit") || lowerMsg.includes("too many requests")) {
    return new VideoProviderError(provider, message, "rate_limit", true, status || 429);
  }

  if (
    status === 402 ||
    lowerMsg.includes("quota") ||
    lowerMsg.includes("insufficient_quota") ||
    lowerMsg.includes("credit") ||
    lowerMsg.includes("out of funds")
  ) {
    return new VideoProviderError(provider, message, "quota_exceeded", false, status || 402);
  }

  if (lowerMsg.includes("timeout") || lowerMsg.includes("timed out") || err?.code === "ETIMEDOUT") {
    return new VideoProviderError(provider, message, "timeout", true, 408);
  }

  if (
    lowerMsg.includes("network") ||
    lowerMsg.includes("fetch failed") ||
    lowerMsg.includes("econnrefused") ||
    err?.code === "ENOTFOUND"
  ) {
    return new VideoProviderError(provider, message, "network_error", true);
  }

  if (lowerMsg.includes("moderation") || lowerMsg.includes("safety") || lowerMsg.includes("flagged")) {
    return new VideoProviderError(provider, `Content moderation failed: ${message}`, "generation_failed", false, status);
  }

  if (lowerMsg.includes("not configured") || lowerMsg.includes("missing api key")) {
    return new VideoProviderError(provider, message, "not_configured", false);
  }

  return new VideoProviderError(provider, message, "provider_error", true, status);
}
