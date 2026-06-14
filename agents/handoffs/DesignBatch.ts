import { z } from "zod";

export const DesignBatchSchema = z.object({
  designs: z.array(z.object({
    image_url: z.string().url(),
    prompt_used: z.string().min(1),
    rank: z.number().int().positive(),
  })).min(1).max(5),
});

export type DesignBatch = z.infer<typeof DesignBatchSchema>;
export function validate(data: unknown): DesignBatch { return DesignBatchSchema.parse(data); }
