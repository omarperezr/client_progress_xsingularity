import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionCompany } from "@/lib/auth";
import { fetchIssues, computeProgress } from "@/lib/providers";
import type { NormalizedIssue } from "@/lib/providers/types";
import { formatMinutes } from "@/lib/estimate";
import { Header } from "@/components/Header";
import { ProgressBar } from "@/components/ProgressBar";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const company = await getSessionCompany();
  if (!company) redirect("/login");

  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id: Number(id) || 0, companyId: company.id },
  });
  if (!project) notFound();

  let issues: NormalizedIssue[] | null = null;
  try {
    issues = await fetchIssues(project.provider, project);
  } catch (err) {
    console.error(`Failed to fetch issues for project ${project.id}:`, err);
  }

  return (
    <div className="min-h-screen w-full bg-zinc-950">
      <Header companyName={company.name} />
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">
          ← All projects
        </Link>
        <div className="mt-3 mb-6 flex items-center gap-3">
          <h1 className="text-xl font-semibold text-white">{project.name}</h1>
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs uppercase tracking-wide text-zinc-400">
            {project.provider}
          </span>
        </div>

        {!issues ? (
          <p className="rounded-md bg-red-500/10 px-4 py-3 text-sm text-red-400">
            Could not load issues from {project.provider}. Please try again later.
          </p>
        ) : (
          <ProjectDetails issues={issues} />
        )}
      </main>
    </div>
  );
}

function ProjectDetails({ issues }: { issues: NormalizedIssue[] }) {
  const progress = computeProgress(issues);
  const hasTimeSpent = issues.some((i) => i.spentMinutes !== null);
  const sorted = [...issues].sort((a, b) =>
    a.state === b.state ? a.id - b.id : a.state === "open" ? -1 : 1,
  );

  return (
    <>
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <ProgressBar percent={progress.percentByIssues} label="Overall progress (by tasks)" />
        {progress.percentByTime !== null && (
          <div className="mt-4">
            <ProgressBar percent={progress.percentByTime} label="Progress by estimated time" />
          </div>
        )}
        <dl
          className={`mt-5 grid grid-cols-2 gap-3 text-center text-sm ${hasTimeSpent ? "sm:grid-cols-5" : "sm:grid-cols-4"}`}
        >
          <Stat label="Tasks done" value={`${progress.closedIssues}/${progress.totalIssues}`} />
          <Stat label="Est. project total" value={formatMinutes(progress.totalMinutes) ?? "—"} />
          <Stat label="Est. completed" value={formatMinutes(progress.doneMinutes) ?? "—"} />
          {hasTimeSpent && (
            <Stat label="Time logged" value={formatMinutes(progress.spentMinutes) ?? "—"} />
          )}
          <Stat label="Est. remaining" value={formatMinutes(progress.remainingMinutes) ?? "—"} />
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-400">
          Tasks
        </h2>
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Task</th>
                <th className="px-4 py-3 font-medium">Assigned to</th>
                <th className="px-4 py-3 font-medium">Estimate</th>
                {hasTimeSpent && <th className="px-4 py-3 font-medium">Time spent</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-zinc-950">
              {sorted.map((issue) => (
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
                  {hasTimeSpent && (
                    <td className="px-4 py-3 text-zinc-400">
                      {formatMinutes(issue.spentMinutes) ?? "—"}
                    </td>
                  )}
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={hasTimeSpent ? 5 : 4} className="px-4 py-6 text-center text-zinc-500">
                    No tasks created yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-zinc-800/60 p-3">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-1 font-medium text-zinc-200">{value}</dd>
    </div>
  );
}
