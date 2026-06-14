import { describe, it, expect } from "vitest";
import { validate } from "../PublishResult.js";

describe("PublishResult", () => {
  const valid = {
    printify_product_id: "abc123",
    etsy_listing_id: "987654321",
    listing_url: "https://www.etsy.com/listing/987654321/native-austinite-shirt",
  };

  it("accepts valid PublishResult", () => expect(() => validate(valid)).not.toThrow());
  it("throws when listing_url is not a URL", () => {
    expect(() => validate({ ...valid, listing_url: "not-a-url" })).toThrow();
  });
  it("throws when etsy_listing_id is missing", () => {
    const { etsy_listing_id, ...rest } = valid;
    expect(() => validate(rest)).toThrow();
  });
});
