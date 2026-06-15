// NOTE: Etsy OAuth tokens expire — add refresh via ETSY_REFRESH_TOKEN before production. For testing, generate a long-lived token manually.
const BASE = "https://openapi.etsy.com/v3";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ETSY_API_KEY!,
      "Authorization": `Bearer ${process.env.ETSY_ACCESS_TOKEN}`,
      ...options.headers,
    },
  });
  if (!response.ok) throw new Error(`Etsy ${path}: ${response.status} ${await response.text()}`);
  return response.json() as Promise<T>;
}

export async function getListingStats(listingId: string): Promise<{
  views: number; num_favorers: number;
}> {
  return request(`/application/listings/${listingId}`);
}

export async function getShopListings(shopId: string): Promise<{ listing_id: string }[]> {
  const data = await request<{ results: { listing_id: string }[] }>(
    `/application/shops/${shopId}/listings/active?limit=100`
  );
  return data.results;
}

export async function updateListing(listingId: string, copy: {
  title: string;
  description: string;
  tags: string[];
}): Promise<void> {
  await request(`/application/listings/${listingId}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: copy.title,
      description: copy.description,
      tags: copy.tags,
    }),
  });
}
