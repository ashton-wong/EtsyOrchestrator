import { describe, it, expect } from "vitest";
import { validate, TrendReportSchema } from "../TrendReport.js";

describe("TrendReport", () => {
  const valid = {
    niche_name: "Native Austinite",
    audience: "Long-time Austin residents proud of their roots",
    cultural_context: "Backlash against rapid gentrification in Austin TX",
    keywords: ["native austinite", "austin texas", "keep austin weird"],
    trend_score: 78,
    sources: ["reddit.com/r/Austin", "trends.google.com"],
  };

  it("accepts a valid TrendReport", () => {
    expect(() => validate(valid)).not.toThrow();
  });

  it("throws when niche_name is missing", () => {
    const { niche_name, ...rest } = valid;
    expect(() => validate(rest)).toThrow();
  });

  it("throws when keywords is not an array", () => {
    expect(() => validate({ ...valid, keywords: "austin" })).toThrow();
  });

  it("throws when trend_score is out of 0-100 range", () => {
    expect(() => validate({ ...valid, trend_score: 150 })).toThrow();
  });

  it("throws when sources array is empty", () => {
    expect(() => validate({ ...valid, sources: [] })).toThrow();
  });
});
