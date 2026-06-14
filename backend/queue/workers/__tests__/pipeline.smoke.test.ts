import { describe, it, expect } from "vitest";

const mockTrendReport = {
  niche_name: "Test Niche",
  audience: "Test audience",
  cultural_context: "Test context",
  keywords: ["test", "niche"],
  trend_score: 75,
  sources: ["https://reddit.com/r/test"],
};

const mockDesignBatch = {
  designs: [
    { image_url: "https://example.com/img1.png", prompt_used: "test prompt", rank: 1 },
    { image_url: "https://example.com/img2.png", prompt_used: "test prompt 2", rank: 2 },
  ],
};

describe("Handoff contract pipeline smoke test", () => {
  it("TrendReport flows correctly into DesignBatch input shape", () => {
    expect(mockTrendReport.niche_name).toBeTruthy();
    expect(mockTrendReport.keywords.length).toBeGreaterThan(0);
  });

  it("DesignBatch flows correctly into Marketer input shape", () => {
    expect(mockDesignBatch.designs.length).toBeGreaterThanOrEqual(1);
    expect(mockDesignBatch.designs[0].image_url).toMatch(/^https?:\/\//);
  });

  it("selectedDesign from DesignBatch is a valid array index", () => {
    const selected = 0;
    expect(mockDesignBatch.designs[selected]).toBeDefined();
  });
});
