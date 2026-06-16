import { defineConfig } from "drizzle-kit";

// drizzle-kit doesn't accept --env-file, so load the repo-root .env ourselves.
// db:migrate / db:generate always run from the backend/ workspace dir.
try {
  process.loadEnvFile("../.env");
} catch {
  // .env is optional — env vars may already be set (e.g. in CI/prod).
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
