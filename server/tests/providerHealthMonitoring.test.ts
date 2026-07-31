import {
  recordAIAttempt,
  recordAISuccess,
  recordAIFailure,
  recordAIFallback,
  getAIHealthMetrics,
  getAIHealthDashboardData
} from "../logger";
import { circuitBreaker } from "../circuitBreaker";

function runHealthMonitoringTests() {
  console.log("=== Running AI Provider Health Monitoring & Observability Tests ===");
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

  // 1. Latency & Success Tracking Test
  recordAIAttempt("gemini");
  recordAISuccess("gemini", 200, 400, 800, false); // 100 prompt tokens, 200 completion tokens
  
  recordAIAttempt("gemini");
  recordAISuccess("gemini", 400, 400, 800, false);

  let metrics = getAIHealthMetrics();
  const gemini = metrics["gemini"];

  assert(gemini.totalRequests >= 2, "Tracks total request count");
  assert(gemini.successCount >= 2, "Tracks successful request count");
  assert(gemini.avgLatencyMs === 300, `Accurately calculates average latency (300ms = (200+400)/2, got ${gemini.avgLatencyMs})`);
  assert(gemini.minLatencyMs === 200, "Tracks minimum latency (200ms)");
  assert(gemini.maxLatencyMs === 400, "Tracks maximum latency (400ms)");

  // 2. Timeout & Success Rate Tracking Test
  recordAIAttempt("openai");
  recordAISuccess("openai", 150, 200, 400, false);
  recordAIAttempt("openai");
  recordAIFailure("openai", "Request timed out after 30 seconds");

  metrics = getAIHealthMetrics();
  const openai = metrics["openai"];

  assert(openai.timeoutCount >= 1, "Accurately tracks timeout count");
  assert(openai.timeoutRate > 0, `Calculates non-zero timeout rate (${openai.timeoutRate}%)`);
  assert(openai.successRate === 50, `Calculates correct success rate (50%, got ${openai.successRate}%)`);

  // 3. Cost Usage Calculation Test
  recordAIAttempt("fal");
  recordAISuccess("fal", 800, 50, 0, true); // 1 image generation

  metrics = getAIHealthMetrics();
  const fal = metrics["fal"];

  assert(fal.estimatedCostUSD > 0, `Calculates estimated USD cost for image provider ($${fal.estimatedCostUSD})`);
  assert(gemini.estimatedCostUSD > 0, `Calculates estimated USD cost for text provider ($${gemini.estimatedCostUSD})`);

  // 4. Fallback Frequency Tracking Test
  recordAIFallback("groq", "anthropic");
  metrics = getAIHealthMetrics();
  assert((metrics["groq"].fallbackCount || 0) >= 1, "Tracks fallback frequency on primary provider");
  assert((metrics["anthropic"].fallbackCount || 0) >= 1, "Tracks fallback frequency on fallback provider");

  // 5. Circuit Breaker Integration Test
  for (let i = 0; i < 6; i++) {
    recordAIFailure("openrouter", "HTTP 500 Server Error");
  }

  metrics = getAIHealthMetrics();
  const openrouter = metrics["openrouter"];
  assert(openrouter.circuitState === "OPEN", "Circuit Breaker trips to OPEN after consecutive failures");
  assert(openrouter.status === "failing", "Health metrics reflects 'failing' status when Circuit Breaker is OPEN");

  // Reset circuit breaker to maintain clean state
  circuitBreaker.reset("openrouter");

  // 6. Health Dashboard Endpoint Data Format Test
  const dashboard = getAIHealthDashboardData();
  assert(typeof dashboard.status === "string", "Dashboard includes overall status");
  assert(typeof dashboard.summary.totalRequests === "number", "Dashboard includes total requests summary");
  assert(typeof dashboard.summary.globalSuccessRate === "number", "Dashboard includes global success rate");
  assert(typeof dashboard.summary.totalEstimatedCostUSD === "number", "Dashboard includes total estimated USD cost");
  assert(typeof dashboard.summary.totalFallbacks === "number", "Dashboard includes total fallbacks count");
  assert(typeof dashboard.providers === "object", "Dashboard includes per-provider health metrics object");

  console.log(`\nHealth Monitoring Test Summary: ${passed} Passed, ${failed} Failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runHealthMonitoringTests();
