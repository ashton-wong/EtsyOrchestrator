import { Worker } from "bullmq";
import { redis } from "../index.js";
import { runMarketer, runMarketerRefresh } from "@etsy-orchestrator/agents/marketer";
import { updateRunField as updateField, updateRunStatus as setStatus, getRun } from "../../db/queries/runs.js";
import { getProductById } from "../../db/queries/products.js";
import type { DesignBatch } from "@etsy-orchestrator/agents/handoffs/DesignBatch";
import type { ProductCopy } from "@etsy-orchestrator/agents/handoffs/ProductCopy";

export const seoCopyWorker = new Worker(
  "seo-copy",
  async (job) => {
    const { runId, run_type, trendReport, designBatch, source_product_id, weakness_summary } = job.data;

    if (run_type === "copy_refresh") {
      const sourceProduct = await getProductById(source_product_id);
      if (!sourceProduct) throw new Error(`Source product ${source_product_id} not found`);

      const sourceRun = await getRun(sourceProduct.run_id);
      if (!sourceRun) throw new Error(`Source run not found for product ${source_product_id}`);

      const sourceDesignBatch = sourceRun.design_batch as DesignBatch;
      const sourceDesignIndex = sourceRun.selected_design ?? 0;
      const designImageUrl = sourceDesignBatch.designs[sourceDesignIndex].image_url;
      const existingCopy = sourceRun.product_copy as ProductCopy;

      const productCopy = await runMarketerRefresh({
        designImageUrl,
        existingCopy,
        weaknessSummary: weakness_summary,
      });

      await updateField(runId, "product_copy", productCopy);
      await setStatus(runId, "pending_approval");
      return;
    }

    // new_product path (unchanged)
    const productCopy = await runMarketer({ trendReport, designBatch });
    await updateField(runId, "product_copy", productCopy);
    await setStatus(runId, "pending_approval");
  },
  { connection: redis },
);

seoCopyWorker.on("failed", async (job, err) => {
  if (job) {
    const { updateRunStatus } = await import("../../db/queries/runs.js");
    await updateRunStatus(job.data.runId, "failed");
  }
  console.error("seo-copy failed:", err);
});
