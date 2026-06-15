import { describe, it, expect } from "vitest";
import { runAnalyst } from "../index.js";

describe("runAnalyst", () => {
  it("aggregates line items by product and inserts one signal per product", async () => {
    const insertedSignals: { product_id: string; orders: number; revenue_cents: number }[] = [];

    await runAnalyst({
      getShopOrders: async () => [
        {
          line_items: [
            { product_id: "printify-abc", quantity: 2, price: 2499 },
            { product_id: "printify-xyz", quantity: 1, price: 1999 },
          ],
        },
        {
          line_items: [
            { product_id: "printify-abc", quantity: 1, price: 2499 },
          ],
        },
      ],
      getProductByPrintifyId: async (id) => {
        if (id === "printify-abc") return { id: "uuid-abc" };
        if (id === "printify-xyz") return { id: "uuid-xyz" };
        return null;
      },
      insertSignal: async (data) => { insertedSignals.push(data); },
    });

    expect(insertedSignals).toHaveLength(2);
    const abc = insertedSignals.find((s) => s.product_id === "uuid-abc");
    expect(abc).toEqual({ product_id: "uuid-abc", orders: 3, revenue_cents: 7497 });
    const xyz = insertedSignals.find((s) => s.product_id === "uuid-xyz");
    expect(xyz).toEqual({ product_id: "uuid-xyz", orders: 1, revenue_cents: 1999 });
  });

  it("skips line items whose Printify product ID has no matching internal product", async () => {
    const insertedSignals: unknown[] = [];

    await runAnalyst({
      getShopOrders: async () => [
        { line_items: [{ product_id: "unknown-printify-id", quantity: 1, price: 999 }] },
      ],
      getProductByPrintifyId: async () => null,
      insertSignal: async (data) => { insertedSignals.push(data); },
    });

    expect(insertedSignals).toHaveLength(0);
  });

  it("handles a shop with no orders without throwing", async () => {
    const insertedSignals: unknown[] = [];

    await runAnalyst({
      getShopOrders: async () => [],
      getProductByPrintifyId: async () => null,
      insertSignal: async (data) => { insertedSignals.push(data); },
    });

    expect(insertedSignals).toHaveLength(0);
  });
});
