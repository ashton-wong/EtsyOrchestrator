import { NextResponse } from "next/server";
import { getAllProductsWithLatestSignals } from "@etsy-orchestrator/backend/db/queries/signals";

export async function GET() {
  const data = await getAllProductsWithLatestSignals();
  return NextResponse.json(data);
}
