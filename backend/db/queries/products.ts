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

export async function getProductById(id: string) {
  return db.query.products.findFirst({ where: eq(products.id, id) }) ?? null;
}

export async function getProductByPrintifyId(printifyProductId: string) {
  return db.query.products.findFirst({ where: eq(products.printify_product_id, printifyProductId) }) ?? null;
}

export async function listProducts() {
  return db.query.products.findMany({ orderBy: (p, { desc }) => [desc(p.published_at)] });
}

export async function listProductsWithRuns() {
  return db.query.products.findMany({
    with: { run: true },
    orderBy: (p, { desc }) => [desc(p.published_at)],
  });
}
