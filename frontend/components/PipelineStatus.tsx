"use client";
import { useEffect, useState } from "react";
import type { RunStatus } from "@etsy-orchestrator/shared";

const STEPS: { status: RunStatus; label: string }[] = [
  { status: "researching", label: "Researching niche" },
  { status: "designing", label: "Generating designs" },
  { status: "generating_copy", label: "Writing copy" },
  { status: "pending_approval", label: "Awaiting approval" },
  { status: "deploying", label: "Publishing" },
  { status: "live", label: "Live on Etsy" },
];

export function PipelineStatus({ runId, initialStatus }: { runId: string; initialStatus: RunStatus }) {
  const [status, setStatus] = useState<RunStatus>(initialStatus);

  useEffect(() => {
    if (["live", "rejected", "failed"].includes(status)) return;
    const es = new EventSource(`/api/runs/${runId}/stream`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data) as { status: RunStatus };
      setStatus(data.status);
    };
    return () => es.close();
  }, [runId, status]);

  const currentIdx = STEPS.findIndex((s) => s.status === status);

  return (
    <ol className="flex gap-4 items-center">
      {STEPS.map((step, i) => (
        <li key={step.status} className="flex items-center gap-2">
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
            i < currentIdx ? "bg-green-500 text-white" :
            i === currentIdx ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-500"
          }`}>{i + 1}</span>
          <span className={`text-sm ${i === currentIdx ? "font-semibold" : "text-gray-500"}`}>{step.label}</span>
          {i < STEPS.length - 1 && <span className="text-gray-300">→</span>}
        </li>
      ))}
      {status === "failed" && <li className="text-red-600 font-semibold">Failed</li>}
      {status === "rejected" && <li className="text-gray-500">Discarded</li>}
    </ol>
  );
}
