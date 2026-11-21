import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // `prisma generate` only needs the schema. A Vercel build runs it before
    // runtime environment variables are available, so use the local default
    // solely for generation. lib/env.ts still requires DATABASE_URL at runtime.
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  },
});
