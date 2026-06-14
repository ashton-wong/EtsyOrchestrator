import { listRuns } from "@etsy-orchestrator/backend/db/queries/runs";

export default async function RunsList() {
  const runs = await listRuns();
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">All Runs</h1>
        <a href="/runs/new" className="bg-blue-600 text-white px-4 py-2 rounded text-sm">New Run</a>
      </div>
      <div className="space-y-2">
        {runs.map((run) => (
          <a key={run.id} href={`/runs/${run.id}`}
            className="block bg-white border rounded-lg px-4 py-3 hover:border-blue-300 transition">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-mono text-sm">{run.id.slice(0, 8)}</span>
                {(run.trend_report as { niche_name?: string } | null)?.niche_name && (
                  <span className="ml-3 text-sm text-gray-600">
                    {(run.trend_report as { niche_name: string }).niche_name}
                  </span>
                )}
              </div>
              <div className="flex gap-3 items-center">
                <span className="text-xs text-gray-400">{new Date(run.created_at).toLocaleDateString()}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  run.status === "live" ? "bg-green-100 text-green-700" :
                  run.status === "rejected" ? "bg-gray-100 text-gray-500" :
                  run.status === "failed" ? "bg-red-100 text-red-600" :
                  run.status === "pending_approval" ? "bg-yellow-100 text-yellow-700" :
                  "bg-blue-100 text-blue-700"
                }`}>{run.status.replace(/_/g, " ")}</span>
              </div>
            </div>
          </a>
        ))}
        {runs.length === 0 && <p className="text-gray-400 text-sm">No runs yet. Start one!</p>}
      </div>
    </div>
  );
}
