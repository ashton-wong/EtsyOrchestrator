import Anthropic from "@anthropic-ai/sdk";
import { validate, type DesignBatch } from "../handoffs/DesignBatch.js";
import type { TrendReport } from "../handoffs/TrendReport.js";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a graphic design director for an Etsy print-on-demand store.
You receive a trend report about a niche and must generate 3-5 distinct image prompts
for a t-shirt graphic designer. Then call generate_image for each prompt.

Prompts must be: specific, visual, suitable for apparel (no faces, no copyrighted imagery),
and deeply resonant with the niche's cultural identity.

After generating all images, return a JSON object:
{
  "designs": [
    { "image_url": "<url from tool>", "prompt_used": "<the exact prompt>", "rank": 1 },
    ...
  ]
}
Rank 1 = most likely to sell. designs must have 3-5 items.`;

export async function runCreativeDirector(params: {
  trendReport: TrendReport;
  generateImage: (prompt: string) => Promise<string>;
}): Promise<DesignBatch> {
  const tools: Anthropic.Tool[] = [{
    name: "generate_image",
    description: "Generate an apparel graphic image from a text prompt. Returns the image URL.",
    input_schema: {
      type: "object",
      properties: { prompt: { type: "string", description: "Detailed image generation prompt" } },
      required: ["prompt"],
    },
  }];

  const messages: Anthropic.MessageParam[] = [{
    role: "user",
    content: `Here is the trend report:\n${JSON.stringify(params.trendReport, null, 2)}\n\nGenerate 3-5 apparel design variants and return the JSON schema.`,
  }];

  while (true) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });

    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") throw new Error("CreativeDirector: no text output");
      return validate(JSON.parse(textBlock.text));
    }

    const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");
    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of toolUseBlocks) {
      if (block.type !== "tool_use") continue;
      const { prompt } = block.input as { prompt: string };
      const image_url = await params.generateImage(prompt);
      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: image_url });
    }
    messages.push({ role: "user", content: toolResults });
  }
}
