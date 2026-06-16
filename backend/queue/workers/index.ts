import { trendResearchWorker } from "./trend-research.worker.js";
import { designGenerationWorker } from "./design-generation.worker.js";
import { seoCopyWorker } from "./seo-copy.worker.js";
import { deployWorker } from "./deploy.worker.js";
import { startAnalystCron, runAnalystOnBoot } from "../../cron/signal-analyst.js";

console.log("Workers started:", [
  trendResearchWorker.name,
  designGenerationWorker.name,
  seoCopyWorker.name,
  deployWorker.name,
].join(", "));

startAnalystCron();
console.log("Analyst cron started (every 6 hours).");

// Run the analyst once on boot (import existing store, collect signals, produce a report).
console.log("Running analyst boot analysis...");
runAnalystOnBoot();
