import Snoowrap from "snoowrap";

let client: Snoowrap | null = null;

function getClient(): Snoowrap {
  if (!client) {
    client = new Snoowrap({
      userAgent: process.env.REDDIT_USER_AGENT ?? "EtsyOrchestrator/1.0",
      clientId: process.env.REDDIT_CLIENT_ID!,
      clientSecret: process.env.REDDIT_CLIENT_SECRET!,
      accessToken: "eyJhbGc", // Reddit script apps use client credentials flow
    });
  }
  return client;
}

export async function searchReddit(query: string, subreddit?: string): Promise<{
  title: string; score: number; url: string; selftext: string;
}[]> {
  const r = getClient();
  const results = await (subreddit
    ? r.getSubreddit(subreddit).search({ query, sort: "hot", limit: 10 })
    : r.search({ query, sort: "hot", limit: 10 }));

  return results.map((post) => ({
    title: post.title,
    score: post.score,
    url: `https://reddit.com${post.permalink}`,
    selftext: post.selftext.slice(0, 500),
  }));
}

export async function getSubredditHotPosts(subreddit: string): Promise<{
  title: string; score: number; url: string;
}[]> {
  const r = getClient();
  const posts = await r.getSubreddit(subreddit).getHot({ limit: 25 });
  return posts.map((p) => ({ title: p.title, score: p.score, url: `https://reddit.com${p.permalink}` }));
}
