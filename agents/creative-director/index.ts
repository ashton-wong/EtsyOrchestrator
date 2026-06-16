import Anthropic from "@anthropic-ai/sdk";
import { validate, type DesignBatch } from "../handoffs/DesignBatch.js";
import { extractJson } from "../lib/extractJson.js";
import type { TrendReport } from "../handoffs/TrendReport.js";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a graphic design director for an Etsy print-on-demand store.
You receive a trend report about a niche and must write 3-5 distinct image-generation prompts
for a t-shirt graphic.

Prompts must be: specific, visual, suitable for apparel (no faces, no copyrighted imagery),
and deeply resonant with the niche's cultural identity.

Return ONLY a JSON object:
{
  "prompts": [
    { "prompt": "<detailed image-generation prompt>", "rank": 1 },
    ...
  ]
}
Rank 1 = most likely to sell. Include 3-5 prompts.`;

// Images are generated in code (not via a tool the LLM echoes), so the large base64
// image bytes Gemini returns never have to round-trip through the model's context.
export async function buildDesignBatch(
  prompts: { prompt: string; rank: number }[],
  generateImage: (prompt: string) => Promise<string>,
): Promise<DesignBatch> {
  const designs = await Promise.all(
    prompts.map(async (p) => ({
      image_url: await generateImage(p.prompt),
      prompt_used: p.prompt,
      rank: p.rank,
    })),
  );
  return validate({ designs });
}

export async function runCreativeDirector(params: {
  trendReport: TrendReport;
  generateImage: (prompt: string) => Promise<string>;
}): Promise<DesignBatch> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{
      role: "user",
      content: `Here is the trend report:\n${JSON.stringify(params.trendReport, null, 2)}\n\nWrite 3-5 apparel design prompts and return the JSON schema.`,
    }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("CreativeDirector: no text output");

  const parsed = extractJson(textBlock.text) as { prompts?: { prompt: string; rank: number }[] };
  if (!parsed.prompts?.length) throw new Error("CreativeDirector: model returned no prompts");

  return buildDesignBatch(parsed.prompts, params.generateImage);
}
