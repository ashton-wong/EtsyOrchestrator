"use client";
import { useEffect, useState } from "react";
import { PipelineStatus } from "../../../components/PipelineStatus";
import { DesignPicker } from "../../../components/DesignPicker";
import type { RunStatus } from "@etsy-orchestrator/shared";

type Run = {
  id: string; status: RunStatus;
  trend_report: { niche_name: string; trend_score: number; cultural_context: string } | null;
  design_batch: { designs: { image_url: string; prompt_used: string; rank: number }[] } | null;
  product_copy: { title: string; description: string; tags: string[]; price_suggestion: number } | null;
};

export default function RunDetail({ params }: { params: { id: string } }) {
  const [run, setRun] = useState<Run | null>(null);

  useEffect(() => {
    fetch(`/api/runs/${params.id}`).then((r) => r.json()).then(setRun);
  }, [params.id]);

  if (!run) return <div className="text-gray-400">Loading...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">
          {run.trend_report?.niche_name ?? "Run"} <span className="text-gray-400 font-mono text-lg">#{run.id.slice(0, 8)}</span>
        </h1>
        {run.trend_report && (
          <p className="text-gray-500 text-sm">{run.trend_report.cultural_context}</p>
        )}
      </div>

      <PipelineStatus runId={run.id} initialStatus={run.status} />

      {run.status === "pending_approval" && run.design_batch && run.product_copy && (
        <div className="bg-white border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-lg">Review & Approve</h2>
          <DesignPicker
            runId={run.id}
            designs={run.design_batch.designs}
            initialCopy={run.product_copy}
            onComplete={() => window.location.reload()}
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
