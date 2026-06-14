"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewRun() {
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function start() {
    setLoading(true);
    const seed_keywords = keywords.trim() ? keywords.split(",").map((k) => k.trim()) : undefined;
    const res = await fetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seed_keywords }),
    });
    const run = await res.json() as { id: string };
    router.push(`/runs/${run.id}`);
  }

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-bold">New Run</h1>
      <div className="bg-white border rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Seed Keywords <span className="text-gray-400">(optional)</span></label>
          <input value={keywords} onChange={(e) => setKeywords(e.target.value)}
            placeholder="e.g. native austinite, texas pride"
            className="w-full border rounded px-3 py-2 text-sm" />
          <p className="text-xs text-gray-400 mt-1">Leave blank for fully autonomous niche discovery.</p>
        </div>
        <button onClick={start} disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded font-medium disabled:opacity-50">
          {loading ? "Starting..." : "Start Run"}
        </button>
      </div>
    </div>
  );
}
