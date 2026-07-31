import dotenv from "dotenv";
import { serverLogger } from "./logger";

dotenv.config();

function safeLogInfo(category: string, message: string, data?: any) {
  try {
    if (typeof serverLogger !== "undefined" && serverLogger?.info) {
      serverLogger.info(category, message, data);
    } else {
      console.log(`[${new Date().toISOString()}] [INFO] [${category}] ${message}`, data ? JSON.stringify(data) : "");
    }
  } catch {
    console.log(`[${new Date().toISOString()}] [INFO] [${category}] ${message}`, data ? JSON.stringify(data) : "");
  }
}

function safeLogWarn(category: string, message: string, data?: any) {
  try {
    if (typeof serverLogger !== "undefined" && serverLogger?.warn) {
      serverLogger.warn(category, message, data);
    } else {
      console.warn(`[${new Date().toISOString()}] [WARN] [${category}] ${message}`, data ? JSON.stringify(data) : "");
    }
  } catch {
    console.warn(`[${new Date().toISOString()}] [WARN] [${category}] ${message}`, data ? JSON.stringify(data) : "");
  }
}

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface ProviderCircuitStats {
  provider: string;
  state: CircuitState;
  consecutiveFailures: number;
  consecutiveTimeouts: number;
  totalRequests: number;
  successCount: number;
  failureCount: number;
  timeoutCount: number;
  openedAt?: number;
  cooldownMs: number;
  cooldownRemainingMs: number;
  lastFailureTime?: string;
  lastErrorReason?: string;
  lastSuccessTime?: string;
  avgLatencyMs: number;
}

export class AICircuitBreaker {
  private failureThreshold: number;
  private timeoutThreshold: number;
  private cooldownMs: number;

  private stats: Record<string, {
    state: CircuitState;
    consecutiveFailures: number;
    consecutiveTimeouts: number;
    totalRequests: number;
    successCount: number;
    failureCount: number;
    timeoutCount: number;
    openedAt?: number;
    lastFailureTime?: string;
    lastErrorReason?: string;
    lastSuccessTime?: string;
    avgLatencyMs: number;
  }> = {};

  constructor() {
    this.failureThreshold = parseInt(process.env.CIRCUIT_FAILURE_THRESHOLD || "3", 10);
    this.timeoutThreshold = parseInt(process.env.CIRCUIT_TIMEOUT_THRESHOLD || "2", 10);
    this.cooldownMs = parseInt(process.env.CIRCUIT_COOLDOWN_MS || "30000", 10);

    const defaultProviders = ["gemini", "openai", "groq", "anthropic", "openrouter", "fal"];
    defaultProviders.forEach(p => this.initProvider(p));

    safeLogInfo("CircuitBreaker", "Initialized AI Provider Circuit Breaker Manager", {
      failureThreshold: this.failureThreshold,
      timeoutThreshold: this.timeoutThreshold,
      cooldownMs: this.cooldownMs
    });
  }

  private initProvider(provider: string) {
    if (!this.stats[provider]) {
      this.stats[provider] = {
        state: "CLOSED",
        consecutiveFailures: 0,
        consecutiveTimeouts: 0,
        totalRequests: 0,
        successCount: 0,
        failureCount: 0,
        timeoutCount: 0,
        avgLatencyMs: 0
      };
    }
  }

  /**
   * Determines if requests can be routed to a provider.
   * Prevents repeated calls to failing/OPEN providers while allowing HALF_OPEN probe calls after cooldown.
   */
  public canExecute(provider: string): boolean {
    this.initProvider(provider);
    const p = this.stats[provider];

    if (p.state === "CLOSED") {
      return true;
    }

    if (p.state === "OPEN") {
      const elapsed = Date.now() - (p.openedAt || 0);
      if (elapsed >= this.cooldownMs) {
        // Cooldown period elapsed -> transition to HALF_OPEN for trial probe
        p.state = "HALF_OPEN";
        safeLogInfo("CircuitBreaker", `Provider [${provider}] cooldown (${this.cooldownMs}ms) expired. Transitioning to HALF_OPEN probe state.`);
        return true;
      }
      // Still in cooldown period -> deny request to unhealthy provider
      return false;
    }

    if (p.state === "HALF_OPEN") {
      // Allow single probe request
      return true;
    }

    return true;
  }

  /**
   * Record request attempt for provider
   */
  public recordAttempt(provider: string): void {
    this.initProvider(provider);
    this.stats[provider].totalRequests++;
  }

