"use client";

type Signal = { views: number; favorites: number; orders: number; checked_at: string };

export function AnalyticsChart({ signals }: { signals: Signal[] }) {
  if (!signals.length) return <p className="text-gray-400 text-sm">No data yet.</p>;

  const maxViews = Math.max(...signals.map((s) => s.views), 1);

  return (
    <div className="space-y-2">
      <div className="flex gap-1 items-end h-24">
        {signals.map((s, i) => (
          <div key={i} title={`${s.views} views on ${new Date(s.checked_at).toLocaleDateString()}`}
            style={{ height: `${(s.views / maxViews) * 100}%` }}
            className="flex-1 bg-blue-400 rounded-t min-h-[2px]" />
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>{new Date(signals[0].checked_at).toLocaleDateString()}</span>
        <span>{new Date(signals[signals.length - 1].checked_at).toLocaleDateString()}</span>
      </div>
      <div className="flex gap-6 text-sm">
        <span>👁️ {signals[signals.length - 1].views} views</span>
        <span>❤️ {signals[signals.length - 1].favorites} favorites</span>
        <span>📦 {signals[signals.length - 1].orders} orders</span>
      </div>
    </div>
  );
}
