import cron from "node-cron";
import { runAnalyst, runAnalystSynthesis } from "@etsy-orchestrator/agents/analyst";
import type { AnalystReport } from "@etsy-orchestrator/agents/handoffs/AnalystReport";
import { getShopOrders, getShopProducts } from "../services/printify.js";
import { importExistingProducts } from "../services/product-import.js";
import { insertSignal, getSignalsForProduct } from "../db/queries/signals.js";
import { insertAnalystReport } from "../db/queries/analyst-reports.js";
import { createRun } from "../db/queries/runs.js";
import { listProductsWithRuns, getProductByPrintifyId, importProduct } from "../db/queries/products.js";
import { queues, JOB_OPTIONS } from "../queue/index.js";

const MAX_WEEKLY_AUTO_NEW_PRODUCTS = parseInt(process.env.MAX_WEEKLY_AUTO_NEW_PRODUCTS ?? "2");
const MAX_WEEKLY_COPY_REFRESHES = parseInt(process.env.MAX_WEEKLY_COPY_REFRESHES ?? "5");

type ProductSignal = {
  product_id: string;
  listing_url: string;
  niche_name: string;
  days_live: number;
  total_orders: number;
  total_revenue_cents: number;
};

// Signal collection — pulls Printify orders into per-product signal rows. No LLM.
export async function collectSignals(): Promise<void> {
  await runAnalyst({ getShopOrders, insertSignal, getProductByPrintifyId });
}

async function buildProductSignals(): Promise<ProductSignal[]> {
  const allProducts = await listProductsWithRuns();
  if (allProducts.length === 0) return [];

  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  return Promise.all(
    allProducts.map(async (p) => {
      const signals = await getSignalsForProduct(p.id);
      const recent = signals.filter((s) => new Date(s.checked_at) >= sevenDaysAgo);
      const totalOrders = recent.reduce((sum, s) => sum + s.orders, 0);
      const totalRevenueCents = recent.reduce((sum, s) => sum + s.revenue_cents, 0);
      const daysLive = Math.floor((now - new Date(p.published_at).getTime()) / (1000 * 60 * 60 * 24));
      const nicheName = (p.run?.trend_report as { niche_name?: string } | null)?.niche_name ?? p.listing_url;

      return {
        product_id: p.id,
        listing_url: p.listing_url,
        niche_name: nicheName,
        days_live: daysLive,
        total_orders: totalOrders,
        total_revenue_cents: totalRevenueCents,
      };
    })
  );
}

// Run synthesis (one Haiku call) and persist the report. Does NOT queue any runs.
// Returns the report + the signals it was built from, or null if there are no products.
export async function generateAndStoreReport(): Promise<{ report: AnalystReport; productSignals: ProductSignal[] } | null> {
  const productSignals = await buildProductSignals();
  if (productSignals.length === 0) return null;
  const report = await runAnalystSynthesis({ productSignals });
  await insertAnalystReport(report);
  return { report, productSignals };
}

// Autonomous action (weekly cron only): queue the report's recommended runs. Human still approves all.
async function queueRecommendedRuns(report: AnalystReport, productSignals: ProductSignal[]): Promise<void> {
  const refreshCandidates = report.copy_refresh_candidates.slice(0, MAX_WEEKLY_COPY_REFRESHES);
  for (const candidate of refreshCandidates) {
    const run = await createRun({
      run_type: "copy_refresh",
      triggered_by: "analyst",
      source_product_id: candidate.product_id,
    });
    await queues.seoCopy.add("seo-copy", {
      runId: run.id,
      run_type: "copy_refresh",
      source_product_id: candidate.product_id,
      weakness_summary: candidate.weakness_summary,
    }, JOB_OPTIONS);
    console.log(`[Analyst] Queued copy_refresh run ${run.id} for product ${candidate.product_id}`);
  }

  const topPerformerNiches = report.top_performers
    .map((tp) => productSignals.find((ps) => ps.product_id === tp.product_id)?.niche_name)
    .filter((n): n is string => Boolean(n));
  const existingNiches = productSignals.map((ps) => ps.niche_name);

  const newSeeds = report.new_niche_seeds.slice(0, MAX_WEEKLY_AUTO_NEW_PRODUCTS);
  for (const seed of newSeeds) {
    const run = await createRun({
      seed_keywords: seed.keywords,
      run_type: "new_product",
      triggered_by: "analyst",
    });
    await queues.trendResearch.add("trend-research", {
      runId: run.id,
      seed_keywords: seed.keywords,
      store_context: { existing_niches: existingNiches, top_performers: topPerformerNiches },
    }, JOB_OPTIONS);
    console.log(`[Analyst] Queued new_product run ${run.id} for: ${seed.keywords.join(", ")}`);
  }

  console.log(`[Analyst] Done: ${refreshCandidates.length} refresh(es), ${newSeeds.length} new product(s) queued.`);
}

// One-time on worker startup: backfill the existing store, collect signals, and produce a
// report — analysis only, no auto-queued runs (POC choice).
export async function runAnalystOnBoot(): Promise<void> {
  try {
    const imported = await importExistingProducts({ getShopProducts, getProductByPrintifyId, importProduct });
    console.log(`[Boot] Imported ${imported} existing Printify product(s) into tracking.`);

    await collectSignals();
    console.log("[Boot] Signal collection complete.");

    const result = await generateAndStoreReport();
    console.log(result ? "[Boot] Analyst report generated and stored." : "[Boot] No products yet — report skipped.");
  } catch (err) {
    console.error("[Boot] Analyst boot run failed:", err);
  }
}

export function startAnalystCron() {
  // Signal collection — every 6 hours, no LLM
  cron.schedule("0 */6 * * *", async () => {
    console.log("[Analyst] Running signal collection...");
    try {
      await collectSignals();
      console.log("[Analyst] Signal collection complete.");
    } catch (err) {
      console.error("[Analyst] Signal collection failed:", err);
    }
  });

  // Weekly synthesis — one Haiku call, queues pending runs (human still approves all)
  const synthesisCron = process.env.ANALYST_SYNTHESIS_CRON ?? "0 0 * * 0";
  cron.schedule(synthesisCron, async () => {
    console.log("[Analyst] Running weekly synthesis...");
    try {
      const result = await generateAndStoreReport();
      if (!result) {
        console.log("[Analyst] No products yet — skipping synthesis.");
        return;
      }
      console.log("[Analyst] Synthesis complete. Queuing runs...");
      await queueRecommendedRuns(result.report, result.productSignals);
    } catch (err) {
      console.error("[Analyst] Weekly synthesis failed:", err);
    }
  });
}
