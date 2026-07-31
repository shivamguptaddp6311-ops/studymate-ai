import {
  recordFailureCache,
  clearFailureCache,
  isProviderInFailureCache,
  getAICacheMetrics,
  clearAICaches,
  FAILURE_CACHE_TTL_MS,
  CACHE_TTL_MS,
  executeAIRequest
} from "../aiService";

async function runFailureAwareCacheTests() {
  console.log("=== Running Failure-Aware AI Cache Verification Tests ===");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // Clear all caches prior to running
  clearAICaches();

  // 1. Initial State & Metrics Test
  let metrics = getAICacheMetrics();
  assert(metrics.successCacheSize === 0, "Success cache initializes at size 0");
  assert(metrics.failureCacheSize === 0, "Failure cache initializes at size 0");
  assert(metrics.failureTTLMs === FAILURE_CACHE_TTL_MS, "Failure TTL configured correctly (2 minutes)");

  // 2. Failure Cache Recording & Separation Test
  const testKey = "test-hash-key-12345";
  recordFailureCache("groq", testKey, "500 Internal Server Error");

  metrics = getAICacheMetrics();
  assert(metrics.successCacheSize === 0, "Failed response is NEVER added to success cache");
  assert(metrics.failureCacheSize >= 1, "Failed response recorded in separate failure cache");
  assert(isProviderInFailureCache("groq", testKey) === true, "Provider 'groq' recognized in failure cache for key");

  // 3. Healthy Provider Bypasses Failed Cache Test
  assert(isProviderInFailureCache("gemini", testKey) === false, "Healthy provider 'gemini' is NOT in failure cache");

  // 4. Clearing Failure Cache on Success Test
  clearFailureCache("groq", testKey);
  assert(isProviderInFailureCache("groq", testKey) === false, "Failure cache cleared for 'groq' upon clearing/success");

  // 5. Global Failure & Expiration Test
  recordFailureCache("anthropic", "key-999", "Rate limit exceeded");
  assert(isProviderInFailureCache("anthropic") === true, "Global provider failure recognized in failure cache");

  // Clear again and verify metrics
  clearAICaches();
  metrics = getAICacheMetrics();
  assert(metrics.successCacheSize === 0 && metrics.failureCacheSize === 0, "Caches successfully cleared");

  console.log(`\nFailure-Aware Cache Test Summary: ${passed} Passed, ${failed} Failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runFailureAwareCacheTests();
