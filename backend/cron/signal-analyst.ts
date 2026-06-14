import cron from "node-cron";
import { runAnalyst } from "@etsy-orchestrator/agents/analyst";
import { getShopListings, getListingStats } from "../services/etsy.js";
import { insertSignal } from "../db/queries/signals.js";
import { db } from "../db/index.js";
import { products } from "../db/schema.js";
import { eq } from "drizzle-orm";

async function getProductByListingId(listingId: string) {
  return db.query.products.findFirst({ where: eq(products.etsy_listing_id, listingId) }) ?? null;
}

export function startAnalystCron() {
  // Every 6 hours
  cron.schedule("0 */6 * * *", async () => {
    console.log("[Analyst] Running signal collection...");
    try {
      await runAnalyst({
        shopId: process.env.ETSY_SHOP_ID!,
        getShopListings,
        getListingStats,
        insertSignal,
        getProductByListingId,
      });
      console.log("[Analyst] Signal collection complete.");
    } catch (err) {
      console.error("[Analyst] Signal collection failed:", err);
    }
  });
}
