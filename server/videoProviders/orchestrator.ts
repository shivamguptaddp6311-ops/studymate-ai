import { circuitBreaker } from "../circuitBreaker";
import { serverLogger } from "../logger";
import {
  VideoGenerationInput,
  NormalizedVideoResult,
  VideoProviderName,
  VideoProviderError,
  classifyVideoError
} from "./types";
import { generateVeo } from "./veo";
import { generatePixVerse } from "./pixverse";
import { generateLuma, cancelLumaGeneration } from "./luma";
import { generateKling } from "./kling";

interface ActiveVideoJob {
  job: NormalizedVideoResult;
  controller: AbortController;
}

// In-memory store for active job status and abort control
const activeVideoJobs = new Map<string, ActiveVideoJob>();

// Persisted history store for completed/failed video generations
const videoJobHistory = new Map<string, NormalizedVideoResult>();

// List of provider adapter functions in primary fallback order (Veo -> Kling -> PixVerse -> Luma)
const PROVIDER_SEQUENCE: Array<{
  name: VideoProviderName;
  checkConfigured: () => boolean;
  fn: (input: VideoGenerationInput) => Promise<NormalizedVideoResult>;
}> = [
  {
    name: "veo",
    checkConfigured: () => Boolean(process.env.GEMINI_API_KEY?.trim()),
    fn: generateVeo
  },
  {
    name: "kling",
    checkConfigured: () => Boolean((process.env.FAL_KEY || process.env.FAL_API_KEY || process.env.KLING_API_KEY)?.trim()),
    fn: generateKling
  },
  {
    name: "pixverse",
    checkConfigured: () => Boolean(process.env.PIXVERSE_API_KEY?.trim()),
    fn: generatePixVerse
  },
  {
    name: "luma",
    checkConfigured: () => Boolean(process.env.LUMA_API_KEY?.trim()),
    fn: generateLuma
  }
];

export function getConfiguredVideoProviders() {
  return {
    veo: Boolean(process.env.GEMINI_API_KEY?.trim()),
    kling: Boolean((process.env.FAL_KEY || process.env.FAL_API_KEY || process.env.KLING_API_KEY)?.trim()),
    pixverse: Boolean(process.env.PIXVERSE_API_KEY?.trim()),
    luma: Boolean(process.env.LUMA_API_KEY?.trim())
  };
}

export function getGenerationStatus(jobId: string): NormalizedVideoResult | undefined {
  const active = activeVideoJobs.get(jobId);
  if (active) {
    return active.job;
  }
  return videoJobHistory.get(jobId);
}

export function cancelGeneration(jobId: string): boolean {
  const active = activeVideoJobs.get(jobId);
  if (!active) {
    return false;
  }

  active.controller.abort();
  active.job.status = "cancelled";
  active.job.error = "Generation cancelled by user request";
  videoJobHistory.set(jobId, { ...active.job });
  activeVideoJobs.delete(jobId);

  // Best-effort external cancellation for providers supporting API cancel
  if (active.job.provider === "luma") {
    cancelLumaGeneration(jobId).catch(() => {});
  }

  serverLogger.info("VideoOrchestrator", `Cancelled video job [${jobId}]`);
  return true;
}

