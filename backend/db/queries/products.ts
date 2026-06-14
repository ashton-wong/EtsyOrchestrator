import { eq } from "drizzle-orm";
import { db } from "../index.js";
import { products } from "../schema.js";

export async function createProduct(data: {
  run_id: string;
  printify_product_id: string;
  etsy_listing_id: string;
  listing_url: string;
}) {
  const [product] = await db.insert(products).values(data).returning();
  return product;
}

export async function listProducts() {
  return db.query.products.findMany({ orderBy: (p, { desc }) => [desc(p.published_at)] });
}
