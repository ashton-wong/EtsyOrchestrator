import { trendResearchWorker } from "./trend-research.worker.js";
import { designGenerationWorker } from "./design-generation.worker.js";
import { seoCopyWorker } from "./seo-copy.worker.js";
import { deployWorker } from "./deploy.worker.js";
import { startAnalystCron } from "../../cron/signal-analyst.js";

console.log("Workers started:", [
  trendResearchWorker.name,
  designGenerationWorker.name,
  seoCopyWorker.name,
  deployWorker.name,
].join(", "));

startAnalystCron();
console.log("Analyst cron started (every 6 hours).");
