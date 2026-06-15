import { eq } from "drizzle-orm";
import { db } from "../index.js";
import { listing_signals, products } from "../schema.js";

export async function insertSignal(data: {
  product_id: string;
  orders: number;
  revenue_cents: number;
}) {
  await db.insert(listing_signals).values(data);
}

export async function getSignalsForProduct(product_id: string) {
  return db.query.listing_signals.findMany({
    where: eq(listing_signals.product_id, product_id),
    orderBy: (s, { asc }) => [asc(s.checked_at)],
  });
}

export async function getAllProductsWithLatestSignals() {
  return db.query.products.findMany({
    with: {
      listing_signals: { orderBy: (s, { desc }) => [desc(s.checked_at)], limit: 1 },
    },
  });
}
