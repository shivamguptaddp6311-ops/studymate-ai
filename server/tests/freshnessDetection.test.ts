import { shouldSearchWeb, classifyQueryIntent } from "../webSearch";

async function runFreshnessDetectionTests() {
  console.log("=== Running Intelligent Freshness Detection Verification Tests ===");
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

  // 1. Exam Date & Schedule Freshness Test Cases
  const examQuery1 = "When is JEE Main 2026 exam date?";
  const examQuery2 = "NEET UG 2026 admit card release date and hall ticket";
  const search1 = await shouldSearchWeb(examQuery1);
  const search2 = await shouldSearchWeb(examQuery2);
  assert(search1 === true, "Triggers web search for 'JEE Main 2026 exam date'");
  assert(search2 === true, "Triggers web search for 'NEET UG admit card hall ticket'");

  // 2. Admission & Counselling Freshness Test Cases
  const counsellingQuery = "JoSAA counselling schedule and college seat allotment matrix";
  const admissionQuery = "University of Delhi admission registration last date to apply";
  const search3 = await shouldSearchWeb(counsellingQuery);
  const search4 = await shouldSearchWeb(admissionQuery);
  assert(search3 === true, "Triggers web search for 'JoSAA counselling schedule'");
  assert(search4 === true, "Triggers web search for 'admission last date to apply'");

  // 3. Exam Results Freshness Test Cases
  const resultQuery1 = "CBSE Class 12 board exam result declared or not";
  const resultQuery2 = "UPSC prelims scorecard rank list download";
  const search5 = await shouldSearchWeb(resultQuery1);
  const search6 = await shouldSearchWeb(resultQuery2);
  assert(search5 === true, "Triggers web search for 'CBSE board exam result declared'");
  assert(search6 === true, "Triggers web search for 'UPSC prelims scorecard rank list'");

  // 4. Policy & Guidelines Freshness Test Cases
  const policyQuery = "New UGC guidelines for college fee refund policy 2026";
  const newsQuery = "Latest news on NDA exam postponed";
  const search7 = await shouldSearchWeb(policyQuery);
  const search8 = await shouldSearchWeb(newsQuery);
  assert(search7 === true, "Triggers web search for 'New UGC guidelines policy'");
  assert(search8 === true, "Triggers web search for 'Latest news on NDA exam postponed'");

  // 5. Evergreen Topics Test Cases (Must NOT trigger web search)
  const mathQuery = "Solve 3x^2 + 5x - 2 = 0 using quadratic formula";
  const bioQuery = "Explain how photosynthesis works in plants";
  const physicsQuery = "What is Newton's second law of motion?";
  const grammarQuery = "Explain past perfect tense rules with examples";

  const searchMath = await shouldSearchWeb(mathQuery);
  const searchBio = await shouldSearchWeb(bioQuery);
  const searchPhysics = await shouldSearchWeb(physicsQuery);
  const searchGrammar = await shouldSearchWeb(grammarQuery);

  assert(searchMath === false, "Bypasses web search for evergreen math equation");
  assert(searchBio === false, "Bypasses web search for evergreen biology concept (photosynthesis)");
  assert(searchPhysics === false, "Bypasses web search for evergreen physics concept (Newton's laws)");
  assert(searchGrammar === false, "Bypasses web search for evergreen grammar rules");

  // 6. Query Intent Classification Verification
  const eduIntent = await classifyQueryIntent("JEE Main cut off rank list 2026");
  const newsIntent = await classifyQueryIntent("Breaking news today on policy update");

  assert(eduIntent === "education", "Classifies exam query under 'education' intent");
  assert(newsIntent === "breaking_news" || newsIntent === "latest_news", "Classifies breaking update under news intent");

  console.log(`\nFreshness Detection Test Summary: ${passed} Passed, ${failed} Failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runFreshnessDetectionTests();
