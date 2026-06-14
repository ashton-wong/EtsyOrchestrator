import { NextResponse } from "next/server";
import { getRun, approveRun, updateRunStatus } from "@etsy-orchestrator/backend/db/queries/runs";
import { queues, DEPLOY_JOB_OPTIONS } from "@etsy-orchestrator/backend/queue";
import type { ProductCopy } from "@etsy-orchestrator/agents/handoffs/ProductCopy";
import type { DesignBatch } from "@etsy-orchestrator/agents/handoffs/DesignBatch";

type ApproveBody = {
  action: "approve" | "discard";
  selected_design_index?: number;
  copy_overrides?: { title?: string; description?: string; tags?: string[] };
};

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json() as ApproveBody;
  const run = await getRun(params.id);

  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (run.status !== "pending_approval") {
    return NextResponse.json({ error: "Run is not pending approval" }, { status: 409 });
  }

  if (body.action === "discard") {
    await updateRunStatus(params.id, "rejected");
    return NextResponse.json({ status: "rejected" });
  }

  if (body.selected_design_index === undefined) {
    return NextResponse.json({ error: "selected_design_index required for approve" }, { status: 400 });
  }

  const designBatch = run.design_batch as DesignBatch;
  const baseCopy = run.product_copy as ProductCopy;
  const finalCopy: ProductCopy = { ...baseCopy, ...body.copy_overrides };
  const selectedDesign = designBatch.designs[body.selected_design_index];

  await approveRun(params.id, body.selected_design_index, finalCopy);

  await queues.deploy.add("deploy", {
    runId: params.id,
    selectedDesign,
    productCopy: finalCopy,
    nicheName: (run.trend_report as { niche_name: string }).niche_name,
  }, DEPLOY_JOB_OPTIONS);

  return NextResponse.json({ status: "deploying" });
}
