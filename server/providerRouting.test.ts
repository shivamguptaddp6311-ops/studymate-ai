import { describe, it, expect } from "vitest";
import { normalizeProvider, getProviderDisplayName } from "./aiService";
import { PROVIDER_CAPABILITIES_REGISTRY } from "./providerCapabilities";

describe("AI Provider Routing and Normalization", () => {
  it("should normalize 'groq' and 'grok' to distinct AIProvider types", () => {
    const groqNormalized = normalizeProvider("groq");
    const grokNormalized = normalizeProvider("grok");
    const xaiNormalized = normalizeProvider("xai");

    expect(groqNormalized).toBe("groq");
    expect(grokNormalized).toBe("grok");
    expect(xaiNormalized).toBe("grok");
    expect(groqNormalized).not.toBe(grokNormalized);
  });

  it("should return distinct display names for Groq and xAI Grok", () => {
    const groqName = getProviderDisplayName("groq");
    const grokName = getProviderDisplayName("grok");

    expect(groqName).toBe("Groq");
    expect(grokName).toBe("xAI Grok");
    expect(groqName).not.toBe(grokName);
  });

  it("should have separate capability registry profiles for groq and grok", () => {
    const groqCapabilities = PROVIDER_CAPABILITIES_REGISTRY.groq;
    const grokCapabilities = PROVIDER_CAPABILITIES_REGISTRY.grok;

    expect(groqCapabilities).toBeDefined();
    expect(grokCapabilities).toBeDefined();
    expect(groqCapabilities.provider).toBe("groq");
    expect(grokCapabilities.provider).toBe("grok");
    expect(groqCapabilities.displayName).toBe("Groq");
    expect(grokCapabilities.displayName).toBe("xAI Grok");
  });

  it("should normalize deepseek correctly", () => {
    expect(normalizeProvider("deepseek")).toBe("deepseek");
    expect(getProviderDisplayName("deepseek")).toBe("DeepSeek");
    expect(PROVIDER_CAPABILITIES_REGISTRY.deepseek).toBeDefined();
  });
});
