import { describe, it, expect } from "vitest";
import { validate } from "../AnalystReport.js";

describe("AnalystReport", () => {
  const valid = {
    generated_at: "2026-06-15T00:00:00.000Z",
    store_summary: "The store is performing well in local pride niches.",
    top_performers: [
      { product_id: "550e8400-e29b-41d4-a716-446655440000", reason: "High view-to-favorite ratio" },
    ],
    copy_refresh_candidates: [
      {
        product_id: "550e8400-e29b-41d4-a716-446655440001",
        current_listing_url: "https://www.etsy.com/listing/123/test-shirt",
        weakness_summary: "Low CTR, title may be too generic",
      },
    ],
    new_niche_seeds: [
      {
        keywords: ["austin texas", "local pride"],
        rationale: "Complements existing local pride products in the store",
      },
    ],
  };

  it("accepts a valid AnalystReport", () => {
    expect(() => validate(valid)).not.toThrow();
  });

  it("throws when store_summary is missing", () => {
    const { store_summary, ...rest } = valid;
    expect(() => validate(rest)).toThrow();
  });

  it("allows empty arrays for top_performers", () => {
    expect(() => validate({ ...valid, top_performers: [] })).not.toThrow();
  });

  it("allows empty arrays for copy_refresh_candidates", () => {
    expect(() => validate({ ...valid, copy_refresh_candidates: [] })).not.toThrow();
  });

  it("throws when copy_refresh_candidate has invalid URL", () => {
    expect(() => validate({
      ...valid,
      copy_refresh_candidates: [{ ...valid.copy_refresh_candidates[0], current_listing_url: "not-a-url" }],
    })).toThrow();
  });

  it("throws when new_niche_seed has empty keywords array", () => {
    expect(() => validate({
      ...valid,
      new_niche_seeds: [{ keywords: [], rationale: "test" }],
    })).toThrow();
  });

  it("throws when product_id in top_performers is not a UUID", () => {
    expect(() => validate({
      ...valid,
      top_performers: [{ product_id: "not-a-uuid", reason: "test" }],
    })).toThrow();
  });
});
