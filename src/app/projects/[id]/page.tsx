import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionCompany } from "@/lib/auth";
import { fetchIssues, computeProgress } from "@/lib/providers";
import type { NormalizedIssue } from "@/lib/providers/types";
import { computeAnalytics, type Forecast } from "@/lib/analytics";
import { mailConfigured } from "@/lib/mailer";
import { formatMinutes } from "@/lib/estimate";
import { Header } from "@/components/Header";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { ProgressBar } from "@/components/ProgressBar";
import { Burnup, VelocityChart, StatusBar, BreakdownList } from "@/components/Charts";
import { IssueRow, type IssueRowData } from "@/components/IssueRow";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const company = await getSessionCompany();
  if (!company) redirect("/login");

  const { id } = await params;
  const projectId = Number(id) || 0;
  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId: company.id },
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
      <ImpersonationBanner companyName={company.name} />
      <Header companyName={company.name} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
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
          <Dashboard projectId={projectId} issues={issues} emailEnabled={mailConfigured()} />
        )}
      </main>
    </div>
  );
}

function Dashboard({
  projectId,
  issues,
  emailEnabled,
}: {
  projectId: number;
  issues: NormalizedIssue[];
  emailEnabled: boolean;
}) {
  const progress = computeProgress(issues);
  const a = computeAnalytics(issues);
  const hasTimeSpent = issues.some((i) => i.spentMinutes !== null);

  const rows: IssueRowData[] = [...issues]
    .sort((x, y) => (x.state === y.state ? x.id - y.id : x.state === "open" ? -1 : 1))
    .map((i) => ({
      id: i.id,
      title: i.title,
      state: i.state,
      assignees: i.assignees,
      estimateMinutes: i.estimateMinutes,
      spentMinutes: i.spentMinutes,
      url: i.url,
      commentCount: i.commentCount,
    }));

  return (
    <div className="space-y-6">
      {/* Headline: forecast + progress */}
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <ForecastCard forecast={a.forecast} remainingMinutes={progress.remainingMinutes} />
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <ProgressBar percent={progress.percentByIssues} label="Overall progress (by tasks)" />
          {progress.percentByTime !== null && (
            <div className="mt-4">
              <ProgressBar percent={progress.percentByTime} label="Progress by estimated time" />
            </div>
          )}
          <div className="mt-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Task status</p>
            <StatusBar status={a.status} />
          </div>
        </section>
      </div>

      {/* Key numbers */}
      <dl
        className={`grid grid-cols-2 gap-3 text-center text-sm ${hasTimeSpent ? "sm:grid-cols-5" : "sm:grid-cols-4"}`}
      >
        <Stat label="Tasks done" value={`${progress.closedIssues}/${progress.totalIssues}`} />
        <Stat label="Est. project total" value={formatMinutes(progress.totalMinutes) ?? "—"} />
        <Stat label="Est. completed" value={formatMinutes(progress.doneMinutes) ?? "—"} />
        {hasTimeSpent && (
          <Stat label="Time logged" value={formatMinutes(progress.spentMinutes) ?? "—"} />
        )}
        <Stat label="Est. remaining" value={formatMinutes(progress.remainingMinutes) ?? "—"} />
      </dl>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Progress over time" hint="Cumulative % complete, with a projected finish.">
          <Burnup burnup={a.burnup} forecast={a.forecast} />
        </Card>
        <Card title="Weekly throughput" hint="Tasks completed each week (last 12).">
          <VelocityChart weeks={a.weeks} />
        </Card>
      </div>

      {/* Breakdowns */}
      {(a.workstreams.length > 0 || a.assignees.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {a.workstreams.length > 0 && (
            <Card title="By workstream" hint="Progress per label.">
              <BreakdownList items={a.workstreams.slice(0, 8)} />
            </Card>
          )}
          {a.assignees.length > 0 && (
            <Card
              title="By team member"
              hint={
                a.estimateAccuracy !== null
                  ? `Completed tasks logged ${Math.round(a.estimateAccuracy * 100)}% of their estimate.`
                  : "Workload and progress per person."
              }
            >
              <BreakdownList items={a.assignees.slice(0, 8)} />
            </Card>
          )}
        </div>
      )}

      {/* Activity + risk */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Recently completed">
          {a.recentlyClosed.length === 0 ? (
            <p className="text-sm text-zinc-500">Nothing completed yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {a.recentlyClosed.map((i) => (
                <li key={i.id} className="flex items-start justify-between gap-3">
                  <a
                    href={i.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 truncate text-zinc-300 hover:underline"
                  >
                    {i.title}
                  </a>
                  <span className="shrink-0 text-xs text-zinc-500">
                    {i.closedAt ? relative(i.closedAt) : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card
          title="Needs attention"
          hint="Open tasks with no update in over two weeks."
        >
          {a.stale.length === 0 ? (
            <p className="text-sm text-zinc-500">All open tasks have recent activity. 👍</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {a.stale.slice(0, 6).map((i) => (
                <li key={i.id} className="flex items-start justify-between gap-3">
                  <a
                    href={i.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 truncate text-amber-300/90 hover:underline"
                  >
                    {i.title}
                  </a>
                  <span className="shrink-0 text-xs text-zinc-500">{relative(i.updatedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Task list with comments / email */}
      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-400">Tasks</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-500">No tasks created yet.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <IssueRow
                key={row.id}
                projectId={projectId}
                issue={row}
                emailEnabled={emailEnabled}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ForecastCard({
  forecast,
  remainingMinutes,
}: {
  forecast: Forecast;
  remainingMinutes: number;
}) {
  const pace = `${forecast.perWeekIssues.toFixed(1)} task${forecast.perWeekIssues === 1 ? "" : "s"}/week`;

  let headline: string;
  let sub: string;
  let tone = "text-white";
  switch (forecast.status) {
    case "complete":
      headline = "Project complete";
      sub = "All tasks are done.";
      tone = "text-emerald-400";
      break;
    case "projected":
      headline = fmtDate(forecast.etaDate!);
      sub = `Projected finish at the current pace (${pace}, last 6 weeks). ~${Math.max(
        1,
        Math.ceil(forecast.weeksRemaining ?? 0),
      )} weeks, ${formatMinutes(remainingMinutes) ?? "—"} of work left.`;
      break;
    case "stalled":
      headline = "Paused";
      sub = "No tasks have been completed in the last 6 weeks, so there's no finish estimate yet.";
      tone = "text-amber-400";
      break;
    default:
      headline = "Getting started";
      sub = "Not enough completed work yet to project a finish date.";
      tone = "text-zinc-300";
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-xs uppercase tracking-wide text-zinc-500">Projected completion</p>
      <p className={`mt-2 text-3xl font-semibold ${tone}`}>{headline}</p>
      <p className="mt-2 text-sm text-zinc-400">{sub}</p>
      {forecast.status === "projected" && (
        <p className="mt-3 text-xs text-zinc-600">
          Estimate based on recent throughput; it shifts as the pace changes.
        </p>
      )}
    </section>
  );
}

function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="mb-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-400">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>}
      </div>
      {children}
    </section>
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

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function relative(iso: string) {
  const days = Math.round((Date.now() - Date.parse(iso)) / (24 * 3600 * 1000));
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  return `${Math.round(days / 30)}mo ago`;
}
