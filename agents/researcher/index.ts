import Anthropic from "@anthropic-ai/sdk";
import { validate, type TrendReport } from "../handoffs/TrendReport.js";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a trend researcher for an Etsy print-on-demand business.
Your job is to identify hyper-local cultural niches with strong community identity and
purchasing intent. Focus on phenomena like local pride, cultural movements, or inside
references that resonate deeply with a specific community.

You have access to Reddit and Google Trends data. Use them to validate niche ideas.
Return a single JSON object matching this exact schema:
{
  "niche_name": string,        // e.g. "Native Austinite"
  "audience": string,          // who buys this
  "cultural_context": string,  // why this resonates right now
  "keywords": string[],        // 5-10 SEO keywords
  "trend_score": number,       // 0-100, your confidence this will sell
  "sources": string[]          // Reddit/Google Trends URLs you consulted
}`;

export async function runResearcher(params: {
  seed_keywords?: string[];
  searchReddit: (query: string, subreddit?: string) => Promise<{ title: string; score: number; url: string; selftext: string }[]>;
  getTrendData: (keyword: string) => Promise<{ averageInterest: number }>;
  getRelatedQueries: (keyword: string) => Promise<string[]>;
}): Promise<TrendReport> {
  const tools: Anthropic.Tool[] = [
    {
      name: "search_reddit",
      description: "Search Reddit for posts about a topic. Returns top posts with scores.",
      input_schema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          subreddit: { type: "string", description: "Optional subreddit to search within" },
        },
        required: ["query"],
      },
    },
    {
      name: "get_trend_data",
      description: "Get Google Trends interest-over-time for a keyword (0-100 scale).",
      input_schema: {
        type: "object",
        properties: { keyword: { type: "string" } },
        required: ["keyword"],
      },
    },
    {
      name: "get_related_queries",
      description: "Get rising related search queries from Google Trends.",
      input_schema: {
        type: "object",
        properties: { keyword: { type: "string" } },
        required: ["keyword"],
      },
    },
  ];

  const seedContext = params.seed_keywords?.length
    ? `The user wants to explore niches related to: ${params.seed_keywords.join(", ")}.`
    : "Discover an interesting niche autonomously — look for hyper-local cultural phenomena.";

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: `${seedContext} Research a promising niche and return the JSON schema.` },
  ];

  // Agentic loop — Claude calls tools until it's ready to return the final JSON
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
      if (!textBlock || textBlock.type !== "text") throw new Error("Researcher: no text output");
      const json = JSON.parse(textBlock.text);
      return validate(json);
    }

    // Process tool calls
    const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");
    if (toolUseBlocks.length === 0) throw new Error("Researcher: unexpected stop reason");

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of toolUseBlocks) {
      if (block.type !== "tool_use") continue;
      const input = block.input as Record<string, string>;
      let result: unknown;

      if (block.name === "search_reddit") {
        result = await params.searchReddit(input.query, input.subreddit);
      } else if (block.name === "get_trend_data") {
        result = await params.getTrendData(input.keyword);
      } else if (block.name === "get_related_queries") {
        result = await params.getRelatedQueries(input.keyword);
      } else {
        result = { error: "unknown tool" };
      }

      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
    }

    messages.push({ role: "user", content: toolResults });
  }
}
