import { defineConfig } from "vitest/config";
import path from "path";
import { loadEnvConfig } from "@next/env";

// ─────────────────────────────────────────────────────
// ENVIRONMENT LOADING
// ─────────────────────────────────────────────────────
// Vitest loads NO env files by itself — only `next dev` / `next build`
// load them (via @next/env). Without this block, server-side integration
// tests cannot see variables such as OPENAI_API_KEY that live in
// .env.local. (DATABASE_URL only worked before because Prisma Client
// loads .env — not .env.local — on its own.)
//
// loadEnvConfig() fills process.env using the same files and precedence
// rules as `next dev` (.env.local overrides .env; pre-existing process.env
// values are never overridden). It intentionally skips .env.local when
// NODE_ENV=test, and Vitest forces NODE_ENV=test — so we briefly switch
// to development mode while loading and restore NODE_ENV afterwards.
//
// SECURITY: values stay inside the Node test process only. Nothing is
// exposed to client-side code, and no keys are hardcoded here.

// Next.js types NODE_ENV as readonly on ProcessEnv, so use a mutable view
// for the temporary switch (runtime assignment is perfectly legal).
const mutableEnv = process.env as Record<string, string | undefined>;
const previousNodeEnv = mutableEnv.NODE_ENV;
mutableEnv.NODE_ENV = "development";
loadEnvConfig(process.cwd(), true);
mutableEnv.NODE_ENV = previousNodeEnv;

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
