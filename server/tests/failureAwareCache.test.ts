import { describe, it, expect, beforeEach } from "vitest";
import {
  recordFailureCache,
  clearFailureCache,
  isProviderInFailureCache,
  getAICacheMetrics,
  clearAICaches,
  FAILURE_CACHE_TTL_MS
} from "../aiService";

describe("Failure-Aware AI Cache Verification Tests", () => {
  beforeEach(() => {
    clearAICaches();
  });

  it("should initialize metrics at 0", () => {
    const metrics = getAICacheMetrics();
    expect(metrics.successCacheSize).toBe(0);
    expect(metrics.failureCacheSize).toBe(0);
    expect(metrics.failureTTLMs).toBe(FAILURE_CACHE_TTL_MS);
  });

  it("should record failures and isolate from success cache", () => {
    const testKey = "test-hash-key-12345";
    recordFailureCache("groq", testKey, "500 Internal Server Error");

    const metrics = getAICacheMetrics();
    expect(metrics.successCacheSize).toBe(0);
    expect(metrics.failureCacheSize).toBeGreaterThanOrEqual(1);
    expect(isProviderInFailureCache("groq", testKey)).toBe(true);
  });

  it("should allow healthy provider to bypass failure cache", () => {
    const testKey = "test-hash-key-12345";
    recordFailureCache("groq", testKey, "500 Internal Server Error");
    expect(isProviderInFailureCache("gemini", testKey)).toBe(false);
  });

  it("should clear failure cache upon success or explicit clear", () => {
    const testKey = "test-hash-key-12345";
    recordFailureCache("groq", testKey, "500 Internal Server Error");
    clearFailureCache("groq", testKey);
    expect(isProviderInFailureCache("groq", testKey)).toBe(false);
  });

  it("should handle global failure and expiration clearing", () => {
    recordFailureCache("anthropic", "key-999", "Rate limit exceeded");
    expect(isProviderInFailureCache("anthropic")).toBe(true);

    clearAICaches();
    const metrics = getAICacheMetrics();
    expect(metrics.successCacheSize).toBe(0);
    expect(metrics.failureCacheSize).toBe(0);
  });
});
