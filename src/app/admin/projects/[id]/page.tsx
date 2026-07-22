import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { fetchIssues, computeProgress } from "@/lib/providers";
import type { NormalizedIssue } from "@/lib/providers/types";
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
import { deleteProject, updateProject } from "../../actions";

export const dynamic = "force-dynamic";

export default async function AdminProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const { ok, error } = await searchParams;

  const project = await prisma.project.findUnique({
    where: { id: Number(id) || 0 },
    include: { company: true },
  });
  if (!project) notFound();

  const companies = await prisma.company.findMany({ orderBy: { name: "asc" } });

  let issues: NormalizedIssue[] | null = null;
  try {
    issues = await fetchIssues(project.provider, project);
  } catch (err) {
    console.error(`Failed to fetch issues for project ${project.id}:`, err);
  }
  const progress = issues ? computeProgress(issues) : null;

  return (
    <div className="min-h-screen w-full bg-zinc-950">
      <AdminHeader admin={admin} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <Link
          href={`/admin/companies/${project.companyId}`}
          className="text-sm text-zinc-400 hover:text-zinc-200"
        >
          ← {project.company.name}
        </Link>
        <div className="mt-3 mb-6 flex items-center gap-3">
          <h1 className="text-xl font-semibold text-white">{project.name}</h1>
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs uppercase tracking-wide text-zinc-400">
            {project.provider}:{project.repo}
          </span>
        </div>
        <Banner ok={ok} error={error} />

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <Card title="Live progress" description="Read straight from the provider's issues.">
              {progress ? (
                <>
                  <ProgressBar percent={progress.percentByIssues} label="By tasks" />
                  {progress.percentByTime !== null && (
                    <div className="mt-4">
                      <ProgressBar percent={progress.percentByTime} label="By estimated time" />
                    </div>
                  )}
                  <dl className="mt-5 grid grid-cols-2 gap-3 text-center text-sm sm:grid-cols-4">
                    <MiniStat
                      label="Tasks done"
                      value={`${progress.closedIssues}/${progress.totalIssues}`}
                    />
                    <MiniStat
                      label="Est. total"
                      value={formatMinutes(progress.totalMinutes) ?? "—"}
                    />
                    <MiniStat
                      label="Time logged"
                      value={formatMinutes(progress.spentMinutes) ?? "—"}
                    />
                    <MiniStat
                      label="Est. remaining"
                      value={formatMinutes(progress.remainingMinutes) ?? "—"}
                    />
                  </dl>
                </>
              ) : (
                <p className="text-sm text-red-400">
                  Could not load issues from {project.provider}. Check the repo path, the token and
                  the base URL.
                </p>
              )}
            </Card>

            {issues && (
              <div className="overflow-x-auto rounded-xl border border-zinc-800">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Task</th>
                      <th className="px-4 py-3 font-medium">Assigned to</th>
                      <th className="px-4 py-3 font-medium">Estimate</th>
                      <th className="px-4 py-3 font-medium">Time spent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 bg-zinc-950">
                    {[...issues]
                      .sort((a, b) =>
                        a.state === b.state ? a.id - b.id : a.state === "open" ? -1 : 1,
                      )
                      .map((issue) => (
                        <tr key={issue.id}>
                          <td className="px-4 py-3">
                            {issue.state === "closed" ? (
                              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                                Done
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
                                In progress
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-zinc-200">
                            <a
                              href={issue.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              {issue.title}
                            </a>
                          </td>
                          <td className="px-4 py-3 text-zinc-400">
                            {issue.assignees.length ? issue.assignees.join(", ") : "—"}
                          </td>
                          <td className="px-4 py-3 text-zinc-400">
                            {formatMinutes(issue.estimateMinutes) ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-zinc-400">
                            {formatMinutes(issue.spentMinutes) ?? "—"}
                          </td>
                        </tr>
                      ))}
                    {issues.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                          No issues in this repo yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <Card title="Settings">
              <form action={updateProject} className="space-y-3">
                <input type="hidden" name="id" value={project.id} />
                <Field label="Project name" name="name" defaultValue={project.name} required />
                <SelectField
                  label="Client"
                  name="companyId"
                  defaultValue={String(project.companyId)}
                  options={companies.map((c) => ({ value: String(c.id), label: c.name }))}
                />
                <SelectField
                  label="Provider"
                  name="provider"
                  defaultValue={project.provider}
                  options={[
                    { value: "github", label: "GitHub" },
                    { value: "gitlab", label: "GitLab" },
                  ]}
                />
                <Field label="Repo" name="repo" defaultValue={project.repo} required />
                <Field
                  label="Token"
                  name="token"
                  type="password"
                  hint="Leave empty to keep the current token."
                />
                <Field
                  label="Base URL (optional)"
                  name="baseUrl"
                  defaultValue={project.baseUrl}
                  hint="Only for GitHub Enterprise or self-managed GitLab."
                />
                <SubmitButton>Save changes</SubmitButton>
              </form>
            </Card>

            <DangerZone
              summary="Delete this project"
              warning={`Permanently removes "${project.name}" from ${project.company.name}. The repository itself is untouched.`}
            >
              <form action={deleteProject}>
                <input type="hidden" name="id" value={project.id} />
                <DangerButton>Yes, delete permanently</DangerButton>
              </form>
            </DangerZone>
          </div>
        </div>
      </main>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-zinc-800/60 p-3">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-1 font-medium text-zinc-200">{value}</dd>
    </div>
  );
}
