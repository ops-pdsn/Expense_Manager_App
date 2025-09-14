import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL && !process.env.SUPABASE_DB_URL) {
  throw new Error("Either DATABASE_URL or SUPABASE_DB_URL must be set. Please configure your Supabase database connection string.");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || "",
  },
});
