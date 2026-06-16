const BASE = "https://api.printify.com/v1";
const SHOP_ID = process.env.PRINTIFY_SHOP_ID!;

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.PRINTIFY_API_KEY}`,
      ...options.headers,
    },
  });
  if (!response.ok) throw new Error(`Printify ${path}: ${response.status} ${await response.text()}`);
  return response.json() as Promise<T>;
}

// `image` may be a hosted URL or base64 (incl. a "data:" URI from Gemini).
// Printify accepts either `url` or base64 `contents` (no data: prefix).
export async function uploadImage(image: string, fileName: string): Promise<string> {
  const body: Record<string, string> = { file_name: fileName };
  if (/^https?:\/\//i.test(image)) {
    body.url = image;
  } else {
    body.contents = image.startsWith("data:") ? (image.split(",")[1] ?? "") : image;
  }
  const data = await request<{ id: string }>("/uploads/images.json", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return data.id;
}

// PRINTIFY_BLANK_SKU_ID must be "blueprint_id:print_provider_id:variant_id". Confirm IDs from the Printify catalog API before first use.
export async function createProduct(params: {
  title: string;
  description: string;
  imageId: string;
  skuId: string;
  tags?: string[];
}): Promise<string> {
  const data = await request<{ id: string }>(`/shops/${SHOP_ID}/products.json`, {
    method: "POST",
    body: JSON.stringify({
      title: params.title,
      description: params.description,
      tags: params.tags ?? [],
      blueprint_id: parseInt(params.skuId.split(":")[0]),
      print_provider_id: parseInt(params.skuId.split(":")[1]),
      variants: [{ id: parseInt(params.skuId.split(":")[2]), price: 2499, is_enabled: true }],
      print_areas: [{
        variant_ids: [parseInt(params.skuId.split(":")[2])],
        placeholders: [{ position: "front", images: [{ id: params.imageId, x: 0.5, y: 0.5, scale: 1, angle: 0 }] }],
      }],
    }),
  });
  return data.id;
}

export async function publishProduct(productId: string): Promise<void> {
  await request(`/shops/${SHOP_ID}/products/${productId}/publish.json`, {
    method: "POST",
    body: JSON.stringify({
      title: true, description: true, images: true, variants: true,
      tags: true, keyFeatures: true, shipping_template: true,
    }),
  });
}

export async function updateProduct(productId: string, copy: {
  title: string;
  description: string;
  tags: string[];
}): Promise<void> {
  await request(`/shops/${SHOP_ID}/products/${productId}.json`, {
    method: "PUT",
    body: JSON.stringify({
      title: copy.title,
      description: copy.description,
      tags: copy.tags,
    }),
  });
}

// Printify line-item `price` is assumed to be in cents (matches createProduct's 2499 = $24.99 convention).
// revenue_cents = price * quantity. If a real order response shows USD instead, multiply by 100 — verify before deploying.
// TODO: the orders endpoint is paginated (default 10/page); this returns only the first page. Paginate if order volume grows.
export async function getShopOrders(): Promise<Array<{
  line_items: Array<{ product_id: string; quantity: number; price: number }>;
}>> {
  const data = await request<{
    data: Array<{ line_items: Array<{ product_id: string; quantity: number; price: number }> }>;
  }>(`/shops/${SHOP_ID}/orders.json`);
  return data.data;
}

// Lists products in the shop (incl. pre-existing ones not created by this system).
// `external` is present once a product is published to the connected sales channel (Etsy).
// NOTE: first page only (default ~10/page) — paginate if the catalog grows past one page.
export async function getShopProducts(): Promise<Array<{
  id: string;
  title?: string;
  created_at?: string;
  external?: { id?: string; handle?: string };
}>> {
  const data = await request<{
    data: Array<{ id: string; title?: string; created_at?: string; external?: { id?: string; handle?: string } }>;
  }>(`/shops/${SHOP_ID}/products.json`);
  return data.data;
}
