// Usage: npm run list — prints all companies and their projects.
import "dotenv/config";
import { prisma } from "../src/lib/db";

const companies = await prisma.company.findMany({
  include: { projects: true },
  orderBy: { name: "asc" },
});

if (companies.length === 0) console.log("No companies yet.");
for (const c of companies) {
  console.log(`${c.name} (username: ${c.username}, id: ${c.id})`);
  if (c.projects.length === 0) console.log("  (no projects)");
  for (const p of c.projects) {
    console.log(`  - [${p.id}] ${p.name} — ${p.provider}:${p.repo}`);
  }
}
await prisma.$disconnect();
