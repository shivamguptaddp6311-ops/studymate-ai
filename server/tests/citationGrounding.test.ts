import { describe, it, expect } from "vitest";
import { groundResponseCitations, generateCitationsContext, CitationSourceInput } from "../webSearch";

describe("Citation-Grounded Answer Generation Verification Tests", () => {
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

  it("should format citation context with metadata clearly", () => {
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

    expect(citationsContext).toContain('[Source 1] Title: "JEE Main 2026 Official Information Bulletin"');
    expect(citationsContext).toContain("URL: https://jeemain.nta.nic.in/bulletin-2026");
    expect(citationsContext).toContain("[Source 2]");
  });

  it("should preserve valid citations with page numbers", () => {
    const inputWithValidCitations = "The JEE Main 2026 Session 1 dates are officially published [1, p. 12]. Registration details are available on NTA portal [2].";
    const result1 = groundResponseCitations(inputWithValidCitations, mockSources);

    expect(result1.text).toContain("[1, p. 12]");
    expect(result1.text).toContain("[2]");
    expect(result1.validatedSources.length).toBe(2);
    expect(result1.validatedSources[0].title).toBe(mockSources[0].title);
    expect(result1.validatedSources[0].url).toBe(mockSources[0].url);
  });

  it("should prevent unsupported / hallucinated citations", () => {
    const inputWithHallucinatedCitations = "According to recent reports [1], exam centers have been updated [99]. Fee details were also released [Source 15].";
    const result2 = groundResponseCitations(inputWithHallucinatedCitations, mockSources);

    expect(result2.text).not.toContain("[99]");
    expect(result2.text).not.toContain("[15]");
    expect(result2.text).not.toContain("[Source 15]");
    expect(result2.text).toContain("[1]");
    expect(result2.prunedInvalidCitationsCount).toBe(2);
  });

  it("should inject citation footer fallback when response has no inline tags", () => {
    const inputWithoutInlineCitations = "JEE Main 2026 examination will take place across 500 cities in India and abroad.";
    const result3 = groundResponseCitations(inputWithoutInlineCitations, mockSources);

    expect(result3.text).toContain("*(Sources: [1, p. 12] [2])*");
    expect(result3.hasCitations).toBe(true);
  });

  it("should handle empty or non-search response", () => {
    const result4 = groundResponseCitations("Newton's second law is F = ma.", []);
    expect(result4.text).toBe("Newton's second law is F = ma.");
    expect(result4.validatedSources.length).toBe(0);
  });
});
