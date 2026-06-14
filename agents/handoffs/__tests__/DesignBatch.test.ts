import { describe, it, expect } from "vitest";
import { validate } from "../DesignBatch.js";

describe("DesignBatch", () => {
  const valid = {
    designs: [
      { image_url: "https://example.com/img1.png", prompt_used: "Native Austin skyline", rank: 1 },
      { image_url: "https://example.com/img2.png", prompt_used: "Keep Austin Weird", rank: 2 },
    ],
  };

  it("accepts valid DesignBatch", () => expect(() => validate(valid)).not.toThrow());
  it("throws when designs is empty", () => expect(() => validate({ designs: [] })).toThrow());
  it("throws when image_url is missing", () => {
    expect(() => validate({ designs: [{ prompt_used: "test", rank: 1 }] })).toThrow();
  });
  it("throws when designs exceeds 5", () => {
    const designs = Array.from({ length: 6 }, (_, i) => ({
      image_url: `https://example.com/img${i}.png`, prompt_used: "test", rank: i + 1,
    }));
    expect(() => validate({ designs })).toThrow();
  });
});