export function getUserVideoHistory(userEmail?: string): NormalizedVideoResult[] {
  const allHistory = Array.from(videoJobHistory.values());
  if (!userEmail) {
    return allHistory.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const normalizedUser = userEmail.toLowerCase().trim();
  return allHistory
    .filter(
      (job) => job.userEmail && job.userEmail.toLowerCase().trim() === normalizedUser
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function generateVideo(input: VideoGenerationInput): Promise<NormalizedVideoResult> {
  const jobId = input.jobId || `vid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const controller = new AbortController();

  // Handle client-provided cancellation signal
  if (input.signal) {
    input.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  const initialJobState: NormalizedVideoResult = {
    success: false,
    provider: "veo",
    jobId,
    status: "processing",
    prompt: input.prompt,
    createdAt: new Date().toISOString(),
    userEmail: input.userEmail
  };

  activeVideoJobs.set(jobId, { job: initialJobState, controller });

  const executionInput: VideoGenerationInput = {
    ...input,
    jobId,
    signal: controller.signal
  };

  const failureLogs: Array<{ provider: VideoProviderName; reason: string; attempts: number }> = [];

  // Determine provider execution order based on default (Veo primary) or preferredProvider
  const sequenceToRun = [...PROVIDER_SEQUENCE];
  if (input.preferredProvider) {
    const prefIdx = sequenceToRun.findIndex((p) => p.name === input.preferredProvider);
    if (prefIdx > 0) {
      const [preferred] = sequenceToRun.splice(prefIdx, 1);
      sequenceToRun.unshift(preferred);
    }
  }

  try {
    for (const providerSpec of sequenceToRun) {
      const pName = providerSpec.name;

      if (controller.signal.aborted) {
        throw new VideoProviderError(pName, "Video generation job was cancelled", "cancelled", false);
      }

      // Check if provider API key is set
      if (!providerSpec.checkConfigured()) {
        serverLogger.warn("VideoOrchestrator", `Skipping provider [${pName}]: API key not configured.`);
        failureLogs.push({ provider: pName, reason: "API key not configured", attempts: 0 });
        continue;
      }

      // Check Circuit Breaker status
      if (!circuitBreaker.canExecute(pName)) {
        serverLogger.warn("VideoOrchestrator", `Skipping provider [${pName}]: Circuit breaker OPEN.`);
        failureLogs.push({ provider: pName, reason: "Circuit breaker OPEN", attempts: 0 });
        continue;
      }

      let attemptCount = 0;
      const maxAttempts = 2; // Primary attempt + 1 retry if retryable

      while (attemptCount < maxAttempts) {
        attemptCount++;
        if (controller.signal.aborted) {
          throw new VideoProviderError(pName, "Job cancelled prior to provider execution", "cancelled", false);
        }

        serverLogger.info(
          "VideoOrchestrator",
          `Attempting video generation with provider [${pName}] (Attempt ${attemptCount}/${maxAttempts})...`
        );

        circuitBreaker.recordAttempt(pName);
        const providerStartTime = Date.now();

        try {
          // Update active job provider
          const activeItem = activeVideoJobs.get(jobId);
          if (activeItem) {
            activeItem.job.provider = pName;
          }

          const result = await providerSpec.fn(executionInput);
          const durationMs = Date.now() - providerStartTime;

          circuitBreaker.recordSuccess(pName, durationMs);
          serverLogger.info(
            "VideoOrchestrator",
            `Successfully generated video with [${pName}] in ${durationMs}ms (Job ID: ${jobId})`
          );

          const finalResult: NormalizedVideoResult = {
            ...result,
            jobId,
            status: "completed",
            success: true,
            userEmail: input.userEmail
          };

          videoJobHistory.set(jobId, finalResult);
          activeVideoJobs.delete(jobId);
          return finalResult;
        } catch (err: any) {
          const providerErr = classifyVideoError(err, pName);
          const isTimeout = providerErr.reason === "timeout";
          circuitBreaker.recordFailure(pName, providerErr.message, isTimeout);

          serverLogger.warn(
            "VideoOrchestrator",
            `Provider [${pName}] failed on attempt ${attemptCount}/${maxAttempts}: ${providerErr.message} (Reason: ${providerErr.reason}, Retryable: ${providerErr.retryable})`
          );

          if (!providerErr.retryable || attemptCount >= maxAttempts) {
            failureLogs.push({
              provider: pName,
              reason: providerErr.message,
              attempts: attemptCount
            });
            break; // Stop retrying this provider; move to next provider in fallback sequence
          }
        }
      }
    }

    // If loop finishes without returning, all providers failed
    // FIX: AI provider diagnostics
    const allUnconfigured = failureLogs.length > 0 && failureLogs.every((f) => f.reason === "API key not configured");
    const aggregatedReason = allUnconfigured
      ? "No video generation provider is configured — add at least one of GEMINI_API_KEY, FAL_KEY, PIXVERSE_API_KEY, or LUMA_API_KEY"
      : `All video generation providers failed: ${failureLogs.map((f) => `[${f.provider}]: ${f.reason}`).join(" | ")}`;

    const finalFailedJob: NormalizedVideoResult = {
      success: false,
      provider: "veo",
      jobId,
      status: "failed",
      prompt: input.prompt,
      createdAt: new Date().toISOString(),
      userEmail: input.userEmail,
      error: aggregatedReason
    };

    videoJobHistory.set(jobId, finalFailedJob);
    activeVideoJobs.delete(jobId);

    throw new Error(aggregatedReason);
  } catch (fatalErr: any) {
    const errorMsg = fatalErr?.message || String(fatalErr);
    const finalFailedJob: NormalizedVideoResult = {
      success: false,
      provider: "veo",
      jobId,
      status: controller.signal.aborted ? "cancelled" : "failed",
      prompt: input.prompt,
      createdAt: new Date().toISOString(),
      userEmail: input.userEmail,
      error: errorMsg
    };

    videoJobHistory.set(jobId, finalFailedJob);
    activeVideoJobs.delete(jobId);
    throw fatalErr;
  }
}
