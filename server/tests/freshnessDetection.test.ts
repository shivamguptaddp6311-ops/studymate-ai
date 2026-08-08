import { describe, it, expect } from "vitest";
import { shouldSearchWeb, classifyQueryIntent } from "../webSearch";

describe("Intelligent Freshness Detection Verification Tests", () => {
  it("should trigger web search for exam dates and schedule", async () => {
    const examQuery1 = "When is JEE Main 2026 exam date?";
    const examQuery2 = "NEET UG 2026 admit card release date and hall ticket";
    const search1 = await shouldSearchWeb(examQuery1);
    const search2 = await shouldSearchWeb(examQuery2);
    expect(search1).toBe(true);
    expect(search2).toBe(true);
  });

  it("should trigger web search for admission and counselling", async () => {
    const counsellingQuery = "JoSAA counselling schedule and college seat allotment matrix";
    const admissionQuery = "University of Delhi admission registration last date to apply";
    const search3 = await shouldSearchWeb(counsellingQuery);
    const search4 = await shouldSearchWeb(admissionQuery);
    expect(search3).toBe(true);
    expect(search4).toBe(true);
  });

  it("should trigger web search for exam results", async () => {
    const resultQuery1 = "CBSE Class 12 board exam result declared or not";
    const resultQuery2 = "UPSC prelims scorecard rank list download";
    const search5 = await shouldSearchWeb(resultQuery1);
    const search6 = await shouldSearchWeb(resultQuery2);
    expect(search5).toBe(true);
    expect(search6).toBe(true);
  });

  it("should trigger web search for policies and guidelines", async () => {
    const policyQuery = "New UGC guidelines for college fee refund policy 2026";
    const newsQuery = "Latest news on NDA exam postponed";
    const search7 = await shouldSearchWeb(policyQuery);
    const search8 = await shouldSearchWeb(newsQuery);
    expect(search7).toBe(true);
    expect(search8).toBe(true);
  });

  it("should bypass web search for evergreen topics", async () => {
    const mathQuery = "Solve 3x^2 + 5x - 2 = 0 using quadratic formula";
    const bioQuery = "Explain how photosynthesis works in plants";
    const physicsQuery = "What is Newton's second law of motion?";
    const grammarQuery = "Explain past perfect tense rules with examples";

    const searchMath = await shouldSearchWeb(mathQuery);
    const searchBio = await shouldSearchWeb(bioQuery);
    const searchPhysics = await shouldSearchWeb(physicsQuery);
    const searchGrammar = await shouldSearchWeb(grammarQuery);

    expect(searchMath).toBe(false);
    expect(searchBio).toBe(false);
    expect(searchPhysics).toBe(false);
    expect(searchGrammar).toBe(false);
  });

  it("should classify query intents accurately", async () => {
    const eduIntent = await classifyQueryIntent("JEE Main cut off rank list 2026");
    const newsIntent = await classifyQueryIntent("Breaking news today on policy update");

    expect(eduIntent).toBe("education");
    expect(["breaking_news", "latest_news"]).toContain(newsIntent);
  });
});
