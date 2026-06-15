import { Worker } from "bullmq";
import { redis, DEPLOY_JOB_OPTIONS } from "../index.js";
import { runOperator } from "@etsy-orchestrator/agents/operator";
import { uploadImage, createProduct, publishProduct } from "../../services/printify.js";
import { updateListing } from "../../services/etsy.js";
import { updateRunStatus } from "../../db/queries/runs.js";
import { createProduct as createProductRecord, getProductById } from "../../db/queries/products.js";
import type { ProductCopy } from "@etsy-orchestrator/agents/handoffs/ProductCopy";

async function getEtsyListingId(printifyProductId: string): Promise<string> {
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const product = await fetch(
      `https://api.printify.com/v1/shops/${process.env.PRINTIFY_SHOP_ID}/products/${printifyProductId}.json`,
      { headers: { Authorization: `Bearer ${process.env.PRINTIFY_API_KEY}` } }
    ).then((r) => r.json()) as { external?: { id: string } };
    if (product.external?.id) return product.external.id;
  }
  throw new Error(`Timed out waiting for Etsy listing from Printify product ${printifyProductId}`);
}

export const deployWorker = new Worker(
  "deploy",
  async (job) => {
    const { runId, run_type, selectedDesign, productCopy, nicheName, source_product_id } = job.data;

    if (run_type === "copy_refresh") {
      await updateRunStatus(runId, "updating");
      const sourceProduct = await getProductById(source_product_id);
      if (!sourceProduct) throw new Error(`Source product ${source_product_id} not found`);
      await updateListing(sourceProduct.etsy_listing_id, productCopy as ProductCopy);
      await updateRunStatus(runId, "live");
      return;
    }

    // new_product path (unchanged)
    await updateRunStatus(runId, "deploying");

    const result = await runOperator({
      selectedDesign,
      productCopy,
      nicheName,
      uploadImage,
      createProduct,
      publishProduct,
      getListingId: getEtsyListingId,
    });

    await createProductRecord({
      run_id: runId,
      printify_product_id: result.printify_product_id,
      etsy_listing_id: result.etsy_listing_id,
      listing_url: result.listing_url,
    });

    await updateRunStatus(runId, "live");
  },
  { connection: redis, ...DEPLOY_JOB_OPTIONS },
);

deployWorker.on("failed", async (job, err) => {
  if (job) await updateRunStatus(job.data.runId, "failed");
  console.error("deploy failed:", err);
});
