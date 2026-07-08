import "dotenv/config";
import dns from "node:dns";
import { defineConfig } from "prisma/config";

// Same IPv4-first preference as src/lib/db.ts, for CLI commands (db push etc).
dns.setDefaultResultOrder("ipv4first");

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
