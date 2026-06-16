import { describe, it, expect } from "vitest";
import { buildDesignBatch } from "../index.js";

describe("buildDesignBatch", () => {
  it("builds a valid DesignBatch from prompts + a base64 data-URI image generator", async () => {
    const fakeImg = async (p: string) => `data:image/png;base64,${Buffer.from(p).toString("base64")}`;
    const batch = await buildDesignBatch(
      [{ prompt: "vintage avocado", rank: 1 }, { prompt: "retro sunset", rank: 2 }],
      fakeImg,
    );
    expect(batch.designs).toHaveLength(2);
    expect(batch.designs[0].image_url).toMatch(/^data:image\/png;base64,/);
    expect(batch.designs[0].prompt_used).toBe("vintage avocado");
    expect(batch.designs[0].rank).toBe(1);
  });

  it("also accepts plain http(s) image URLs", async () => {
    const batch = await buildDesignBatch(
      [{ prompt: "x", rank: 1 }],
      async () => "https://example.com/i.png",
    );
    expect(batch.designs[0].image_url).toBe("https://example.com/i.png");
  });

  it("rejects an empty design set (handoff requires >= 1)", async () => {
    await expect(buildDesignBatch([], async () => "data:image/png;base64,AA")).rejects.toThrow();
  });
});
