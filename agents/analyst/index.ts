import Anthropic from "@anthropic-ai/sdk";
import { validate, type AnalystReport } from "../handoffs/AnalystReport.js";

const client = new Anthropic();

export async function runAnalyst(params: {
  getShopOrders: () => Promise<Array<{
    line_items: Array<{ product_id: string; quantity: number; price: number }>;
  }>>;
  insertSignal: (data: {
    product_id: string;
    orders: number;
    revenue_cents: number;
  }) => Promise<void>;
  getProductByPrintifyId: (printifyProductId: string) => Promise<{ id: string } | null>;
}): Promise<void> {
  const orders = await params.getShopOrders();

  const byProduct = new Map<string, { orders: number; revenue_cents: number }>();
  for (const order of orders) {
    for (const item of order.line_items) {
      const existing = byProduct.get(item.product_id) ?? { orders: 0, revenue_cents: 0 };
      byProduct.set(item.product_id, {
        orders: existing.orders + item.quantity,
        revenue_cents: existing.revenue_cents + item.price * item.quantity,
      });
    }
  }

  for (const [printifyProductId, agg] of byProduct) {
    const product = await params.getProductByPrintifyId(printifyProductId);
    if (!product) continue;
    await params.insertSignal({
      product_id: product.id,
      orders: agg.orders,
      revenue_cents: agg.revenue_cents,
    });
  }
}

export async function runAnalystSynthesis(params: {
  productSignals: {
    product_id: string;
    listing_url: string;
    niche_name: string;
    days_live: number;
    total_orders: number;
    total_revenue_cents: number;
  }[];
}): Promise<AnalystReport> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    system: `You are a store growth analyst for an Etsy print-on-demand store. Analyze product performance and recommend next actions to grow the store. Be specific and actionable.

Return a JSON object with this exact shape:
{
  "generated_at": string (ISO date),
  "store_summary": string (1-2 sentences on overall store health and direction),
  "top_performers": [{ "product_id": string (UUID), "reason": string }],
  "copy_refresh_candidates": [{ "product_id": string (UUID), "current_listing_url": string (URL), "weakness_summary": string }],
  "new_niche_seeds": [{ "keywords": string[] (min 1), "rationale": string }]
}

Rules:
- copy_refresh_candidates: products live > 21 days with 0 total_orders
- new_niche_seeds: 1-3 ideas that complement the existing store catalog; build on what is working
- top_performers: products with highest orders and revenue relative to days_live
- product_id values must be the exact UUIDs from the input data`,
    messages: [{
      role: "user",
      content: `Analyze these product signals and return the JSON schema:\n${JSON.stringify(params.productSignals, null, 2)}`,
    }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("AnalystSynthesis: no text output");
  return validate(JSON.parse(textBlock.text));
}
