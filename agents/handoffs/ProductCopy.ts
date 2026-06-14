import { z } from "zod";

export const ProductCopySchema = z.object({
  title: z.string().min(1).max(140),
  description: z.string().min(1),
  tags: z.array(z.string()).length(13),
  price_suggestion: z.number().int().nonnegative(),
});

export type ProductCopy = z.infer<typeof ProductCopySchema>;
export function validate(data: unknown): ProductCopy { return ProductCopySchema.parse(data); }
