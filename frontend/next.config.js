/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@etsy-orchestrator/backend", "@etsy-orchestrator/agents", "@etsy-orchestrator/shared"],
  webpack: (config) => {
    // The workspace packages are authored with NodeNext ".js" import specifiers that
    // actually point at ".ts" sources (e.g. db/queries/products.ts imports "../index.js").
    // transpilePackages compiles those packages, but webpack still needs to resolve the
    // ".js" specifier to the on-disk ".ts" file — otherwise routes 500 with "Module not found".
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};
module.exports = nextConfig;
