import { describe, it, expect } from "vitest";
import { findMatchingTemplate, brainTemplate } from "../infographicTemplates";
import { renderInfographic } from "../infographicRenderer";

describe("Infographic Diagram Engine", () => {
  it("should fuzzy-match topic queries for human brain anatomy", () => {
    expect(findMatchingTemplate("human brain")).toBe(brainTemplate);
    expect(findMatchingTemplate("brain diagram")).toBe(brainTemplate);
    expect(findMatchingTemplate("draw the anatomy of the brain with labels")).toBe(brainTemplate);
    expect(findMatchingTemplate("lobes of the brain")).toBe(brainTemplate);
  });

  it("should return null for unmatched topics", () => {
    expect(findMatchingTemplate("quantum physics particle accelerator")).toBeNull();
    expect(findMatchingTemplate("car engine schematic")).toBeNull();
    expect(findMatchingTemplate("")).toBeNull();
  });

  it("should have realistic human brain template data structure", () => {
    expect(brainTemplate.id).toBe("human-brain-anatomy");
    expect(brainTemplate.regions.length).toBe(6);
    expect(brainTemplate.footerCards?.length).toBe(6);

    const frontal = brainTemplate.regions.find(r => r.name === "Frontal Lobe");
    expect(frontal).toBeDefined();
    expect(frontal?.bullets.length).toBeGreaterThanOrEqual(4);
    expect(frontal?.calloutPosition).toHaveProperty("x");
    expect(frontal?.calloutPosition).toHaveProperty("y");
  });

  it("should render infographic template to PNG buffer via Puppeteer", async () => {
    const pngBuffer = await renderInfographic(brainTemplate);
    expect(pngBuffer).toBeInstanceOf(Buffer);
    expect(pngBuffer.length).toBeGreaterThan(1000);
  }, 30000);
});
