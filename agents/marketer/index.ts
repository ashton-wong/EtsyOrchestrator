import Anthropic from "@anthropic-ai/sdk";
import { validate, type ProductCopy } from "../handoffs/ProductCopy.js";
import type { TrendReport } from "../handoffs/TrendReport.js";
import type { DesignBatch } from "../handoffs/DesignBatch.js";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are an Etsy SEO and copywriting expert. You receive a trend report
and images of t-shirt designs. Write Etsy listing copy that will rank highly in search.

Etsy constraints (strictly enforced):
- Title: max 140 characters, front-load the most important keywords
- Tags: EXACTLY 13 tags, each max 20 characters, no repeated words across tags
- Description: 2-3 paragraphs, conversational, include keywords naturally
- Price: suggest in cents (e.g. 2499 = $24.99)

Return ONLY a JSON object with this exact shape:
{ "title": string, "description": string, "tags": string[], "price_suggestion": number }`;

export async function runMarketer(params: {
  trendReport: TrendReport;
  designBatch: DesignBatch;
}): Promise<ProductCopy> {
  // Build image content blocks for Claude vision
  const imageBlocks: Anthropic.ImageBlockParam[] = params.designBatch.designs.map((d) => ({
    type: "image",
    source: { type: "url", url: d.image_url },
  }));

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{
      role: "user",
      content: [
        ...imageBlocks,
        {
          type: "text",
          text: `Trend report:\n${JSON.stringify(params.trendReport, null, 2)}\n\nWrite Etsy listing copy for these designs. Return the JSON schema.`,
        },
      ],
    }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Marketer: no text output");
  return validate(JSON.parse(textBlock.text));
}
