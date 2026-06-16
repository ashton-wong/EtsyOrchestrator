import { describe, it, expect } from "vitest";
import { buildResearcherTools, buildResearcherSystemPrompt, dispatchResearcherTool } from "../index.js";

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

const baseDeps = {
  getTrendData: async (k: string) => ({ keyword: k, averageInterest: 70, timeline: [] }),
  getRelatedQueries: async () => ["widget", "gadget"],
};

describe("dispatchResearcherTool", () => {
  it("returns data on success", async () => {
    const r = await dispatchResearcherTool("get_trend_data", { keyword: "cats" }, baseDeps);
    expect(r).toMatchObject({ averageInterest: 70 });
  });

  it("returns error object instead of throwing when getTrendData fails", async () => {
    const r = await dispatchResearcherTool("get_trend_data", { keyword: "cats" }, {
      ...baseDeps,
      getTrendData: async () => { throw new Error("rate limited — got HTML"); },
    });
    expect(r).toMatchObject({ error: expect.stringContaining("rate limited") });
  });

  it("returns error object instead of throwing when getRelatedQueries fails", async () => {
    const r = await dispatchResearcherTool("get_related_queries", { keyword: "cats" }, {
      ...baseDeps,
      getRelatedQueries: async () => { throw new Error("503"); },
    });
    expect(r).toMatchObject({ error: expect.stringContaining("503") });
  });

  it("returns unknown-tool error for unrecognised names", async () => {
    const r = await dispatchResearcherTool("mystery_tool", {}, baseDeps);
    expect(r).toMatchObject({ error: "unknown tool" });
  });
});
