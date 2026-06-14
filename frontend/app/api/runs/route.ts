import { NextResponse } from "next/server";
import { createRun, listRuns } from "@etsy-orchestrator/backend/db/queries/runs";
import { queues, JOB_OPTIONS } from "@etsy-orchestrator/backend/queue";

export async function GET() {
  const runs = await listRuns();
  return NextResponse.json(runs);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { seed_keywords?: string[] };
  const run = await createRun(body.seed_keywords);
  await queues.trendResearch.add("trend-research", {
    runId: run.id,
    seed_keywords: body.seed_keywords,
  }, JOB_OPTIONS);
  return NextResponse.json(run, { status: 201 });
}
