import { describe, it, expect } from "vitest";
import { runOperator } from "../index.js";

describe("runOperator", () => {
  it("forwards product-copy tags to createProduct so they reach the listing", async () => {
    let createArgs: { title: string; description: string; imageId: string; skuId: string; tags?: string[] } | undefined;

    const result = await runOperator({
      selectedDesign: { image_url: "data:image/png;base64,AA", prompt_used: "p", rank: 1 },
      productCopy: { title: "Cool Tee", description: "A great shirt", tags: ["austin", "local", "pride"], price_suggestion: 2499 },
      nicheName: "Native Austinite",
      uploadImage: async () => "image-123",
      createProduct: async (p) => { createArgs = p; return "printify-1"; },
      publishProduct: async () => {},
      getListingId: async () => "etsy-999",
    });

    expect(createArgs?.tags).toEqual(["austin", "local", "pride"]);
    expect(result.printify_product_id).toBe("printify-1");
    expect(result.etsy_listing_id).toBe("etsy-999");
  });
});
