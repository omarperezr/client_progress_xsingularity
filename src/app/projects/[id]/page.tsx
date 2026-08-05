import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionCompany } from "@/lib/auth";
import { fetchIssuesLive, computeProgress } from "@/lib/providers";
import type { NormalizedIssue } from "@/lib/providers/types";
import { computeAnalytics, type Forecast } from "@/lib/analytics";
import { mailConfigured } from "@/lib/mailer";
import { formatMinutes } from "@/lib/estimate";
import { Header } from "@/components/Header";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { ProgressBar } from "@/components/ProgressBar";
import { FieldGrid, FieldBox, Stamp, consignmentNo, forecastStamp } from "@/components/Manifest";
import { Burnup, VelocityChart, StatusBar, BreakdownList } from "@/components/Charts";
import { IssueRow, type IssueRowData } from "@/components/IssueRow";
import { PendingButton } from "@/components/PendingButton";
import { refreshProject } from "./actions";

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
    issues = await fetchIssuesLive(project.provider, project);
  } catch (err) {
    console.error(`Failed to fetch issues for project ${project.id}:`, err);
  }

  return (
    <div className="min-h-screen w-full">
      <ImpersonationBanner companyName={company.name} />
      <Header companyName={company.name} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <Link
          href="/"
          className="label-caps text-xs text-ink-soft transition-colors hover:text-ink"
        >
          ← Project manifest
        </Link>
        <div className="mt-3 mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-b-2 border-ink pb-3">
          <h1 className="text-2xl font-semibold leading-tight text-ink">{project.name}</h1>
          <span className="font-mono text-xs text-ink-soft">
            {consignmentNo(project.id)} · via {project.provider}
          </span>
          <form action={refreshProject.bind(null, projectId)} className="ml-auto">
            <PendingButton
              pendingText="Refreshing…"
              title={`Fetch the latest tasks from ${project.provider}`}
              className="btn px-3 py-1.5 text-[11px]"
            >
              Refresh
            </PendingButton>
          </form>
        </div>

        {!issues ? (
          <p className="border border-exception bg-exception/5 px-4 py-3 text-sm font-medium text-exception">
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
        <section className="sheet p-5">
          <ProgressBar percent={progress.percentByIssues} label="Overall progress (by tasks)" />
          {progress.percentByTime !== null && (
            <div className="mt-4">
              <ProgressBar percent={progress.percentByTime} label="Progress by estimated time" />
            </div>
          )}
          <div className="mt-4">
            <p className="label-caps mb-2 text-[10px] text-ink-soft">Task status</p>
            <StatusBar status={a.status} />
          </div>
        </section>
      </div>

      {/* Key numbers */}
      <FieldGrid className={`grid-cols-2 ${hasTimeSpent ? "sm:grid-cols-5" : "sm:grid-cols-4"}`}>
        <FieldBox label="Tasks done" value={`${progress.closedIssues}/${progress.totalIssues}`} />
        <FieldBox label="Est. project total" value={formatMinutes(progress.totalMinutes) ?? "—"} />
        <FieldBox label="Est. completed" value={formatMinutes(progress.doneMinutes) ?? "—"} />
        {hasTimeSpent && (
          <FieldBox label="Time logged" value={formatMinutes(progress.spentMinutes) ?? "—"} />
        )}
        <FieldBox
          label="Est. remaining"
          value={formatMinutes(progress.remainingMinutes) ?? "—"}
          className={hasTimeSpent ? "max-sm:col-span-2" : ""}
        />
      </FieldGrid>

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
        <Card title="Recently delivered">
          {a.recentlyClosed.length === 0 ? (
            <p className="text-sm text-ink-soft">Nothing completed yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {a.recentlyClosed.map((i) => (
                <li key={i.id} className="flex items-start justify-between gap-3">
                  <a
                    href={i.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 truncate text-ink hover:underline"
                  >
                    {i.title}
                  </a>
                  <span className="shrink-0 font-mono text-xs text-ink-soft">
                    {i.closedAt ? relative(i.closedAt) : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Needs attention" hint="Open tasks with no update in over two weeks.">
          {a.stale.length === 0 ? (
            <p className="text-sm text-ink-soft">All open tasks have recent activity.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {a.stale.slice(0, 6).map((i) => (
                <li key={i.id} className="flex items-start justify-between gap-3">
                  <a
                    href={i.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 truncate font-medium text-hold hover:underline"
                  >
                    {i.title}
                  </a>
                  <span className="shrink-0 font-mono text-xs text-ink-soft">
                    {relative(i.updatedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Task list with comments / email */}
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="label-caps text-sm text-ink">Task manifest</h2>
          <span className="font-mono text-xs text-ink-soft">{rows.length} line items</span>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-ink-soft">No tasks created yet.</p>
        ) : (
          <ul className="sheet divide-y divide-rule">
            {rows.map((row) => (
              <IssueRow key={row.id} projectId={projectId} issue={row} emailEnabled={emailEnabled} />
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
  const stamp = forecastStamp(forecast);

  let headline: string;
  let sub: string;
  switch (forecast.status) {
    case "complete":
      headline = "Delivered";
      sub = "All tasks are done.";
      break;
    case "projected":
      headline = fmtDate(forecast.etaDate!);
      sub = `Projected arrival at the current pace (${pace}, last 6 weeks). ~${Math.max(
        1,
        Math.ceil(forecast.weeksRemaining ?? 0),
      )} weeks, ${formatMinutes(remainingMinutes) ?? "—"} of work left.`;
      break;
    case "stalled":
      headline = "On hold";
      sub = "No tasks have been completed in the last 6 weeks, so there's no arrival estimate yet.";
      break;
    default:
      headline = "Getting started";
      sub = "Not enough completed work yet to project an arrival date.";
  }

  return (
    <section className="sheet relative p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="label-caps text-[10px] text-ink-soft">Projected arrival</p>
        <Stamp tone={stamp.tone} landing>
          {stamp.label}
        </Stamp>
      </div>
      <p className="mt-2 font-condensed text-4xl font-bold uppercase leading-none tracking-wide text-ink">
        {headline}
      </p>
      <p className="mt-3 max-w-prose text-sm text-ink-soft">{sub}</p>
      {forecast.status === "projected" && (
        <p className="mt-3 text-xs text-ink-soft">
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
    <section className="sheet p-5">
      <div className="mb-4 border-b border-rule pb-2">
        <h2 className="label-caps text-xs text-ink">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>}
      </div>
      {children}
    </section>
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
