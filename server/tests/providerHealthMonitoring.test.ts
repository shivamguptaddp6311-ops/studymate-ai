import { describe, it, expect } from "vitest";
import {
  recordAIAttempt,
  recordAISuccess,
  recordAIFailure,
  recordAIFallback,
  getAIHealthMetrics,
  getAIHealthDashboardData
} from "../logger";
import { circuitBreaker } from "../circuitBreaker";

describe("AI Provider Health Monitoring & Observability Tests", () => {
  it("should track latency and success metrics", () => {
    recordAIAttempt("gemini");
    recordAISuccess("gemini", 200, 400, 800, false);
    recordAIAttempt("gemini");
    recordAISuccess("gemini", 400, 400, 800, false);

    const metrics = getAIHealthMetrics();
    const gemini = metrics["gemini"];

    expect(gemini.totalRequests).toBeGreaterThanOrEqual(2);
    expect(gemini.successCount).toBeGreaterThanOrEqual(2);
    expect(gemini.avgLatencyMs).toBe(300);
    expect(gemini.minLatencyMs).toBe(200);
    expect(gemini.maxLatencyMs).toBe(400);
  });

  it("should track timeout and calculate success rates", () => {
    recordAIAttempt("openai");
    recordAISuccess("openai", 150, 200, 400, false);
    recordAIAttempt("openai");
    recordAIFailure("openai", "Request timed out after 30 seconds");

    const metrics = getAIHealthMetrics();
    const openai = metrics["openai"];

    expect(openai.timeoutCount).toBeGreaterThanOrEqual(1);
    expect(openai.timeoutRate).toBeGreaterThan(0);
  });

  it("should calculate estimated cost usage", () => {
    recordAIAttempt("fal");
    recordAISuccess("fal", 800, 50, 0, true);

    const metrics = getAIHealthMetrics();
    const fal = metrics["fal"];

    expect(fal.estimatedCostUSD).toBeGreaterThan(0);
  });

  it("should track fallback frequency", () => {
    recordAIFallback("groq", "anthropic");
    const metrics = getAIHealthMetrics();
    expect(metrics["groq"].fallbackCount || 0).toBeGreaterThanOrEqual(1);
    expect(metrics["anthropic"].fallbackCount || 0).toBeGreaterThanOrEqual(1);
  });

  it("should trip circuit breaker to OPEN after consecutive failures", () => {
    for (let i = 0; i < 6; i++) {
      recordAIFailure("openrouter", "HTTP 500 Server Error");
    }

    const metrics = getAIHealthMetrics();
    const openrouter = metrics["openrouter"];
    expect(openrouter.circuitState).toBe("OPEN");
    expect(openrouter.status).toBe("failing");

    circuitBreaker.reset("openrouter");
  });

  it("should format health dashboard data correctly", () => {
    const dashboard = getAIHealthDashboardData();
    expect(typeof dashboard.status).toBe("string");
    expect(typeof dashboard.summary.totalRequests).toBe("number");
    expect(typeof dashboard.summary.globalSuccessRate).toBe("number");
    expect(typeof dashboard.summary.totalEstimatedCostUSD).toBe("number");
    expect(typeof dashboard.summary.totalFallbacks).toBe("number");
    expect(typeof dashboard.providers).toBe("object");
  });
});
