import { getAllProductsWithLatestSignals } from "@etsy-orchestrator/backend/db/queries/signals";
import { AnalyticsChart } from "../../components/AnalyticsChart";

export default async function Analytics() {
  const products = await getAllProductsWithLatestSignals();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>
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
  );
}
