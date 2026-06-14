export async function runAnalyst(params: {
  shopId: string;
  getShopListings: (shopId: string) => Promise<{ listing_id: string }[]>;
  getListingStats: (listingId: string) => Promise<{ views: number; num_favorers: number }>;
  insertSignal: (data: {
    product_id: string;
    views: number;
    favorites: number;
    orders: number;
    revenue_cents: number;
  }) => Promise<void>;
  getProductByListingId: (listingId: string) => Promise<{ id: string } | null>;
}): Promise<void> {
  const listings = await params.getShopListings(params.shopId);

  for (const listing of listings) {
    const product = await params.getProductByListingId(listing.listing_id);
    if (!product) continue;

    const stats = await params.getListingStats(listing.listing_id);
    await params.insertSignal({
      product_id: product.id,
      views: stats.views,
      favorites: stats.num_favorers,
      orders: 0, // Etsy Stats API v3 — orders require separate receipts endpoint
      revenue_cents: 0,
    });
  }
}
