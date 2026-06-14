"use client";
import { useState } from "react";
import type { DesignBatch } from "@etsy-orchestrator/agents/handoffs/DesignBatch";
import type { ProductCopy } from "@etsy-orchestrator/agents/handoffs/ProductCopy";

export function DesignPicker({ runId, designs, initialCopy, onComplete }: {
  runId: string;
  designs: DesignBatch["designs"];
  initialCopy: ProductCopy;
  onComplete: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [copy, setCopy] = useState(initialCopy);
  const [submitting, setSubmitting] = useState(false);

  async function approve() {
    if (selected === null) return;
    setSubmitting(true);
    await fetch(`/api/runs/${runId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve", selected_design_index: selected, copy_overrides: copy }),
    });
    onComplete();
  }

  async function discard() {
    setSubmitting(true);
    await fetch(`/api/runs/${runId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "discard" }),
    });
    onComplete();
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {designs.map((d, i) => (
          <button key={i} onClick={() => setSelected(i)}
            className={`border-2 rounded-lg overflow-hidden transition ${
              selected === i ? "border-blue-500 ring-2 ring-blue-300" : "border-gray-200 hover:border-gray-400"
            }`}>
            <img src={d.image_url} alt={`Design ${i + 1}`} className="w-full aspect-square object-contain bg-white" />
            <div className="p-2 text-xs text-gray-500">Rank #{d.rank}</div>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium">Title</label>
        <input value={copy.title} onChange={(e) => setCopy({ ...copy, title: e.target.value })}
          className="w-full border rounded px-3 py-2 text-sm" maxLength={140} />
        <label className="block text-sm font-medium">Description</label>
        <textarea value={copy.description} onChange={(e) => setCopy({ ...copy, description: e.target.value })}
          className="w-full border rounded px-3 py-2 text-sm" rows={4} />
        <label className="block text-sm font-medium">Tags (comma-separated)</label>
        <input value={copy.tags.join(",")} onChange={(e) => setCopy({ ...copy, tags: e.target.value.split(",") })}
          className="w-full border rounded px-3 py-2 text-sm" />
      </div>

      <div className="flex gap-3">
        <button onClick={approve} disabled={selected === null || submitting}
          className="bg-green-600 text-white px-6 py-2 rounded disabled:opacity-50">
          Approve &amp; Publish
        </button>
        <button onClick={discard} disabled={submitting}
          className="bg-gray-200 text-gray-700 px-6 py-2 rounded">
          Discard
        </button>
      </div>
    </div>
  );
}
