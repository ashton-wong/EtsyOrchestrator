import { Worker } from "bullmq";
import { redis, queues, JOB_OPTIONS } from "../index.js";
import { runCreativeDirector } from "@etsy-orchestrator/agents/creative-director";
import { generateImage } from "../../services/nano-banana.js";
import { updateRunField, updateRunStatus } from "../../db/queries/runs.js";

export const designGenerationWorker = new Worker(
  "design-generation",
  async (job) => {
    const { runId, trendReport } = job.data;
    await updateRunStatus(runId, "designing");

    const designBatch = await runCreativeDirector({ trendReport, generateImage });

    await updateRunField(runId, "design_batch", designBatch);
    await updateRunStatus(runId, "generating_copy");

    await queues.seoCopy.add("seo-copy", { runId, trendReport, designBatch }, JOB_OPTIONS);
  },
  { connection: redis },
);

designGenerationWorker.on("failed", async (job, err) => {
  if (job) await updateRunStatus(job.data.runId, "failed");
  console.error("design-generation failed:", err);
});
