// Usage:
//   npm run add-project -- <company-username> "<Project Name>" <github|gitlab> <repo> <token> [baseUrl]
//
//   repo  — GitHub: "owner/repo". GitLab: numeric project id or "group/project" path.
//   token — read-only access token for that repo's issues.
//   baseUrl — optional, for GitHub Enterprise (e.g. https://ghe.example.com/api/v3)
//             or self-managed GitLab (e.g. https://gitlab.example.com).
import "dotenv/config";
import { prisma } from "../src/lib/db";

const [companyUsername, name, provider, repo, token, baseUrl] = process.argv.slice(2);

if (!companyUsername || !name || !provider || !repo || !token) {
  console.error(
    'Usage: npm run add-project -- <company-username> "<Project Name>" <github|gitlab> <repo> <token> [baseUrl]',
  );
  process.exit(1);
}

if (provider !== "github" && provider !== "gitlab") {
  console.error(`Provider must be "github" or "gitlab", got "${provider}".`);
  process.exit(1);
}

const company = await prisma.company.findUnique({ where: { username: companyUsername } });
if (!company) {
  console.error(`No company with username "${companyUsername}". Create it first with create-company.`);
  process.exit(1);
}

const project = await prisma.project.create({
  data: { companyId: company.id, name, provider, repo, token, baseUrl: baseUrl || null },
});
console.log(
  `Created project "${project.name}" (id ${project.id}) for "${company.name}" — ${provider}:${repo}.`,
);
await prisma.$disconnect();
