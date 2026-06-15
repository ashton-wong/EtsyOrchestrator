import { getAllProductsWithLatestSignals } from "@etsy-orchestrator/backend/db/queries/signals";
import { listAnalystReports } from "@etsy-orchestrator/backend/db/queries/analyst-reports";
import { AnalyticsChart } from "../../components/AnalyticsChart";
import type { AnalystReport } from "@etsy-orchestrator/agents/handoffs/AnalystReport";

export default async function Analytics() {
  const [products, reports] = await Promise.all([
    getAllProductsWithLatestSignals(),
    listAnalystReports(3),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Analytics</h1>

      {reports.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Analyst Reports</h2>
          {reports.map((r) => {
            const report = r.report as AnalystReport;
            return (
              <div key={r.id} className="bg-white border rounded-xl p-5 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm">Weekly Synthesis</span>
                  <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-gray-600">{report.store_summary}</p>
                <div className="text-xs text-gray-400">
                  {report.copy_refresh_candidates.length} refresh(es) queued · {report.new_niche_seeds.length} new niche(s) queued · {report.top_performers.length} top performer(s)
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-6">
        <h2 className="text-lg font-semibold">Product Performance</h2>
        {products.map((p) => (
          <div key={p.id} className="bg-white border rounded-xl p-6 space-y-4">
            <div className="flex justify-between">
              <a href={p.listing_url} target="_blank" className="text-blue-600 hover:underline text-sm">{p.listing_url}</a>
              <span className="text-xs text-gray-400">Published {new Date(p.published_at).toLocaleDateString()}</span>
            </div>
            <AnalyticsChart signals={(p as unknown as { listing_signals: { views: number; favorites: number; orders: number; checked_at: string }[] }).listing_signals} />
          </div>
        ))}
        {products.length === 0 && <p className="text-gray-400">No published products yet.</p>}
      </div>
    </div>
  );
}
