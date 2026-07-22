import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { fetchIssues, computeProgress, type ProjectProgress } from "@/lib/providers";
import { computeAnalytics, type Forecast } from "@/lib/analytics";
import { collectProjectMessages, sortByNewest, type ClientMessage } from "@/lib/inbox";
import { formatMinutes } from "@/lib/estimate";
import { AdminHeader } from "@/components/AdminHeader";
import { ProgressBar } from "@/components/ProgressBar";
import { Banner, Card, Field, Stat, SubmitButton } from "@/components/AdminForm";
import { createCompany, impersonateCompany } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin · Client Progress" };

interface ProjectView {
  id: number;
  name: string;
  provider: string;
  repo: string;
  companyId: number;
  progress: ProjectProgress | null;
  forecast: Forecast | null;
  staleCount: number;
  messageCount: number;
  unansweredCount: number;
}

function forecastLabel(f: Forecast): string {
  switch (f.status) {
    case "complete":
      return "Complete";
    case "projected":
      return `Est. finish ${new Date(f.etaDate!).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`;
    case "stalled":
      return "Paused";
    default:
      return "Getting started";
  }
}

function ago(iso: string) {
  const days = Math.round((Date.now() - Date.parse(iso)) / (24 * 3600 * 1000));
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.round(days / 7)}w ago`;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const admin = await requireAdmin();
  const { ok, error } = await searchParams;

  const companies = await prisma.company.findMany({
    include: { projects: { orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });

  // One issues fetch per project, reused for progress, forecast and the message scan.
  const views = new Map<number, ProjectView>();
  const allMessages: ClientMessage[] = [];
  await Promise.all(
    companies.flatMap((company) =>
      company.projects.map(async (p) => {
        try {
          const issues = await fetchIssues(p.provider, p);
          const analytics = computeAnalytics(issues);
          const messages = await collectProjectMessages(p, company.name, issues);
          allMessages.push(...messages);
          views.set(p.id, {
            id: p.id,
            name: p.name,
            provider: p.provider,
            repo: p.repo,
            companyId: p.companyId,
            progress: computeProgress(issues),
            forecast: analytics.forecast,
            staleCount: analytics.stale.length,
            messageCount: messages.length,
            unansweredCount: messages.filter((m) => !m.answered).length,
          });
        } catch (err) {
          console.error(`admin: project ${p.id}:`, err);
          views.set(p.id, {
            id: p.id,
            name: p.name,
            provider: p.provider,
            repo: p.repo,
            companyId: p.companyId,
            progress: null,
            forecast: null,
            staleCount: 0,
            messageCount: 0,
            unansweredCount: 0,
          });
        }
      }),
    ),
  );

  const loaded = [...views.values()].filter((v) => v.progress !== null);
  const totals = loaded.reduce(
    (acc, v) => ({
      totalIssues: acc.totalIssues + v.progress!.totalIssues,
      closedIssues: acc.closedIssues + v.progress!.closedIssues,
      remainingMinutes: acc.remainingMinutes + v.progress!.remainingMinutes,
    }),
    { totalIssues: 0, closedIssues: 0, remainingMinutes: 0 },
  );
  const projectCount = companies.reduce((acc, c) => acc + c.projects.length, 0);
  const failing = projectCount - loaded.length;

  const unanswered = sortByNewest(allMessages.filter((m) => !m.answered));
  const needsAttention = loaded
    .filter((v) => v.staleCount > 0 || v.forecast?.status === "stalled")
    .sort((a, b) => b.staleCount - a.staleCount);

  return (
    <div className="min-h-screen w-full bg-zinc-950">
      <AdminHeader admin={admin} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <Banner ok={ok} error={error} />

        <h1 className="mb-4 text-xl font-semibold text-white">Overview</h1>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Clients" value={String(companies.length)} />
          <Stat label="Projects" value={String(projectCount)} />
          <Stat label="Tasks done" value={`${totals.closedIssues}/${totals.totalIssues}`} />
          <Stat label="Est. remaining" value={formatMinutes(totals.remainingMinutes) ?? "—"} />
          <Stat label="Unanswered messages" value={String(unanswered.length)} />
        </dl>
        {failing > 0 && (
          <p className="mt-3 text-sm text-amber-400">
            {failing} project{failing === 1 ? "" : "s"} could not be loaded from their provider —
            check the repo and token.
          </p>
        )}

        {/* Inbox + needs attention */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-400">
                Unanswered client messages
              </h2>
              <Link href="/admin/inbox" className="text-xs text-indigo-400 hover:text-indigo-300">
                Open inbox →
              </Link>
            </div>
            {unanswered.length === 0 ? (
              <p className="text-sm text-zinc-500">Nothing waiting — all client comments have a reply. 👍</p>
            ) : (
              <ul className="space-y-3">
                {unanswered.slice(0, 4).map((m) => (
                  <li key={`${m.projectId}-${m.issueId}`} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs text-zinc-500">
                      <span className="font-medium text-zinc-300">{m.companyName}</span>
                      <span>{ago(m.createdAt)}</span>
                    </div>
                    <a
                      href={m.issueUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-sm text-zinc-200 hover:underline"
                      title={m.issueTitle}
                    >
                      {m.projectName}: {m.issueTitle}
                    </a>
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{m.text}</p>
                  </li>
                ))}
                {unanswered.length > 4 && (
                  <li className="text-xs text-zinc-500">
                    +{unanswered.length - 4} more in the{" "}
                    <Link href="/admin/inbox" className="text-indigo-400 hover:text-indigo-300">
                      inbox
                    </Link>
                    .
                  </li>
                )}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-400">
              Needs attention
            </h2>
            {needsAttention.length === 0 ? (
              <p className="text-sm text-zinc-500">Every project has recent momentum. 👍</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {needsAttention.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-3">
                    <Link href={`/admin/projects/${v.id}`} className="min-w-0 flex-1 truncate text-zinc-200 hover:underline">
                      {v.name}
                    </Link>
                    <span className="shrink-0 text-xs text-amber-400">
                      {v.forecast?.status === "stalled" ? "paused" : `${v.staleCount} stale`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Clients & projects + new client */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <section>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-400">
              Clients &amp; projects
            </h2>
            {companies.length === 0 && (
              <p className="text-sm text-zinc-400">No clients yet. Create the first one →</p>
            )}
            <div className="space-y-4">
              {companies.map((company) => (
                <div key={company.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/companies/${company.id}`}
                        className="font-medium text-white hover:underline"
                      >
                        {company.name}
                      </Link>
                      <p className="text-xs text-zinc-500">
                        @{company.username} · {company.projects.length} project
                        {company.projects.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <form action={impersonateCompany}>
                        <input type="hidden" name="id" value={company.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-indigo-500/40 px-3 py-1.5 text-xs text-indigo-300 transition hover:bg-indigo-500/10"
                          title="Open this client's own dashboard"
                        >
                          View as
                        </button>
                      </form>
                      <Link
                        href={`/admin/companies/${company.id}`}
                        className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-zinc-800"
                      >
                        Manage
                      </Link>
                    </div>
                  </div>

                  {company.projects.length > 0 && (
                    <ul className="mt-4 space-y-3">
                      {company.projects.map((project) => {
                        const v = views.get(project.id);
                        return (
                          <li key={project.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <Link
                                href={`/admin/projects/${project.id}`}
                                className="min-w-0 truncate text-sm text-zinc-200 hover:underline"
                              >
                                {project.name}
                              </Link>
                              <div className="flex shrink-0 items-center gap-2">
                                {v && v.unansweredCount > 0 && (
                                  <Link
                                    href="/admin/inbox"
                                    className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-medium text-indigo-300"
                                  >
                                    {v.unansweredCount} unanswered
                                  </Link>
                                )}
                                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
                                  {project.provider}:{project.repo}
                                </span>
                              </div>
                            </div>
                            {v?.progress ? (
                              <>
                                <ProgressBar percent={v.progress.percentByIssues} />
                                <p className="mt-2 flex flex-wrap gap-x-3 text-xs text-zinc-500">
                                  <span>
                                    {v.progress.closedIssues}/{v.progress.totalIssues} tasks
                                  </span>
                                  <span>{formatMinutes(v.progress.remainingMinutes) ?? "—"} remaining</span>
                                  {v.forecast && <span className="text-zinc-400">{forecastLabel(v.forecast)}</span>}
                                </p>
                              </>
                            ) : (
                              <p className="text-xs text-red-400">Could not load issues from {project.provider}.</p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>

          <div className="space-y-6">
            <Card title="New client" description="Creates the login the client uses to see their projects.">
              <form action={createCompany} className="space-y-3">
                <Field label="Company name" name="name" required placeholder="Acme Corp" />
                <Field label="Username" name="username" required placeholder="acme" />
                <Field label="Password" name="password" type="password" required />
                <SubmitButton>Create client</SubmitButton>
              </form>
            </Card>

            <Card title="Resources">
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/admin/inbox" className="text-indigo-400 hover:text-indigo-300">
                    Client message inbox →
                  </Link>
                </li>
                <li>
                  <Link href="/" className="text-indigo-400 hover:text-indigo-300">
                    Open the client-facing view →
                  </Link>
                </li>
              </ul>
              <p className="mt-3 text-xs text-zinc-500">
                Use “View as” on any client to see their dashboard exactly as they do.
              </p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
