import { z } from "zod";

export const PublishResultSchema = z.object({
  printify_product_id: z.string().min(1),
  etsy_listing_id: z.string().min(1),
  listing_url: z.string().url(),
});

export type PublishResult = z.infer<typeof PublishResultSchema>;
export function validate(data: unknown): PublishResult { return PublishResultSchema.parse(data); }
