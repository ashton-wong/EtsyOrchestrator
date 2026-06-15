import { z } from "zod";

export const AnalystReportSchema = z.object({
  generated_at: z.string(),
  store_summary: z.string().min(1),
  top_performers: z.array(z.object({
    product_id: z.string().uuid(),
    reason: z.string().min(1),
  })),
  copy_refresh_candidates: z.array(z.object({
    product_id: z.string().uuid(),
    current_listing_url: z.string().url(),
    weakness_summary: z.string().min(1),
  })),
  new_niche_seeds: z.array(z.object({
    keywords: z.array(z.string()).min(1),
    rationale: z.string().min(1),
  })),
});

export type AnalystReport = z.infer<typeof AnalystReportSchema>;

export function validate(data: unknown): AnalystReport {
  return AnalystReportSchema.parse(data);
}
