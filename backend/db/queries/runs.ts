import { eq } from "drizzle-orm";
import { db } from "../index.js";
import { runs } from "../schema.js";
import type { RunStatus } from "@etsy-orchestrator/shared";

export async function createRun(options?: {
  seed_keywords?: string[];
  run_type?: "new_product" | "copy_refresh";
  triggered_by?: "human" | "analyst";
  source_product_id?: string;
}) {
  const [run] = await db.insert(runs).values({
    seed_keywords: options?.seed_keywords,
    run_type: options?.run_type ?? "new_product",
    triggered_by: options?.triggered_by ?? "human",
    source_product_id: options?.source_product_id,
  }).returning();
  return run;
}

export async function getRun(id: string) {
  return db.query.runs.findFirst({ where: eq(runs.id, id) });
}

export async function listRuns() {
  return db.query.runs.findMany({ orderBy: (r, { desc }) => [desc(r.created_at)] });
}

export async function updateRunStatus(id: string, status: RunStatus) {
  await db.update(runs).set({ status, updated_at: new Date() }).where(eq(runs.id, id));
}

export async function updateRunField(
  id: string,
  field: "trend_report" | "design_batch" | "product_copy",
  value: unknown,
) {
  await db.update(runs)
    .set({ [field]: value, updated_at: new Date() })
    .where(eq(runs.id, id));
}

export async function approveRun(id: string, selected_design: number, product_copy: unknown) {
  await db.update(runs)
    .set({ selected_design, product_copy, updated_at: new Date() })
    .where(eq(runs.id, id));
}
