import dns from "node:dns";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prefer IPv4: hosts with a broken IPv6 route otherwise hang connecting to
// DBs whose DNS returns AAAA records first (e.g. Neon), surfacing as P1001.
dns.setDefaultResultOrder("ipv4first");

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
