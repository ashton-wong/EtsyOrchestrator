import { Queue, QueueEvents } from "bullmq";
import Redis from "ioredis";

export const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const queues = {
  trendResearch: new Queue("trend-research", { connection: redis }),
  designGeneration: new Queue("design-generation", { connection: redis }),
  seoCopy: new Queue("seo-copy", { connection: redis }),
  deploy: new Queue("deploy", { connection: redis }),
};

export const queueEvents = {
  trendResearch: new QueueEvents("trend-research", { connection: redis }),
  designGeneration: new QueueEvents("design-generation", { connection: redis }),
  seoCopy: new QueueEvents("seo-copy", { connection: redis }),
  deploy: new QueueEvents("deploy", { connection: redis }),
};

export const JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 1000 },
};

export const DEPLOY_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: "exponential" as const, delay: 1000 },
};
