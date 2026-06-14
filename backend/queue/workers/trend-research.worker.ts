import { Worker } from "bullmq";
import { redis, queues, JOB_OPTIONS } from "../index.js";
import { runResearcher } from "@etsy-orchestrator/agents/researcher";
import { searchReddit, getSubredditHotPosts } from "../../services/reddit.js";
import { getTrendData, getRelatedQueries } from "../../services/google-trends.js";
import { updateRunField, updateRunStatus } from "../../db/queries/runs.js";

export const trendResearchWorker = new Worker(
  "trend-research",
  async (job) => {
    const { runId, seed_keywords } = job.data as { runId: string; seed_keywords?: string[] };

    await updateRunStatus(runId, "researching");

    const trendReport = await runResearcher({
      seed_keywords,
      searchReddit,
      getTrendData,
      getRelatedQueries,
    });

    await updateRunField(runId, "trend_report", trendReport);
    await updateRunStatus(runId, "designing");

    await queues.designGeneration.add("design-generation", { runId, trendReport }, JOB_OPTIONS);
  },
  { connection: redis },
);

trendResearchWorker.on("failed", async (job, err) => {
  if (job) await updateRunStatus(job.data.runId, "failed");
  console.error("trend-research failed:", err);
});
