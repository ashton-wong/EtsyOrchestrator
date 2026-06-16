// Backfills the existing Etsy store (products not created by this system) into the
// `products` table so the analyst recognises their orders. Dependency-injected for testing.

type ShopProduct = {
  id: string;
  title?: string;
  created_at?: string;
  external?: { id?: string; handle?: string };
};

export async function importExistingProducts(deps: {
  getShopProducts: () => Promise<ShopProduct[]>;
  getProductByPrintifyId: (printifyProductId: string) => Promise<{ id: string } | null>;
  importProduct: (data: {
    printify_product_id: string;
    etsy_listing_id: string;
    listing_url: string;
    published_at?: Date;
  }) => Promise<unknown>;
}): Promise<number> {
  const shopProducts = await deps.getShopProducts();
  let imported = 0;

  for (const product of shopProducts) {
    const etsyListingId = product.external?.id;
    if (!etsyListingId) continue; // not published to Etsy — nothing to track
    if (await deps.getProductByPrintifyId(product.id)) continue; // already tracked

    await deps.importProduct({
      printify_product_id: product.id,
      etsy_listing_id: etsyListingId,
      listing_url: product.external?.handle ?? `https://www.etsy.com/listing/${etsyListingId}`,
      // Printify's "YYYY-MM-DD HH:MM:SS+00:00" needs the space swapped for ISO 'T'.
      published_at: product.created_at ? new Date(product.created_at.replace(" ", "T")) : undefined,
    });
    imported++;
  }

  return imported;
}
