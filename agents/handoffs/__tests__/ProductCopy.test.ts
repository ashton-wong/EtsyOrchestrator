import { describe, it, expect } from "vitest";
import { validate } from "../ProductCopy.js";

describe("ProductCopy", () => {
  const valid = {
    title: "Native Austinite Shirt | Keep Austin Weird Tee | Austin Texas Gift",
    description: "Perfect for long-time Austin residents.",
    tags: ["native austinite","austin texas","keep austin weird","texas shirt",
           "austin gift","texas pride","atx","local austin","city shirt",
           "austin tee","texas tee","austin native","austinite"],
    price_suggestion: 2499,
  };

  it("accepts valid ProductCopy", () => expect(() => validate(valid)).not.toThrow());
  it("throws when title exceeds 140 chars", () => {
    expect(() => validate({ ...valid, title: "A".repeat(141) })).toThrow();
  });
  it("throws when tags count is not exactly 13", () => {
    expect(() => validate({ ...valid, tags: valid.tags.slice(0, 12) })).toThrow();
    expect(() => validate({ ...valid, tags: [...valid.tags, "extra"] })).toThrow();
  });
  it("throws when price_suggestion is negative", () => {
    expect(() => validate({ ...valid, price_suggestion: -1 })).toThrow();
  });
});
