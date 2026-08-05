import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { fetchIssuesLive, computeProgress } from "@/lib/providers";
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
import { MeetingUpload } from "@/components/MeetingUpload";
import { createMeetingFromTranscript, deleteProject, updateProject } from "../../actions";

export const dynamic = "force-dynamic";
// Uploading a meeting ends with a Groq Whisper call; allow more than the default runtime.
export const maxDuration = 60;

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
    include: {
      company: true,
      meetings: { orderBy: { createdAt: "desc" }, include: { _count: { select: { draftIssues: true } } } },
    },
  });
  if (!project) notFound();

  const companies = await prisma.company.findMany({ orderBy: { name: "asc" } });

  let issues: NormalizedIssue[] | null = null;
  try {
    issues = await fetchIssuesLive(project.provider, project);
  } catch (err) {
    console.error(`Failed to fetch issues for project ${project.id}:`, err);
  }
  const progress = issues ? computeProgress(issues) : null;

  return (
    <div className="min-h-screen w-full">
      <AdminHeader admin={admin} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <Link
          href={`/admin/companies/${project.companyId}`}
          className="label-caps text-xs text-ink-soft transition-colors hover:text-ink"
        >
          ← {project.company.name}
        </Link>
        <div className="mt-3 mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-b-2 border-ink pb-3">
          <h1 className="text-2xl font-semibold leading-tight text-ink">{project.name}</h1>
          <span className="font-mono text-xs text-ink-soft">
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
                  <dl className="mt-5 grid grid-cols-2 gap-px border border-ink bg-ink sm:grid-cols-4">
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
                <p className="text-sm font-medium text-exception">
                  Could not load issues from {project.provider}. Check the repo path, the token and
                  the base URL.
                </p>
              )}
            </Card>

            {issues && (
              <div className="sheet overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="label-caps border-b border-ink text-[10px] text-ink-soft">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Task</th>
                      <th className="px-4 py-3 font-semibold">Assigned to</th>
                      <th className="px-4 py-3 font-semibold">Estimate</th>
                      <th className="px-4 py-3 font-semibold">Time spent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule">
                    {[...issues]
                      .sort((a, b) =>
                        a.state === b.state ? a.id - b.id : a.state === "open" ? -1 : 1,
                      )
                      .map((issue) => (
                        <tr key={issue.id}>
                          <td className="px-4 py-3">
                            {issue.state === "closed" ? (
                              <span className="stamp text-[10px] text-delivered">Done</span>
                            ) : (
                              <span className="stamp text-[10px] text-transit">In progress</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium text-ink">
                            <a
                              href={issue.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              {issue.title}
                            </a>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-ink-soft">
                            {issue.assignees.length ? issue.assignees.join(", ") : "—"}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-ink-soft">
                            {formatMinutes(issue.estimateMinutes) ?? "—"}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-ink-soft">
                            {formatMinutes(issue.spentMinutes) ?? "—"}
                          </td>
                        </tr>
                      ))}
                    {issues.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-ink-soft">
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
            <Card
              title="Meetings"
              description="Upload the kick-off recording; Whisper transcribes it and the AI drafts issues for review."
            >
              <MeetingUpload projectId={project.id} />
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-ink-soft transition-colors hover:text-ink">
                  Or paste a transcript instead
                </summary>
                <form action={createMeetingFromTranscript} className="mt-3 space-y-3">
                  <input type="hidden" name="projectId" value={project.id} />
                  <Field label="Title" name="title" placeholder="Kick-off call notes" />
                  <label className="block">
                    <span className="label-caps mb-1 block text-[11px] text-ink-soft">Transcript</span>
                    <textarea name="transcript" rows={6} required className="input" />
                  </label>
                  <SubmitButton pendingText="Saving…">Save transcript</SubmitButton>
                </form>
              </details>
              {project.meetings.length > 0 && (
                <ul className="mt-4 divide-y divide-rule border-t border-rule">
                  {project.meetings.map((m) => (
                    <li key={m.id} className="py-2">
                      <Link
                        href={`/admin/meetings/${m.id}`}
                        className="text-sm font-medium text-ink hover:underline"
                      >
                        {m.filename}
                      </Link>
                      <span className="ml-2 font-mono text-xs text-ink-soft">
                        {m.status}
                        {m._count.draftIssues ? ` · ${m._count.draftIssues} drafts` : ""} ·{" "}
                        {m.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

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
    <div className="bg-sheet px-3 py-2">
      <dt className="label-caps text-[10px] text-ink-soft">{label}</dt>
      <dd className="mt-0.5 font-mono text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}
