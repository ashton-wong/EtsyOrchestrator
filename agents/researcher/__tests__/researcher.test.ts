import { describe, it, expect } from "vitest";
import { buildResearcherTools, buildResearcherSystemPrompt } from "../index.js";

describe("buildResearcherTools", () => {
  it("always includes the Google Trends tools", () => {
    const names = buildResearcherTools({ reddit: false }).map((t) => t.name);
    expect(names).toContain("get_trend_data");
    expect(names).toContain("get_related_queries");
  });

  it("omits search_reddit when Reddit is disabled", () => {
    const names = buildResearcherTools({ reddit: false }).map((t) => t.name);
    expect(names).not.toContain("search_reddit");
  });

  it("includes search_reddit when Reddit is enabled", () => {
    const names = buildResearcherTools({ reddit: true }).map((t) => t.name);
    expect(names).toContain("search_reddit");
  });
});

describe("buildResearcherSystemPrompt", () => {
  it("does not promise Reddit access when Reddit is disabled", () => {
    expect(buildResearcherSystemPrompt({ reddit: false })).not.toMatch(/reddit/i);
  });

  it("mentions Reddit when it is enabled", () => {
    expect(buildResearcherSystemPrompt({ reddit: true })).toMatch(/reddit/i);
  });
});
