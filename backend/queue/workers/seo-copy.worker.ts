import { Worker } from "bullmq";
import { redis } from "../index.js";
import { runMarketer } from "@etsy-orchestrator/agents/marketer";
import { updateRunField as updateField, updateRunStatus as setStatus } from "../../db/queries/runs.js";

export const seoCopyWorker = new Worker(
  "seo-copy",
  async (job) => {
    const { runId, trendReport, designBatch } = job.data;
    const productCopy = await runMarketer({ trendReport, designBatch });

    await updateField(runId, "product_copy", productCopy);
    await setStatus(runId, "pending_approval");
    // Human approval gate — frontend polls run status; no further queue enqueued here
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
