import type { Config } from "tailwindcss";
import path from "path";

// Use __dirname so content globs resolve relative to this config file,
// not the CWD where `next dev frontend` is invoked from the repo root.
export default {
  content: [
    path.join(__dirname, "./app/**/*.{ts,tsx}"),
    path.join(__dirname, "./components/**/*.{ts,tsx}"),
  ],
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
