"use client";
import { useEffect, useState } from "react";
import { PipelineStatus } from "../../../components/PipelineStatus";
import { DesignPicker } from "../../../components/DesignPicker";
import type { RunStatus } from "@etsy-orchestrator/shared";

type Run = {
  id: string;
  status: RunStatus;
  run_type: "new_product" | "copy_refresh";
  triggered_by: "human" | "analyst";
  source_product_id: string | null;
  trend_report: { niche_name: string; trend_score: number; cultural_context: string } | null;
  design_batch: { designs: { image_url: string; prompt_used: string; rank: number }[] } | null;
  product_copy: { title: string; description: string; tags: string[]; price_suggestion: number } | null;
};

export default function RunDetail({ params }: { params: { id: string } }) {
  const [run, setRun] = useState<Run | null>(null);

  useEffect(() => {
    let es: EventSource | null = null;
    let cancelled = false;

    fetch(`/api/runs/${params.id}`)
      .then((r) => r.json())
      .then((initial: Run) => {
        if (cancelled) return;
        setRun(initial);
        if (["live", "rejected", "failed"].includes(initial.status)) return;

        // Stream status changes; the payload carries the full run, so product_copy /
        // design_batch arrive with it and the approval block renders without a reload.
        es = new EventSource(`/api/runs/${params.id}/stream`);
        es.onmessage = (e) => {
          const data = JSON.parse(e.data) as { status: RunStatus; run: Run };
          setRun(data.run);
          if (["live", "rejected", "failed"].includes(data.status)) es?.close();
        };
      });

    return () => { cancelled = true; es?.close(); };
  }, [params.id]);

  if (!run) return <div className="text-gray-400">Loading...</div>;

  const title = run.run_type === "copy_refresh"
    ? `Copy Refresh`
    : (run.trend_report?.niche_name ?? "Run");

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold">{title}</h1>
          <span className="font-mono text-gray-400 text-lg">#{run.id.slice(0, 8)}</span>
          {run.triggered_by === "analyst" && (
            <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">Analyst</span>
          )}
          {run.run_type === "copy_refresh" && (
            <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700">Copy Refresh</span>
          )}
        </div>
        {run.trend_report && (
          <p className="text-gray-500 text-sm">{run.trend_report.cultural_context}</p>
        )}
      </div>

      <PipelineStatus status={run.status} />

      {run.status === "pending_approval" && run.product_copy && (
        <div className="bg-white border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-lg">Review & Approve</h2>
          <DesignPicker
            runId={run.id}
            designs={run.design_batch?.designs ?? []}
            initialCopy={run.product_copy}
            onComplete={() => window.location.reload()}
            mode={run.run_type}
          />
        </div>
      )}

      {run.status === "live" && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <p className="text-green-700 font-semibold">✓ Published to Etsy</p>
        </div>
      )}
    </div>
  );
}
