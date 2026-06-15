import Anthropic from "@anthropic-ai/sdk";
import { validate, type AnalystReport } from "../handoffs/AnalystReport.js";

const client = new Anthropic();

export async function runAnalyst(params: {
  shopId: string;
  getShopListings: (shopId: string) => Promise<{ listing_id: string }[]>;
  getListingStats: (listingId: string) => Promise<{ views: number; num_favorers: number }>;
  insertSignal: (data: {
    product_id: string;
    views: number;
    favorites: number;
    orders: number;
    revenue_cents: number;
  }) => Promise<void>;
  getProductByListingId: (listingId: string) => Promise<{ id: string } | null>;
}): Promise<void> {
  const listings = await params.getShopListings(params.shopId);

  for (const listing of listings) {
    const product = await params.getProductByListingId(listing.listing_id);
    if (!product) continue;

    const stats = await params.getListingStats(listing.listing_id);
    await params.insertSignal({
      product_id: product.id,
      views: stats.views,
      favorites: stats.num_favorers,
      orders: 0, // Etsy Stats API v3 — orders require separate receipts endpoint
      revenue_cents: 0,
    });
  }
}

export async function runAnalystSynthesis(params: {
  productSignals: {
    product_id: string;
    listing_url: string;
    niche_name: string;
    days_live: number;
    total_views: number;
    total_favorites: number;
    total_orders: number;
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
- copy_refresh_candidates: products live > 14 days with < 30 total_views, OR favorites < 2% of views
- new_niche_seeds: 1-3 ideas that complement the existing store catalog; build on what is working
- top_performers: products with highest engagement relative to days_live
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
