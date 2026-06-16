import Anthropic from "@anthropic-ai/sdk";
import { validate, type TrendReport } from "../handoffs/TrendReport.js";
import { extractJson } from "../lib/extractJson.js";

const client = new Anthropic();

// Reddit access is gated behind an injected `searchReddit` dependency. When it's
// absent (e.g. no Reddit API creds yet) the researcher runs on Google Trends alone,
// and these builders keep the prompt/tools honest about what's available.
export function buildResearcherSystemPrompt(opts: { reddit: boolean }): string {
  const dataSources = opts.reddit ? "Reddit and Google Trends" : "Google Trends";
  return `You are a trend researcher for an Etsy print-on-demand business.
Your job is to identify hyper-local cultural niches with strong community identity and
purchasing intent. Focus on phenomena like local pride, cultural movements, or inside
references that resonate deeply with a specific community.

You have access to ${dataSources} data. Use ${opts.reddit ? "them" : "it"} to validate niche ideas.
Return a single JSON object matching this exact schema:
{
  "niche_name": string,        // e.g. "Native Austinite"
  "audience": string,          // who buys this
  "cultural_context": string,  // why this resonates right now
  "keywords": string[],        // 5-10 SEO keywords
  "trend_score": number,       // 0-100, your confidence this will sell
  "sources": string[]          // ${dataSources} URLs you consulted
}`;
}

export function buildResearcherTools(opts: { reddit: boolean }): Anthropic.Tool[] {
  const tools: Anthropic.Tool[] = [];

  if (opts.reddit) {
    tools.push({
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
    });
  }

  tools.push(
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
  );

  return tools;
}

type ResearcherDeps = {
  searchReddit?: (query: string, subreddit?: string) => Promise<{ title: string; score: number; url: string; selftext: string }[]>;
  getTrendData: (keyword: string) => Promise<{ averageInterest: number }>;
  getRelatedQueries: (keyword: string) => Promise<string[]>;
};

// Exported so it can be unit-tested without mocking the Anthropic client.
// Returns an error object (never throws) so a failing tool doesn't abort the whole job.
export async function dispatchResearcherTool(
  name: string,
  input: Record<string, string>,
  deps: ResearcherDeps,
): Promise<unknown> {
  try {
    if (name === "search_reddit" && deps.searchReddit) {
      return await deps.searchReddit(input.query, input.subreddit);
    } else if (name === "get_trend_data") {
      return await deps.getTrendData(input.keyword);
    } else if (name === "get_related_queries") {
      return await deps.getRelatedQueries(input.keyword);
    } else {
      return { error: "unknown tool" };
    }
  } catch (err) {
    return { error: `Tool temporarily unavailable: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export async function runResearcher(params: ResearcherDeps & {
  seed_keywords?: string[];
  store_context?: { existing_niches: string[]; top_performers: string[] };
}): Promise<TrendReport> {
  const reddit = Boolean(params.searchReddit);
  const tools = buildResearcherTools({ reddit });

  const seedContext = params.seed_keywords?.length
    ? `The user wants to explore niches related to: ${params.seed_keywords.join(", ")}.`
    : "Discover an interesting niche autonomously — look for hyper-local cultural phenomena.";

  const storeContext = params.store_context?.existing_niches.length
    ? ` Store context — this store already sells in these niches: ${params.store_context.existing_niches.join(", ")}. Top performers: ${params.store_context.top_performers.join(", ")}. Choose a niche that complements the existing catalog rather than scattering the store's brand.`
    : "";

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: `${seedContext}${storeContext} Research a promising niche and return the JSON schema.` },
  ];

  while (true) {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: buildResearcherSystemPrompt({ reddit }),
      tools,
      messages,
    });

    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") throw new Error("Researcher: no text output");
      const json = extractJson(textBlock.text);
      return validate(json);
    }

    const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");
    if (toolUseBlocks.length === 0) throw new Error("Researcher: unexpected stop reason");

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of toolUseBlocks) {
      if (block.type !== "tool_use") continue;
      const input = block.input as Record<string, string>;
      let result: unknown;

      result = await dispatchResearcherTool(block.name, input, params);

      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
    }

    messages.push({ role: "user", content: toolResults });
  }
}
