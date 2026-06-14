import { z } from "zod";

export const TrendReportSchema = z.object({
  niche_name: z.string().min(1),
  audience: z.string().min(1),
  cultural_context: z.string().min(1),
  keywords: z.array(z.string()).min(1),
  trend_score: z.number().int().min(0).max(100),
  sources: z.array(z.string()).min(1),
});

export type TrendReport = z.infer<typeof TrendReportSchema>;

export function validate(data: unknown): TrendReport {
  return TrendReportSchema.parse(data);
}
