import { NextResponse } from "next/server";
import { getRun } from "@etsy-orchestrator/backend/db/queries/runs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const run = await getRun(params.id);
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(run);
}