  /**
   * Record successful call to provider. Resets failures and closes circuit if HALF_OPEN.
   */
  public recordSuccess(provider: string, durationMs: number): void {
    this.initProvider(provider);
    const p = this.stats[provider];

    p.successCount++;
    p.consecutiveFailures = 0;
    p.consecutiveTimeouts = 0;
    p.lastSuccessTime = new Date().toISOString();

    if (p.successCount === 1) {
      p.avgLatencyMs = durationMs;
    } else {
      p.avgLatencyMs = Math.round((p.avgLatencyMs * (p.successCount - 1) + durationMs) / p.successCount);
    }

    if (p.state === "HALF_OPEN" || p.state === "OPEN") {
      safeLogInfo("CircuitBreaker", `Provider [${provider}] successfully recovered! Circuit transition [${p.state}] -> [CLOSED].`);
      p.state = "CLOSED";
      p.openedAt = undefined;
    }
  }

  /**
   * Record failure or timeout call to provider.
   * Trips circuit to OPEN if thresholds are exceeded.
   */
  public recordFailure(provider: string, reason: string, isTimeout: boolean = false): void {
    this.initProvider(provider);
    const p = this.stats[provider];

    p.failureCount++;
    p.consecutiveFailures++;
    p.lastFailureTime = new Date().toISOString();
    p.lastErrorReason = reason;

    if (isTimeout) {
      p.timeoutCount++;
      p.consecutiveTimeouts++;
    }

    // Check if thresholds met to trip circuit
    const shouldTrip =
      p.consecutiveFailures >= this.failureThreshold ||
      p.consecutiveTimeouts >= this.timeoutThreshold ||
      p.state === "HALF_OPEN"; // Probe failed in HALF_OPEN

    if (shouldTrip && p.state !== "OPEN") {
      p.state = "OPEN";
      p.openedAt = Date.now();
      safeLogWarn("CircuitBreaker", `Circuit TRIPPED for provider [${provider}] -> [OPEN]. Consecutive failures: ${p.consecutiveFailures}, Consecutive timeouts: ${p.consecutiveTimeouts}. Cooldown: ${this.cooldownMs}ms. Reason: ${reason}`);
    } else if (p.state === "OPEN") {
      // Re-arm timer if failed during probe or extra request
      p.openedAt = Date.now();
    }
  }

  /**
   * Get detailed circuit state and health metrics for all providers
   */
  public getMetrics(): Record<string, ProviderCircuitStats> {
    const result: Record<string, ProviderCircuitStats> = {};
    const now = Date.now();

    for (const [provider, p] of Object.entries(this.stats)) {
      let cooldownRemainingMs = 0;
      if (p.state === "OPEN" && p.openedAt) {
        cooldownRemainingMs = Math.max(0, this.cooldownMs - (now - p.openedAt));
      }

      result[provider] = {
        provider,
        state: p.state,
        consecutiveFailures: p.consecutiveFailures,
        consecutiveTimeouts: p.consecutiveTimeouts,
        totalRequests: p.totalRequests,
        successCount: p.successCount,
        failureCount: p.failureCount,
        timeoutCount: p.timeoutCount,
        openedAt: p.openedAt,
        cooldownMs: this.cooldownMs,
        cooldownRemainingMs,
        lastFailureTime: p.lastFailureTime,
        lastErrorReason: p.lastErrorReason,
        lastSuccessTime: p.lastSuccessTime,
        avgLatencyMs: p.avgLatencyMs
      };
    }

    return result;
  }

  /**
   * Reset circuit breaker state for a specific provider or all providers
   */
  public reset(provider?: string): void {
    if (provider) {
      if (this.stats[provider]) {
        this.stats[provider].state = "CLOSED";
        this.stats[provider].consecutiveFailures = 0;
        this.stats[provider].consecutiveTimeouts = 0;
        this.stats[provider].openedAt = undefined;
        safeLogInfo("CircuitBreaker", `Reset circuit breaker for provider [${provider}] -> [CLOSED].`);
      }
    } else {
      for (const p of Object.keys(this.stats)) {
        this.stats[p].state = "CLOSED";
        this.stats[p].consecutiveFailures = 0;
        this.stats[p].consecutiveTimeouts = 0;
        this.stats[p].openedAt = undefined;
      }
      safeLogInfo("CircuitBreaker", "Reset circuit breaker for all AI providers.");
    }
  }
}

export const circuitBreaker = new AICircuitBreaker();
