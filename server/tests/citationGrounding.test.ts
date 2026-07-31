import { groundResponseCitations, generateCitationsContext, CitationSourceInput } from "../webSearch";

async function runCitationGroundingTests() {
  console.log("=== Running Citation-Grounded Answer Generation Verification Tests ===");
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

  // Sample Sources
  const mockSources: CitationSourceInput[] = [
    {
      title: "JEE Main 2026 Official Information Bulletin",
      url: "https://jeemain.nta.nic.in/bulletin-2026",
      domain: "nta.nic.in",
      publishedDate: "2026-01-15",
      pageNumber: 12
    },
    {
      title: "National Testing Agency Press Release",
      url: "https://nta.ac.in/press/jee-2026-schedule",
      domain: "nta.ac.in",
      publishedDate: "2026-01-20"
    }
  ];

  // Test 1: Citation Context Generation Formats Metadata Clearly
  const citationsContext = generateCitationsContext([
    {
      title: mockSources[0].title,
      url: mockSources[0].url,
      content: "JEE Main 2026 Session 1 will be conducted in January 2026.",
      publishedDate: mockSources[0].publishedDate,
      domain: mockSources[0].domain,
      source: "hybrid"
    },
    {
      title: mockSources[1].title,
      url: mockSources[1].url,
      content: "Admit cards released online.",
      publishedDate: mockSources[1].publishedDate,
      domain: mockSources[1].domain,
      source: "hybrid"
    }
  ]);

  assert(citationsContext.includes('[Source 1] Title: "JEE Main 2026 Official Information Bulletin"'), "Formats Source 1 title cleanly");
  assert(citationsContext.includes("URL: https://jeemain.nta.nic.in/bulletin-2026"), "Preserves exact Source 1 URL");
  assert(citationsContext.includes("[Source 2]"), "Formats Source 2 header");

  // Test 2: Valid Citations Preserved with Page Numbers
  const inputWithValidCitations = "The JEE Main 2026 Session 1 dates are officially published [1, p. 12]. Registration details are available on NTA portal [2].";
  const result1 = groundResponseCitations(inputWithValidCitations, mockSources);

  assert(result1.text.includes("[1, p. 12]"), "Preserves valid inline citation with explicit page reference");
  assert(result1.text.includes("[2]"), "Preserves valid inline citation for source 2");
  assert(result1.validatedSources.length === 2, "Returns 2 validated sources matching input metadata");
  assert(result1.validatedSources[0].title === mockSources[0].title, "Preserves source title in validated output");
  assert(result1.validatedSources[0].url === mockSources[0].url, "Preserves source URL in validated output");

  // Test 3: Preventing Unsupported / Hallucinated Citations
  const inputWithHallucinatedCitations = "According to recent reports [1], exam centers have been updated [99]. Fee details were also released [Source 15].";
  const result2 = groundResponseCitations(inputWithHallucinatedCitations, mockSources);

  assert(!result2.text.includes("[99]"), "Prunes unsupported citation index [99] out of bounds");
  assert(!result2.text.includes("[15]") && !result2.text.includes("[Source 15]"), "Prunes unsupported citation index [15]");
  assert(result2.text.includes("[1]"), "Keeps valid citation [1]");
  assert(result2.prunedInvalidCitationsCount === 2, "Tracks exact count of pruned invalid citations (2)");

  // Test 4: Auto-fallback Citation Injection when response has no inline tags
  const inputWithoutInlineCitations = "JEE Main 2026 examination will take place across 500 cities in India and abroad.";
  const result3 = groundResponseCitations(inputWithoutInlineCitations, mockSources);

  assert(result3.text.includes("*(Sources: [1, p. 12] [2])*"), "Appends formatted citation footer when text lacks inline citations");
  assert(result3.hasCitations === true, "Marks hasCitations as true after fallback grounding");

  // Test 5: Empty or Non-search Response Handling
  const result4 = groundResponseCitations("Newton's second law is F = ma.", []);
  assert(result4.text === "Newton's second law is F = ma.", "Leaves non-search text unmodified");
  assert(result4.validatedSources.length === 0, "Returns empty validated sources when no sources provided");

  console.log(`\nCitation Grounding Test Summary: ${passed} Passed, ${failed} Failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runCitationGroundingTests();
