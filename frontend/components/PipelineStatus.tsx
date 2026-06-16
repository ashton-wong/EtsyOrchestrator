"use client";
import type { RunStatus } from "@etsy-orchestrator/shared";

const STEPS: { status: RunStatus; label: string }[] = [
  { status: "researching", label: "Researching niche" },
  { status: "designing", label: "Generating designs" },
  { status: "generating_copy", label: "Writing copy" },
  { status: "pending_approval", label: "Awaiting approval" },
  { status: "deploying", label: "Publishing" },
  { status: "live", label: "Live on Etsy" },
];

// Presentational only — the run-detail page owns the SSE subscription and feeds
// `status` down, so the whole page (incl. the approval block) reacts to changes.
export function PipelineStatus({ status }: { status: RunStatus }) {
  const displayStatus = status === "updating" ? "deploying" : status;
  const currentIdx = STEPS.findIndex((s) => s.status === displayStatus);

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
