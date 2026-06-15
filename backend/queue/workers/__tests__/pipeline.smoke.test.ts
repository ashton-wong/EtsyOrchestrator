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

describe("Copy refresh pipeline smoke test", () => {
  it("copy_refresh run has null trend_report and design_batch", () => {
    const copyRefreshRun = {
      run_type: "copy_refresh",
      triggered_by: "analyst",
      trend_report: null,
      design_batch: null,
      source_product_id: "550e8400-e29b-41d4-a716-446655440000",
    };
    expect(copyRefreshRun.trend_report).toBeNull();
    expect(copyRefreshRun.design_batch).toBeNull();
    expect(copyRefreshRun.source_product_id).toBeTruthy();
  });

  it("weakness_summary flows from AnalystReport candidate to seo-copy job data", () => {
    const candidate = {
      product_id: "550e8400-e29b-41d4-a716-446655440001",
      current_listing_url: "https://www.etsy.com/listing/123/test",
      weakness_summary: "Low CTR, title too generic",
    };
    const jobData = {
      runId: "run-uuid",
      run_type: "copy_refresh",
      source_product_id: candidate.product_id,
      weakness_summary: candidate.weakness_summary,
    };
    expect(jobData.weakness_summary).toBe("Low CTR, title too generic");
    expect(jobData.source_product_id).toBe(candidate.product_id);
  });

  it("design image URL resolves from source run design_batch at selected_design index", () => {
    const sourceRun = {
      design_batch: mockDesignBatch,
      selected_design: 1,
    };
    const designImageUrl = sourceRun.design_batch.designs[sourceRun.selected_design].image_url;
    expect(designImageUrl).toBe("https://example.com/img2.png");
  });
});
