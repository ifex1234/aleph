import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load the repo-root .env (dev helper; Vercel injects real env vars, and
// dotenv never overrides what's already set).
config({ path: "../.env" });

const url = process.env.ANALYTICS_DATABASE_URL;
if (!url) {
  throw new Error(
    "Set ANALYTICS_DATABASE_URL before running drizzle-kit (db:generate | db:migrate | db:push | db:studio). Example: ANALYTICS_DATABASE_URL='postgres://...' npm run db:push"
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url,
  },
});
