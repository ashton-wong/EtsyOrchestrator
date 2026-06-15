import { db } from "../index.js";
import { analyst_reports } from "../schema.js";

export async function insertAnalystReport(report: unknown) {
  const [row] = await db.insert(analyst_reports).values({ report }).returning();
  return row;
}

export async function listAnalystReports(limit = 3) {
  return db.query.analyst_reports.findMany({
    orderBy: (r, { desc }) => [desc(r.created_at)],
    limit,
  });
}
