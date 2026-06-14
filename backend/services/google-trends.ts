import googleTrends from "google-trends-api";

export async function getTrendData(keyword: string): Promise<{
  keyword: string;
  averageInterest: number;
  timeline: { date: string; value: number }[];
}> {
  const raw = await googleTrends.interestOverTime({ keyword, startTime: new Date("2024-01-01") });
  const parsed = JSON.parse(raw);
  const timeline = parsed.default.timelineData.map((d: { formattedTime: string; value: number[] }) => ({
    date: d.formattedTime,
    value: d.value[0],
  }));
  const averageInterest = Math.round(timeline.reduce((s: number, t: { value: number }) => s + t.value, 0) / timeline.length);
  return { keyword, averageInterest, timeline };
}

export async function getRelatedQueries(keyword: string): Promise<string[]> {
  const raw = await googleTrends.relatedQueries({ keyword });
  const parsed = JSON.parse(raw);
  const rising = parsed.default.rankedList[0]?.rankedKeyword ?? [];
  return rising.slice(0, 10).map((r: { query: string }) => r.query);
}
