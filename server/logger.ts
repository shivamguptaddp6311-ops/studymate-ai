import { Request, Response, NextFunction } from "express";

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
  lastFailureTime?: string;
  lastErrorReason?: string;
  avgLatencyMs: number;
}

// In-memory metrics store for AI provider health
const aiHealthMetrics: Record<string, AIProviderHealth> = {
  gemini: { provider: "gemini", status: "healthy", totalRequests: 0, successCount: 0, failureCount: 0, avgLatencyMs: 0 },
  openai: { provider: "openai", status: "healthy", totalRequests: 0, successCount: 0, failureCount: 0, avgLatencyMs: 0 },
  groq: { provider: "groq", status: "healthy", totalRequests: 0, successCount: 0, failureCount: 0, avgLatencyMs: 0 },
  anthropic: { provider: "anthropic", status: "healthy", totalRequests: 0, successCount: 0, failureCount: 0, avgLatencyMs: 0 },
  openrouter: { provider: "openrouter", status: "healthy", totalRequests: 0, successCount: 0, failureCount: 0, avgLatencyMs: 0 },
  fal: { provider: "fal", status: "healthy", totalRequests: 0, successCount: 0, failureCount: 0, avgLatencyMs: 0 },
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
  if (!aiHealthMetrics[provider]) {
    aiHealthMetrics[provider] = { provider, status: "healthy", totalRequests: 0, successCount: 0, failureCount: 0, avgLatencyMs: 0 };
  }
  aiHealthMetrics[provider].totalRequests++;
}

export function recordAISuccess(provider: string, durationMs: number) {
  if (!aiHealthMetrics[provider]) {
    recordAIAttempt(provider);
  }
  const m = aiHealthMetrics[provider];
  m.successCount++;
  m.avgLatencyMs = Math.round((m.avgLatencyMs * (m.successCount - 1) + durationMs) / m.successCount);
  
  // Restore status if healthy
  if (m.failureCount > 0 && m.successCount > m.failureCount * 2) {
    m.status = "healthy";
  }
}

export function recordAIFailure(provider: string, reason: string) {
  if (!aiHealthMetrics[provider]) {
    recordAIAttempt(provider);
  }
  const m = aiHealthMetrics[provider];
  m.failureCount++;
  m.lastFailureTime = new Date().toISOString();
  m.lastErrorReason = reason;

  const failureRate = m.failureCount / Math.max(1, m.totalRequests);
  if (failureRate > 0.5 && m.totalRequests >= 3) {
    m.status = "failing";
  } else if (m.failureCount >= 2) {
    m.status = "degraded";
  }
}

export function getAIHealthMetrics(): Record<string, AIProviderHealth> {
  return { ...aiHealthMetrics };
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
