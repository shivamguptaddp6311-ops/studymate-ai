import { Request, Response, NextFunction } from "express";

interface RateLimiterOptions {
  burstMax?: number;
  burstWindowMs?: number;
  sustainedMax?: number;
  sustainedWindowMs?: number;
  keyPrefix?: string;
  excludedPaths?: string[];
}

interface UserRequestRecord {
  timestamps: number[];
}

// In-memory store for rate limiting with timestamp sliding windows
const requestStore = new Map<string, UserRequestRecord>();

// Periodic memory cleanup every 2 minutes
setInterval(() => {
  const now = Date.now();
  const maxWindow = Math.max(
    Number(process.env.AI_RATE_LIMIT_SUSTAINED_WINDOW_MS) || 900000,
    Number(process.env.AI_RATE_LIMIT_BURST_WINDOW_MS) || 60000
  );

  for (const [key, record] of requestStore.entries()) {
    // Keep timestamps within the maximum window
    record.timestamps = record.timestamps.filter(ts => now - ts < maxWindow);
    if (record.timestamps.length === 0) {
      requestStore.delete(key);
    }
  }
}, 120000);

/**
 * Helper to extract client identifier (Authenticated User Email/UID or Client IP)
 */
export function getClientIdentifier(req: Request): string {
  // Extract remote IP address
  const forwarded = req.headers["x-forwarded-for"];
  let ip = "";
  if (typeof forwarded === "string") {
    ip = forwarded.split(",")[0].trim();
  } else if (Array.isArray(forwarded) && forwarded.length > 0) {
    ip = forwarded[0].trim();
  } else {
    ip = req.socket?.remoteAddress || req.ip || "127.0.0.1";
  }

  const user = (req as any).user;
  if (user) {
    const userEmail = typeof user.email === "string" ? user.email.toLowerCase().trim() : "";
    if (userEmail) {
      if (userEmail.startsWith("guest_") || userEmail.endsWith("@guest.studymate.ai")) {
        // Bind guest users to IP + Email to prevent guest token creation quota bypass
        return `guest:${ip}:${userEmail}`;
      }
      return `user:${userEmail}`;
    }
    if (user.uid && typeof user.uid === "string") {
      return `user:${user.uid.trim()}`;
    }
  }

  // Try extracting email/uid from Bearer Authorization header if req.user is not attached yet
  const authHeader = req.headers.authorization;
  if (authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      const parts = token.split(".");
      if (parts.length === 3) {
        const payloadStr = Buffer.from(parts[1], "base64url").toString("utf8");
        const payload = JSON.parse(payloadStr);
        if (payload && payload.email && typeof payload.email === "string") {
          const email = payload.email.toLowerCase().trim();
          if (email.startsWith("guest_") || email.endsWith("@guest.studymate.ai")) {
            return `guest:${ip}:${email}`;
          }
          return `user:${email}`;
        }
      }
    } catch {
      // Ignore token parse error, fallback to IP identifier below
    }
  }

  // Fallback to IP address for anonymous users
  return `ip:${ip}`;
}

/**
 * Creates a rate limiting middleware function
 */
export function createRateLimiter(options: RateLimiterOptions = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if rate limiting is globally disabled via environment
    if (process.env.AI_RATE_LIMIT_ENABLED === "false") {
      return next();
    }

    // Exclude health check and excluded paths
    const reqPath = req.path || req.originalUrl || "";
    const excluded = options.excludedPaths || ["/api/health", "/healthz", "/api/healthz", "/"];
    if (excluded.some(p => reqPath === p || reqPath.startsWith(`${p}/`))) {
      return next();
    }

    const burstMax = options.burstMax ?? (Number(process.env.AI_RATE_LIMIT_BURST_MAX) || 10);
    const burstWindowMs = options.burstWindowMs ?? (Number(process.env.AI_RATE_LIMIT_BURST_WINDOW_MS) || 60000); // 1 minute
    const sustainedMax = options.sustainedMax ?? (Number(process.env.AI_RATE_LIMIT_SUSTAINED_MAX) || 60);
    const sustainedWindowMs = options.sustainedWindowMs ?? (Number(process.env.AI_RATE_LIMIT_SUSTAINED_WINDOW_MS) || 900000); // 15 minutes

    const prefix = options.keyPrefix ? `${options.keyPrefix}:` : "";
    const clientId = getClientIdentifier(req);
    const storeKey = `${prefix}${clientId}`;

    const now = Date.now();
    let record = requestStore.get(storeKey);

    if (!record) {
      record = { timestamps: [] };
      requestStore.set(storeKey, record);
    }

    // Prune timestamps older than sustainedWindowMs
    record.timestamps = record.timestamps.filter(ts => now - ts < sustainedWindowMs);

    // Calculate timestamps inside burst window
    const burstTimestamps = record.timestamps.filter(ts => now - ts < burstWindowMs);

    // Check Burst Limit
    if (burstTimestamps.length >= burstMax) {
      const oldestBurstTs = burstTimestamps[0];
      const retryAfterMs = Math.max(1000, burstWindowMs - (now - oldestBurstTs));
      const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.setHeader("X-RateLimit-Limit", String(burstMax));
      res.setHeader("X-RateLimit-Remaining", "0");
      res.setHeader("X-RateLimit-Reset", String(Math.ceil((now + retryAfterMs) / 1000)));

      return res.status(429).json({
        error: "Too Many Requests",
        message: `AI burst rate limit exceeded. Please wait ${retryAfterSeconds} second(s) before sending more requests.`,
        limitType: "burst",
        retryAfterSeconds,
        burstMax,
        sustainedMax
      });
    }

    // Check Sustained Limit
    if (record.timestamps.length >= sustainedMax) {
      const oldestSustainedTs = record.timestamps[0];
      const retryAfterMs = Math.max(1000, sustainedWindowMs - (now - oldestSustainedTs));
      const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.setHeader("X-RateLimit-Limit", String(sustainedMax));
      res.setHeader("X-RateLimit-Remaining", "0");
      res.setHeader("X-RateLimit-Reset", String(Math.ceil((now + retryAfterMs) / 1000)));

      return res.status(429).json({
        error: "Too Many Requests",
        message: `AI sustained rate limit exceeded. Please wait ${retryAfterSeconds} second(s) before sending more requests.`,
        limitType: "sustained",
        retryAfterSeconds,
        burstMax,
        sustainedMax
      });
    }

    // Record this request
    record.timestamps.push(now);

    // Set rate limit headers
    const remainingBurst = Math.max(0, burstMax - burstTimestamps.length - 1);
    res.setHeader("X-RateLimit-Limit", String(burstMax));
    res.setHeader("X-RateLimit-Remaining", String(remainingBurst));

    return next();
  };
}

/**
 * Standard rate limiter middleware for AI endpoints
 */
export const aiRateLimiter = createRateLimiter({
  keyPrefix: "ai-general"
});

/**
 * Dedicated rate limiter for heavy image generation endpoints
 */
export const imageGenRateLimiter = createRateLimiter({
  keyPrefix: "ai-image-gen",
  burstMax: Number(process.env.AI_IMAGE_RATE_LIMIT_BURST_MAX) || 5,
  burstWindowMs: Number(process.env.AI_IMAGE_RATE_LIMIT_BURST_WINDOW_MS) || 60000,
  sustainedMax: Number(process.env.AI_IMAGE_RATE_LIMIT_SUSTAINED_MAX) || 20,
  sustainedWindowMs: Number(process.env.AI_IMAGE_RATE_LIMIT_SUSTAINED_WINDOW_MS) || 900000
});
