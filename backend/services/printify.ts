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

export async function uploadImage(imageUrl: string, fileName: string): Promise<string> {
  const data = await request<{ id: string }>("/uploads/images.json", {
    method: "POST",
    body: JSON.stringify({ file_name: fileName, url: imageUrl }),
  });
  return data.id;
}

// PRINTIFY_BLANK_SKU_ID must be "blueprint_id:print_provider_id:variant_id". Confirm IDs from the Printify catalog API before first use.
export async function createProduct(params: {
  title: string;
  description: string;
  imageId: string;
  skuId: string;
}): Promise<string> {
  const data = await request<{ id: string }>(`/shops/${SHOP_ID}/products.json`, {
    method: "POST",
    body: JSON.stringify({
      title: params.title,
      description: params.description,
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
