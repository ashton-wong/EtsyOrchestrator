/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@etsy-orchestrator/backend", "@etsy-orchestrator/agents", "@etsy-orchestrator/shared"],
};
module.exports = nextConfig;
