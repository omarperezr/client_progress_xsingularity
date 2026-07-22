import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { fetchIssues, computeProgress, type ProjectProgress } from "@/lib/providers";
import { formatMinutes } from "@/lib/estimate";
import { AdminHeader } from "@/components/AdminHeader";
import { ProgressBar } from "@/components/ProgressBar";
import {
  Banner,
  Card,
  DangerButton,
  DangerZone,
  Field,
  SelectField,
  SubmitButton,
} from "@/components/AdminForm";
import { createProject, deleteCompany, impersonateCompany, updateCompany } from "../../actions";

export const dynamic = "force-dynamic";

export default async function AdminCompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const { ok, error } = await searchParams;

  const company = await prisma.company.findUnique({
    where: { id: Number(id) || 0 },
    include: { projects: { orderBy: { name: "asc" } } },
  });
  if (!company) notFound();

  const progressByProject = new Map<number, ProjectProgress | null>(
    await Promise.all(
      company.projects.map(async (p): Promise<[number, ProjectProgress | null]> => {
        try {
          return [p.id, computeProgress(await fetchIssues(p.provider, p))];
        } catch (err) {
          console.error(`Failed to fetch issues for project ${p.id}:`, err);
          return [p.id, null];
        }
      }),
    ),
  );

  return (
    <div className="min-h-screen w-full bg-zinc-950">
      <AdminHeader admin={admin} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <Link href="/admin" className="text-sm text-zinc-400 hover:text-zinc-200">
          ← All clients
        </Link>
        <div className="mt-3 mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-white">{company.name}</h1>
          <form action={impersonateCompany}>
            <input type="hidden" name="id" value={company.id} />
            <button
              type="submit"
              className="rounded-md border border-indigo-500/40 px-3 py-1.5 text-sm text-indigo-300 transition hover:bg-indigo-500/10"
              title="Open this client's own dashboard"
            >
              View as {company.name}
            </button>
          </form>
        </div>
        <Banner ok={ok} error={error} />

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <Card title="Projects" description="Each project is backed by one repository.">
              {company.projects.length === 0 ? (
                <p className="text-sm text-zinc-500">No projects yet.</p>
              ) : (
                <ul className="space-y-3">
                  {company.projects.map((project) => {
                    const progress = progressByProject.get(project.id) ?? null;
                    return (
                      <li
                        key={project.id}
                        className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <Link
                            href={`/admin/projects/${project.id}`}
                            className="text-sm font-medium text-white hover:underline"
                          >
                            {project.name}
                          </Link>
                          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
                            {project.provider}:{project.repo}
                          </span>
                        </div>
                        {progress ? (
                          <>
                            <ProgressBar percent={progress.percentByIssues} />
                            <p className="mt-2 text-xs text-zinc-500">
                              {progress.closedIssues}/{progress.totalIssues} tasks ·{" "}
                              {formatMinutes(progress.totalMinutes) ?? "—"} estimated ·{" "}
                              {formatMinutes(progress.remainingMinutes) ?? "—"} remaining
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-red-400">
                            Could not load issues from {project.provider}.
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card title="Add project" description="Links a GitHub or GitLab repo to this client.">
              <form action={createProject} className="space-y-3">
                <input type="hidden" name="companyId" value={company.id} />
                <Field label="Project name" name="name" required placeholder="Acme Webshop" />
                <SelectField
                  label="Provider"
                  name="provider"
                  defaultValue="github"
                  options={[
                    { value: "github", label: "GitHub" },
                    { value: "gitlab", label: "GitLab" },
                  ]}
                />
                <Field
                  label="Repo"
                  name="repo"
                  required
                  placeholder="owner/repo"
                  hint='GitHub: "owner/repo". GitLab: numeric project ID or "group/project".'
                />
                <Field
                  label="Token"
                  name="token"
                  type="password"
                  required
                  hint="Read-only token scoped to this repo's issues."
                />
                <Field
                  label="Base URL (optional)"
                  name="baseUrl"
                  placeholder="https://gitlab.example.com"
                  hint="Only for GitHub Enterprise or self-managed GitLab."
                />
                <SubmitButton>Add project</SubmitButton>
              </form>
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="Client login">
              <form action={updateCompany} className="space-y-3">
                <input type="hidden" name="id" value={company.id} />
                <Field label="Company name" name="name" defaultValue={company.name} required />
                <Field label="Username" name="username" defaultValue={company.username} required />
                <Field
                  label="New password"
                  name="password"
                  type="password"
                  hint="Leave empty to keep the current password."
                />
                <SubmitButton>Save changes</SubmitButton>
              </form>
            </Card>

            <DangerZone
              summary="Delete this client"
              warning={`Permanently deletes "${company.name}", its login and its ${company.projects.length} project(s). This cannot be undone.`}
            >
              <form action={deleteCompany}>
                <input type="hidden" name="id" value={company.id} />
                <DangerButton>Yes, delete permanently</DangerButton>
              </form>
            </DangerZone>
          </div>
        </div>
      </main>
    </div>
  );
}
