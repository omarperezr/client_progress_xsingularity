// Usage: npm run create-company -- "<Company Name>" <username> <password>
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";

const [name, username, password] = process.argv.slice(2);

if (!name || !username || !password) {
  console.error('Usage: npm run create-company -- "<Company Name>" <username> <password>');
  process.exit(1);
}

try {
  const company = await prisma.company.create({
    data: { name, username, passwordHash: bcrypt.hashSync(password, 12) },
  });
  console.log(`Created company "${company.name}" (id ${company.id}) with username "${company.username}".`);
} catch (err) {
  if (err instanceof Error && err.message.includes("Unique constraint")) {
    console.error(`Username "${username}" already exists.`);
    process.exit(1);
  }
  throw err;
} finally {
  await prisma.$disconnect();
}
