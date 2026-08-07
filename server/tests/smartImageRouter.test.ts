import {
  processSmartImageRouting,
  routeSmartImage,
  classifyImagePrompt,
  isScientificModeTriggered,
  detectLabelIntent,
  extractPreservedElements,
  buildNegativeConstraints,
  normalizeQualityMode,
  normalizeCategoryHint,
  ImageCategory,
} from "../smartImageRouter";

function runSmartImageRouterTests() {
  console.log("=== Running Smart Image Router Unit Test Suite ===");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` - ${detail}` : ""}`);
      failed++;
    }
  }

  // Test 1: Studio product photo of a cell phone
  const t1 = processSmartImageRouting("A studio product photo of a cell phone");
  assert(t1.category === "Product Image", "Test 1: 'cell phone' product photo -> Product Image", `got ${t1.category}`);
  assert(!t1.scientificMode, "Test 1: Product photo -> scientificMode false");

  // Test 2: Red muscle car
  const t2 = processSmartImageRouting("A red muscle car on a highway");
  assert(t2.category !== "Medical Illustration", "Test 2: 'muscle car' is NOT Medical Illustration", `got ${t2.category}`);
  assert(!t2.scientificMode, "Test 2: Muscle car -> scientificMode false");

  // Test 3: Pipe organ inside a church
  const t3 = processSmartImageRouting("A pipe organ inside a church");
  assert(t3.category !== "Medical Illustration", "Test 3: 'pipe organ' is NOT Medical Illustration", `got ${t3.category}`);
  assert(!t3.scientificMode, "Test 3: Pipe organ -> scientificMode false");

  // Test 4: Heart-shaped pendant product photo
  const t4 = processSmartImageRouting("A heart-shaped pendant product photo");
  assert(t4.category === "Product Image", "Test 4: Heart-shaped pendant -> Product Image", `got ${t4.category}`);
  assert(!t4.scientificMode, "Test 4: Heart-shaped pendant -> scientificMode false");

  // Test 5: Portrait holding a heart-shaped balloon
  const t5 = processSmartImageRouting("A portrait holding a heart-shaped balloon");
  assert(t5.category === "Portrait", "Test 5: Portrait with balloon -> Portrait", `got ${t5.category}`);
  assert(!t5.scientificMode, "Test 5: Portrait with balloon -> scientificMode false");

  // Test 6: Brain-shaped logo
  const t6 = processSmartImageRouting("A brain-shaped logo for a technology company");
  assert(t6.category !== "Medical Illustration", "Test 6: 'brain-shaped logo' is NOT Medical Illustration", `got ${t6.category}`);

  // Test 7: Labelled perfume bottle product photo
  const t7 = processSmartImageRouting("Labelled perfume bottle product photo");
  assert(t7.category === "Product Image", "Test 7: Perfume bottle -> Product Image", `got ${t7.category}`);
  assert(!t7.scientificMode, "Test 7: Perfume bottle -> scientificMode false");

  // Test 8: Architectural structure of a modern house
  const t8 = processSmartImageRouting("Architectural structure of a modern house");
  assert(t8.category === "Architecture", "Test 8: Architectural structure -> Architecture", `got ${t8.category}`);
  assert(!t8.scientificMode, "Test 8: Architecture -> scientificMode false");

  // Test 9: Architectural cross-section of a modern house
  const t9 = processSmartImageRouting("Architectural cross-section of a modern house");
  assert(t9.category === "Architecture", "Test 9: Architectural cross-section -> Architecture", `got ${t9.category}`);
  assert(!t9.scientificMode, "Test 9: Architectural cross-section -> scientificMode false");

  // Test 10: Labeled anatomical diagram of the human heart
  const t10 = processSmartImageRouting("Labeled anatomical diagram of the human heart");
  assert(t10.category === "Medical Illustration", "Test 10: Anatomical diagram of heart -> Medical Illustration", `got ${t10.category}`);
  assert(t10.scientificMode, "Test 10: Medical Illustration -> scientificMode true");

  // Test 11: Scientific diagram explaining photosynthesis
  const t11 = processSmartImageRouting("Scientific diagram explaining photosynthesis");
  assert(t11.category === "Scientific Diagram", "Test 11: Photosynthesis diagram -> Scientific Diagram", `got ${t11.category}`);
  assert(t11.scientificMode, "Test 11: Scientific Diagram -> scientificMode true");

  // Test 12: Educational flowchart of the water cycle
  const t12 = processSmartImageRouting("Educational flowchart of the water cycle");
  assert(t12.category === "Educational Chart", "Test 12: Water cycle flowchart -> Educational Chart", `got ${t12.category}`);
  assert(t12.scientificMode, "Test 12: Educational Chart -> scientificMode true");

  // Test 13: Electrical circuit schematic
  const t13 = processSmartImageRouting("Electrical circuit schematic with component labels");
  assert(t13.category === "Technical Diagram", "Test 13: Circuit schematic -> Technical Diagram", `got ${t13.category}`);
  assert(t13.scientificMode, "Test 13: Technical Diagram -> scientificMode true");

  // Test 14: Geometry diagram Pythagorean theorem
  const t14 = processSmartImageRouting("Geometry diagram demonstrating the Pythagorean theorem");
  assert(t14.category === "Mathematical Figure", "Test 14: Pythagorean theorem -> Mathematical Figure", `got ${t14.category}`);
  assert(t14.scientificMode, "Test 14: Mathematical Figure -> scientificMode true");

  // Test 15: Architectural floor plan
  const t15 = processSmartImageRouting("Architectural floor plan for a two-bedroom house");
  assert(t15.category === "Architecture", "Test 15: Architectural floor plan -> Architecture", `got ${t15.category}`);
  assert(!t15.scientificMode, "Test 15: Architectural floor plan -> scientificMode false");

  // Test 16: Watercolor painting in monochrome
  const t16 = processSmartImageRouting("Watercolor painting of a quiet village in monochrome");
  assert(t16.category === "Artistic Illustration", "Test 16: Watercolor painting -> Artistic Illustration", `got ${t16.category}`);
  assert(!t16.enhancedPrompt.includes("vivid colors"), "Test 16: No forced vivid colors in monochrome watercolor");
  assert(!t16.enhancedPrompt.includes("digital artwork"), "Test 16: No forced digital artwork in watercolor painting");

  // Test 17: Unlabelled anatomy illustration on a black background
  const t17 = processSmartImageRouting("Unlabelled anatomy illustration on a black background");
  assert(t17.category === "Medical Illustration", "Test 17: Anatomy illustration -> Medical Illustration", `got ${t17.category}`);
  assert(t17.scientificMode, "Test 17: Medical Illustration -> scientificMode true");
  assert(!t17.enhancedPrompt.includes("Render requested labels"), "Test 17: No forced labels when unlabelled requested");
  assert(!t17.enhancedPrompt.includes("white background"), "Test 17: No forced white background when black background requested");

  // Test 18: Anatomy diagram without labels or annotations
  const t18 = processSmartImageRouting("An anatomy diagram without labels or annotations");
  assert(!t18.preservedElements.isLabelRequested, "Test 18: Negative label intent takes precedence");
  assert(!t18.enhancedPrompt.includes("Render requested labels"), "Test 18: No positive label mandate");

  // Test 19: American and British spellings
  assert(detectLabelIntent("labeled diagram") === "required", "Test 19a: 'labeled' is required");
  assert(detectLabelIntent("labelled diagram") === "required", "Test 19b: 'labelled' is required");
  assert(detectLabelIntent("unlabeled diagram") === "forbidden", "Test 19c: 'unlabeled' is forbidden");
  assert(detectLabelIntent("unlabelled diagram") === "forbidden", "Test 19d: 'unlabelled' is forbidden");

  // Test 20: Labels extraction
  const t20 = extractPreservedElements("Labels: atrium, ventricle, and aorta");
  assert(t20.labelsMentioned.includes("atrium") && t20.labelsMentioned.includes("ventricle") && t20.labelsMentioned.includes("aorta"), "Test 20: Explicit labels extracted correctly", JSON.stringify(t20.labelsMentioned));

  // Test 21: Empty and whitespace-only prompts
  let emptyThrew = false;
  try {
    processSmartImageRouting("   ");
  } catch (e: any) {
    emptyThrew = e instanceof TypeError;
  }
  assert(emptyThrew, "Test 21: Empty / whitespace prompt throws TypeError");

  // Test 22: Valid normalized category hint
  assert(normalizeCategoryHint("product_image") === "Product Image", "Test 22: 'product_image' normalizes to Product Image");

  // Test 23: Invalid category hint
  assert(normalizeCategoryHint("cartography") === null, "Test 23: 'cartography' does NOT match Artistic Illustration");

  // Test 24: Conflicting prompt and explicit category hint
  const t24 = processSmartImageRouting("Scientific diagram of photosynthesis", "product_image");
  assert(t24.category === "Product Image", "Test 24: Valid category hint 'product_image' is authoritative");
  assert(!t24.scientificMode, "Test 24: Product Image has scientificMode false despite prompt keywords");

  // Test 25: Quality mode normalization
  assert(normalizeQualityMode("hd") === "hd", "Test 25a: 'hd' -> hd");
  assert(normalizeQualityMode("HD") === "hd", "Test 25b: 'HD' -> hd");
  assert(normalizeQualityMode(" HD ") === "hd", "Test 25c: ' HD ' -> hd");
  assert(normalizeQualityMode("fast") === "fast", "Test 25d: 'fast' -> fast");
  assert(normalizeQualityMode("unknown_quality") === "balanced", "Test 25e: unknown -> balanced");

  // Test 26: Portrait and Product Image with HD
  const t26a = processSmartImageRouting("A studio product photo of a watch", undefined, "hd");
  const t26b = processSmartImageRouting("A headshot portrait of an executive", undefined, "hd");
  assert(!t26a.enhancedPrompt.includes("crisp vector rendering"), "Test 26a: Product photo HD does NOT force vector rendering");
  assert(!t26b.enhancedPrompt.includes("crisp vector rendering"), "Test 26b: Portrait HD does NOT force vector rendering");

  // Test 27: Technical Diagram HD
  const t27 = processSmartImageRouting("Electrical circuit schematic", undefined, "hd");
  assert(t27.enhancedPrompt.includes("high structural precision"), "Test 27: Technical Diagram HD uses crisp quality wording");

  // Test 28: Non-scientific request retry prompt
  const t28 = processSmartImageRouting("A studio product photo of shoes");
  assert(t28.retryPrompt === undefined, "Test 28: Non-scientific category has undefined retryPrompt");

  // Test 29: Portrait negative constraints
  const t29Neg = buildNegativeConstraints("Portrait", false, "A portrait photo of a woman");
  assert(!t29Neg.includes("portraits") && !t29Neg.includes("human faces"), "Test 29: Portrait negatives do NOT contain 'portraits' or 'human faces'");

  // Test 30: Complete original prompt preserved verbatim
  const prompt30 = "A detailed architectural photograph of a modern glass skyscraper during sunset";
  const t30 = processSmartImageRouting(prompt30);
  assert(t30.enhancedPrompt.includes(prompt30), "Test 30: Complete original prompt preserved verbatim in enhancedPrompt");

  // Test 31: Determinism
  const t31a = processSmartImageRouting("Anatomy diagram of human eye");
  const t31b = processSmartImageRouting("Anatomy diagram of human eye");
  assert(
    t31a.category === t31b.category &&
    t31a.enhancedPrompt === t31b.enhancedPrompt &&
    t31a.scientificMode === t31b.scientificMode,
    "Test 31: Identical calls yield identical results"
  );

  // Test 32: Public alias consistency
  const p32 = "Electrical circuit schematic";
  const r32 = routeSmartImage(p32);
  const c32 = classifyImagePrompt(p32);
  const s32 = isScientificModeTriggered(p32, c32);
  assert(r32.category === c32, "Test 32a: routeSmartImage category matches classifyImagePrompt");
  assert(r32.scientificMode === s32, "Test 32b: routeSmartImage scientificMode matches isScientificModeTriggered");

  console.log(`\n=== Test Summary: ${passed} Passed, ${failed} Failed ===`);
  if (failed > 0) {
    throw new Error(`Smart Image Router tests failed with ${failed} errors.`);
  }
}

import { describe, it } from "vitest";

describe("smartImageRouter", () => {
  it("should pass all 62 smart image router classification & routing tests", () => {
    runSmartImageRouterTests();
  });
});
