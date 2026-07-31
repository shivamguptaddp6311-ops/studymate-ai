import { Request, Response, NextFunction } from "express";
import { circuitBreaker } from "./circuitBreaker";

export type LogLevel = "INFO" | "WARN" | "ERROR" | "PERF" | "AI_FALLBACK";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  tag: string;
  message: string;
  durationMs?: number;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    code?: string;
  };
}

export interface AIProviderHealth {
  provider: string;
  status: "healthy" | "degraded" | "failing" | "disabled";
  totalRequests: number;
  successCount: number;
  failureCount: number;
  timeoutCount: number;
  successRate: number;
  timeoutRate: number;
  lastFailureTime?: string;
  lastErrorReason?: string;
  lastSuccessTime?: string;
  avgLatencyMs: number;
  minLatencyMs?: number;
  maxLatencyMs?: number;
  fallbackCount: number;
  estimatedCostUSD: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

// In-memory metrics store for AI provider health
const aiHealthMetrics: Record<string, AIProviderHealth> = {
  gemini: { provider: "gemini", status: "healthy", totalRequests: 0, successCount: 0, failureCount: 0, timeoutCount: 0, successRate: 100, timeoutRate: 0, avgLatencyMs: 0, minLatencyMs: 0, maxLatencyMs: 0, fallbackCount: 0, estimatedCostUSD: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  openai: { provider: "openai", status: "healthy", totalRequests: 0, successCount: 0, failureCount: 0, timeoutCount: 0, successRate: 100, timeoutRate: 0, avgLatencyMs: 0, minLatencyMs: 0, maxLatencyMs: 0, fallbackCount: 0, estimatedCostUSD: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  groq: { provider: "groq", status: "healthy", totalRequests: 0, successCount: 0, failureCount: 0, timeoutCount: 0, successRate: 100, timeoutRate: 0, avgLatencyMs: 0, minLatencyMs: 0, maxLatencyMs: 0, fallbackCount: 0, estimatedCostUSD: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  anthropic: { provider: "anthropic", status: "healthy", totalRequests: 0, successCount: 0, failureCount: 0, timeoutCount: 0, successRate: 100, timeoutRate: 0, avgLatencyMs: 0, minLatencyMs: 0, maxLatencyMs: 0, fallbackCount: 0, estimatedCostUSD: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  openrouter: { provider: "openrouter", status: "healthy", totalRequests: 0, successCount: 0, failureCount: 0, timeoutCount: 0, successRate: 100, timeoutRate: 0, avgLatencyMs: 0, minLatencyMs: 0, maxLatencyMs: 0, fallbackCount: 0, estimatedCostUSD: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  fal: { provider: "fal", status: "healthy", totalRequests: 0, successCount: 0, failureCount: 0, timeoutCount: 0, successRate: 100, timeoutRate: 0, avgLatencyMs: 0, minLatencyMs: 0, maxLatencyMs: 0, fallbackCount: 0, estimatedCostUSD: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  pollinations: { provider: "pollinations", status: "healthy", totalRequests: 0, successCount: 0, failureCount: 0, timeoutCount: 0, successRate: 100, timeoutRate: 0, avgLatencyMs: 0, minLatencyMs: 0, maxLatencyMs: 0, fallbackCount: 0, estimatedCostUSD: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 },
};

// Safe secret stripper for log sanitization
function sanitizeMetadata(data: any): any {
  if (!data || typeof data !== "object") return data;
  
  if (Array.isArray(data)) {
    return data.slice(0, 20).map(sanitizeMetadata);
  }

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes("key") ||
      lowerKey.includes("secret") ||
      lowerKey.includes("token") ||
      lowerKey.includes("password") ||
      lowerKey.includes("authorization") ||
      lowerKey.includes("cookie")
    ) {
      cleaned[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      cleaned[key] = sanitizeMetadata(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

// Format log entry as structured string
function outputLog(entry: LogEntry) {
  const isDev = process.env.NODE_ENV !== "production";
  
  if (isDev) {
    const colorMap: Record<LogLevel, string> = {
      INFO: "\x1b[36m",      // Cyan
      WARN: "\x1b[33m",      // Yellow
      ERROR: "\x1b[31m",     // Red
      PERF: "\x1b[35m",      // Magenta
      AI_FALLBACK: "\x1b[32m" // Green
    };
    const reset = "\x1b[0m";
    const color = colorMap[entry.level] || reset;
    const durStr = entry.durationMs !== undefined ? ` (${entry.durationMs}ms)` : "";
    
    console.log(
      `${color}[${entry.timestamp}] [${entry.level}] [${entry.tag}]${reset} ${entry.message}${durStr}`,
      entry.metadata ? entry.metadata : "",
      entry.error ? entry.error : ""
    );
  } else {
    // Production JSON output
    console.log(JSON.stringify(entry));
  }
}

export const serverLogger = {
  info(tag: string, message: string, metadata?: Record<string, any>) {
    outputLog({
      timestamp: new Date().toISOString(),
      level: "INFO",
      tag,
      message,
      metadata: sanitizeMetadata(metadata),
    });
  },

  warn(tag: string, message: string, metadata?: Record<string, any>) {
    outputLog({
      timestamp: new Date().toISOString(),
      level: "WARN",
      tag,
      message,
      metadata: sanitizeMetadata(metadata),
    });
  },

  error(tag: string, message: string, err?: any, metadata?: Record<string, any>) {
    const errorObj = err instanceof Error
      ? { name: err.name, message: err.message, code: (err as any).code }
      : err ? { name: "Error", message: String(err) } : undefined;

    outputLog({
      timestamp: new Date().toISOString(),
      level: "ERROR",
      tag,
      message,
      error: errorObj,
      metadata: sanitizeMetadata(metadata),
    });
  },

  perf(tag: string, message: string, durationMs: number, metadata?: Record<string, any>) {
    outputLog({
      timestamp: new Date().toISOString(),
      level: "PERF",
      tag,
      message,
      durationMs,
      metadata: sanitizeMetadata(metadata),
    });
  },

  aiFallback(fromProvider: string, toProvider: string, reason: string, durationMs?: number) {
    recordAIFailure(fromProvider, reason);
    recordAIFallback(fromProvider, toProvider);
    outputLog({
      timestamp: new Date().toISOString(),
      level: "AI_FALLBACK",
      tag: "AIRouter",
      message: `Automatic fallback triggered from [${fromProvider}] -> [${toProvider}]`,
      durationMs,
      metadata: { fromProvider, toProvider, reason: sanitizeMetadata(reason) },
    });
  },
};

// AI Health Metric Tracking Functions
export function recordAIAttempt(provider: string) {
  circuitBreaker.recordAttempt(provider);
  if (!aiHealthMetrics[provider]) {
    aiHealthMetrics[provider] = {
      provider,
      status: "healthy",
      totalRequests: 0,
      successCount: 0,
      failureCount: 0,
      timeoutCount: 0,
      successRate: 100,
      timeoutRate: 0,
      avgLatencyMs: 0,
      minLatencyMs: 0,
      maxLatencyMs: 0,
      fallbackCount: 0,
      estimatedCostUSD: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0
    };
  }
  aiHealthMetrics[provider].totalRequests++;
}

export function recordAISuccess(
  provider: string,
  durationMs: number,
  inputChars: number = 0,
  outputChars: number = 0,
  isImage: boolean = false
) {
  circuitBreaker.recordSuccess(provider, durationMs);
  if (!aiHealthMetrics[provider]) {
    recordAIAttempt(provider);
  }
  const m = aiHealthMetrics[provider];
  m.successCount++;
  m.lastSuccessTime = new Date().toISOString();

  // Latency metrics tracking
  if (m.successCount === 1 || !m.minLatencyMs) {
    m.avgLatencyMs = durationMs;
    m.minLatencyMs = durationMs;
    m.maxLatencyMs = durationMs;
  } else {
    m.avgLatencyMs = Math.round((m.avgLatencyMs * (m.successCount - 1) + durationMs) / m.successCount);
    m.minLatencyMs = Math.min(m.minLatencyMs, durationMs);
    m.maxLatencyMs = Math.max(m.maxLatencyMs, durationMs);
  }

  // Cost & token usage metrics
  if (isImage) {
    let costPerImage = 0.003; // fal default
    if (provider === "openai") costPerImage = 0.04;
    else if (provider === "gemini") costPerImage = 0.03;
    else if (provider === "pollinations") costPerImage = 0;
    m.estimatedCostUSD = Number(((m.estimatedCostUSD || 0) + costPerImage).toFixed(6));
  } else {
    const inputTokens = Math.ceil(inputChars / 4);
    const outputTokens = Math.ceil(outputChars / 4);
    const totalTokens = inputTokens + outputTokens;

    m.promptTokens = (m.promptTokens || 0) + inputTokens;
    m.completionTokens = (m.completionTokens || 0) + outputTokens;
    m.totalTokens = (m.totalTokens || 0) + totalTokens;

    let inputRatePer1k = 0.00015;
    let outputRatePer1k = 0.0006;
    if (provider === "groq") {
      inputRatePer1k = 0.00059;
      outputRatePer1k = 0.00079;
    } else if (provider === "anthropic") {
      inputRatePer1k = 0.0008;
      outputRatePer1k = 0.004;
    }

    const requestCost = (inputTokens / 1000) * inputRatePer1k + (outputTokens / 1000) * outputRatePer1k;
    m.estimatedCostUSD = Number(((m.estimatedCostUSD || 0) + requestCost).toFixed(6));
  }

  m.successRate = m.totalRequests > 0 ? Number(((m.successCount / m.totalRequests) * 100).toFixed(2)) : 100;
  m.timeoutRate = m.totalRequests > 0 ? Number(((m.timeoutCount / m.totalRequests) * 100).toFixed(2)) : 0;

  // Restore status if failure rate low
  const failureRate = m.failureCount / Math.max(1, m.totalRequests);
  if (failureRate < 0.1) {
    m.status = "healthy";
  }
}

export function recordAIFailure(provider: string, reason: string) {
  const isTimeout =
    reason.toLowerCase().includes("timeout") ||
    reason.toLowerCase().includes("timed out") ||
    reason.toLowerCase().includes("cancel");

  circuitBreaker.recordFailure(provider, reason, isTimeout);

  if (!aiHealthMetrics[provider]) {
    recordAIAttempt(provider);
  }
  const m = aiHealthMetrics[provider];
  m.failureCount++;
  if (isTimeout) {
    m.timeoutCount = (m.timeoutCount || 0) + 1;
  }
  m.lastFailureTime = new Date().toISOString();
  m.lastErrorReason = reason;

  m.successRate = m.totalRequests > 0 ? Number(((m.successCount / m.totalRequests) * 100).toFixed(2)) : 0;
  m.timeoutRate = m.totalRequests > 0 ? Number(((m.timeoutCount / m.totalRequests) * 100).toFixed(2)) : 0;

  const failureRate = m.failureCount / Math.max(1, m.totalRequests);
  if (failureRate > 0.5 && m.totalRequests >= 3) {
    m.status = "failing";
  } else if (m.failureCount >= 2) {
    m.status = "degraded";
  }
}

export function recordAIFallback(fromProvider: string, toProvider: string) {
  if (!aiHealthMetrics[fromProvider]) recordAIAttempt(fromProvider);
  if (!aiHealthMetrics[toProvider]) recordAIAttempt(toProvider);

  aiHealthMetrics[fromProvider].fallbackCount = (aiHealthMetrics[fromProvider].fallbackCount || 0) + 1;
  aiHealthMetrics[toProvider].fallbackCount = (aiHealthMetrics[toProvider].fallbackCount || 0) + 1;
}

export function getAIHealthMetrics(): Record<string, AIProviderHealth & { circuitState?: string; cooldownRemainingMs?: number }> {
  const cbMetrics = circuitBreaker.getMetrics();
  const merged: Record<string, AIProviderHealth & { circuitState?: string; cooldownRemainingMs?: number }> = {};

  const allProviders = Array.from(new Set([...Object.keys(aiHealthMetrics), ...Object.keys(cbMetrics)]));

  for (const provider of allProviders) {
    const existing = aiHealthMetrics[provider] || {
      provider,
      status: "healthy",
      totalRequests: 0,
      successCount: 0,
      failureCount: 0,
      timeoutCount: 0,
      successRate: 100,
      timeoutRate: 0,
      avgLatencyMs: 0,
      minLatencyMs: 0,
      maxLatencyMs: 0,
      fallbackCount: 0,
      estimatedCostUSD: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0
    };

    const cb = cbMetrics[provider];
    let calculatedStatus = existing.status;

    if (cb) {
      if (cb.state === "OPEN") {
        calculatedStatus = "failing";
      } else if (cb.state === "HALF_OPEN") {
        calculatedStatus = "degraded";
      }
    }

    const totalReq = Math.max(existing.totalRequests, cb?.totalRequests || 0);
    const succCount = Math.max(existing.successCount, cb?.successCount || 0);
    const failCount = Math.max(existing.failureCount, cb?.failureCount || 0);
    const timeCount = Math.max(existing.timeoutCount, cb?.timeoutCount || 0);

    const succRate = totalReq > 0 ? Number(((succCount / totalReq) * 100).toFixed(2)) : 100;
    const timeRate = totalReq > 0 ? Number(((timeCount / totalReq) * 100).toFixed(2)) : 0;

    merged[provider] = {
      ...existing,
      totalRequests: totalReq,
      successCount: succCount,
      failureCount: failCount,
      timeoutCount: timeCount,
      successRate: succRate,
      timeoutRate: timeRate,
      status: calculatedStatus as any,
      circuitState: cb?.state || "CLOSED",
      cooldownRemainingMs: cb?.cooldownRemainingMs || 0,
      lastFailureTime: cb?.lastFailureTime || existing.lastFailureTime,
      lastErrorReason: cb?.lastErrorReason || existing.lastErrorReason,
      lastSuccessTime: cb?.lastSuccessTime || existing.lastSuccessTime,
      avgLatencyMs: cb?.avgLatencyMs || existing.avgLatencyMs
    };
  }

  return merged;
}

export function getAIHealthDashboardData() {
  const metrics = getAIHealthMetrics();

  let totalRequests = 0;
  let totalSuccess = 0;
  let totalFailures = 0;
  let totalTimeouts = 0;
  let totalCostUSD = 0;
  let totalFallbacks = 0;

  for (const p of Object.values(metrics)) {
    totalRequests += p.totalRequests;
    totalSuccess += p.successCount;
    totalFailures += p.failureCount;
    totalTimeouts += p.timeoutCount;
    totalCostUSD += p.estimatedCostUSD || 0;
    totalFallbacks += p.fallbackCount || 0;
  }

  const globalSuccessRate = totalRequests > 0 ? Number(((totalSuccess / totalRequests) * 100).toFixed(2)) : 100;
  const globalTimeoutRate = totalRequests > 0 ? Number(((totalTimeouts / totalRequests) * 100).toFixed(2)) : 0;

  let overallStatus: "healthy" | "degraded" | "failing" = "healthy";
  if (globalSuccessRate < 80 || totalFailures > 10) {
    overallStatus = "failing";
  } else if (globalSuccessRate < 95 || totalFailures > 2) {
    overallStatus = "degraded";
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    summary: {
      totalRequests,
      totalSuccess,
      totalFailures,
      totalTimeouts,
      globalSuccessRate,
      globalTimeoutRate,
      totalEstimatedCostUSD: Number(totalCostUSD.toFixed(6)),
      totalFallbacks
    },
    providers: metrics
  };
}

// Slow Request & Performance Monitoring Express Middleware
export function slowRequestMiddleware(thresholdMs = 1500) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    res.on("finish", () => {
      const duration = Date.now() - start;
      if (duration >= thresholdMs) {
        serverLogger.perf("SlowAPI", `Slow endpoint detected: ${req.method} ${req.originalUrl} (${duration}ms)`, duration, {
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          ip: req.ip,
          userAgent: req.get("user-agent"),
          memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        });
      }
    });

    next();
  };
}

// Express route handler for receiving client logs safely
export function handleClientLogs(req: Request, res: Response) {
  try {
    const { level, tag, message, error, metadata, userAgent } = req.body || {};
    const clientIp = req.ip || "unknown";

    serverLogger.info("ClientLogIngest", `Received client error from [${clientIp}]`, {
      level,
      clientTag: tag,
      message,
      error,
      metadata,
      userAgent
    });

    return res.status(200).json({ status: "ok" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to ingest log" });
  }
}
