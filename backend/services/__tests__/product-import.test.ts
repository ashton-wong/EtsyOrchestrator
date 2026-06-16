import { describe, it, expect } from "vitest";
import { importExistingProducts } from "../product-import.js";

const shopProducts = [
  { id: "p1", title: "Shady Grove", created_at: "2025-07-09 03:23:51+00:00", external: { id: "111", handle: "https://www.etsy.com/listing/111/shady-grove" } },
  { id: "p2", title: "Draft (not on Etsy)", created_at: "2025-07-09 03:22:18+00:00", external: undefined },
  { id: "p3", title: "Already tracked", created_at: "2025-07-09 03:21:13+00:00", external: { id: "333" } },
];

describe("importExistingProducts", () => {
  it("imports only untracked, Etsy-published products and maps their fields", async () => {
    const imported: { printify_product_id: string; etsy_listing_id: string; listing_url: string; published_at?: Date }[] = [];
    const tracked = new Set(["p3"]);

    const count = await importExistingProducts({
      getShopProducts: async () => shopProducts,
      getProductByPrintifyId: async (id) => (tracked.has(id) ? { id: `uuid-${id}` } : null),
      importProduct: async (d) => { imported.push(d); return { id: "new" }; },
    });

    expect(count).toBe(1);
    expect(imported).toHaveLength(1);
    expect(imported[0]).toMatchObject({
      printify_product_id: "p1",
      etsy_listing_id: "111",
      listing_url: "https://www.etsy.com/listing/111/shady-grove",
    });
    expect(imported[0].published_at?.getUTCFullYear()).toBe(2025);
  });

  it("falls back to a constructed listing URL when no handle is present", async () => {
    const imported: { listing_url: string }[] = [];
    await importExistingProducts({
      getShopProducts: async () => [{ id: "p9", external: { id: "999" } }],
      getProductByPrintifyId: async () => null,
      importProduct: async (d) => { imported.push(d); return {}; },
    });
    expect(imported[0].listing_url).toBe("https://www.etsy.com/listing/999");
  });

  it("imports nothing when all products are already tracked", async () => {
    const count = await importExistingProducts({
      getShopProducts: async () => shopProducts,
      getProductByPrintifyId: async () => ({ id: "exists" }),
      importProduct: async () => { throw new Error("should not import"); },
    });
    expect(count).toBe(0);
  });
});
