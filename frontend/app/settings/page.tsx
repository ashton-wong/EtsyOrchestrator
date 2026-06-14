export default function Settings() {
  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="bg-white border rounded-xl p-6 space-y-4">
        <p className="text-sm text-gray-600">
          API credentials are configured via environment variables in <code className="bg-gray-100 px-1 rounded">.env</code>.
          See <code className="bg-gray-100 px-1 rounded">.env.example</code> for all required keys.
        </p>
        <div className="space-y-2 text-sm text-gray-700">
          <p>• <strong>ANTHROPIC_API_KEY</strong> — Claude Sonnet</p>
          <p>• <strong>NANO_BANANA_API_KEY</strong> — Image generation</p>
          <p>• <strong>ETSY_API_KEY / ETSY_ACCESS_TOKEN</strong> — Etsy OAuth</p>
          <p>• <strong>PRINTIFY_API_KEY / PRINTIFY_SHOP_ID / PRINTIFY_BLANK_SKU_ID</strong> — Printify</p>
          <p>• <strong>REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET</strong> — Reddit API</p>
        </div>
      </div>
    </div>
  );
}
