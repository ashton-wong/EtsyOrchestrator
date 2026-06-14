import { listRuns } from "@etsy-orchestrator/backend/db/queries/runs";
import { listProducts } from "@etsy-orchestrator/backend/db/queries/products";

export default async function Dashboard() {
  const [runs, products] = await Promise.all([listRuns(), listProducts()]);
  const activeRuns = runs.filter((r) => !["live", "rejected", "failed"].includes(r.status));

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <a href="/runs/new" className="bg-blue-600 text-white px-4 py-2 rounded text-sm">New Run</a>
      </div>

      {activeRuns.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3">Active Runs</h2>
          <div className="space-y-2">
            {activeRuns.map((run) => (
              <a key={run.id} href={`/runs/${run.id}`}
                className="block bg-white border rounded-lg px-4 py-3 hover:border-blue-300 transition">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-mono text-gray-500">{run.id.slice(0, 8)}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    run.status === "pending_approval" ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"
                  }`}>{run.status.replace(/_/g, " ")}</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-semibold mb-3">Published Products ({products.length})</h2>
        <div className="space-y-2">
          {products.map((p) => (
            <div key={p.id} className="bg-white border rounded-lg px-4 py-3 flex justify-between">
              <span className="text-sm text-gray-600">{p.etsy_listing_id}</span>
              <a href={p.listing_url} target="_blank" className="text-blue-600 text-sm hover:underline">View on Etsy →</a>
            </div>
          ))}
          {products.length === 0 && <p className="text-gray-400 text-sm">No products published yet.</p>}
        </div>
      </section>
    </div>
  );
}
