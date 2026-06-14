import { validate, type PublishResult } from "../handoffs/PublishResult.js";
import type { ProductCopy } from "../handoffs/ProductCopy.js";
import type { DesignBatch } from "../handoffs/DesignBatch.js";

export async function runOperator(params: {
  selectedDesign: DesignBatch["designs"][0];
  productCopy: ProductCopy;
  nicheName: string;
  uploadImage: (url: string, name: string) => Promise<string>;
  createProduct: (p: { title: string; description: string; imageId: string; skuId: string }) => Promise<string>;
  publishProduct: (id: string) => Promise<void>;
  getListingId: (productId: string) => Promise<string>;
}): Promise<PublishResult> {
  const slug = params.nicheName.toLowerCase().replace(/\s+/g, "-").slice(0, 30);
  const imageId = await params.uploadImage(params.selectedDesign.image_url, `${slug}.png`);

  const printifyProductId = await params.createProduct({
    title: params.productCopy.title,
    description: params.productCopy.description,
    imageId,
    skuId: process.env.PRINTIFY_BLANK_SKU_ID!,
  });

  await params.publishProduct(printifyProductId);

  // Printify pushes to Etsy — poll for the etsy listing id
  const etsyListingId = await params.getListingId(printifyProductId);
  const listing_url = `https://www.etsy.com/listing/${etsyListingId}`;

  return validate({ printify_product_id: printifyProductId, etsy_listing_id: etsyListingId, listing_url });
}
