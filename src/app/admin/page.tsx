import Link from "next/link";
import { PendingButton } from "@/components/PendingButton";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { fetchIssues, computeProgress, type ProjectProgress } from "@/lib/providers";
import { computeAnalytics, type Forecast } from "@/lib/analytics";
import { collectProjectMessages, sortByNewest, type ClientMessage } from "@/lib/inbox";
import { formatMinutes } from "@/lib/estimate";
import { AdminHeader } from "@/components/AdminHeader";
import { ProgressBar } from "@/components/ProgressBar";
import { FieldGrid, Stamp, consignmentNo } from "@/components/Manifest";
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
      return "Delivered";
    case "projected":
      return `Est. arrival ${new Date(f.etaDate!).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`;
    case "stalled":
      return "On hold";
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
    <div className="min-h-screen w-full">
      <AdminHeader admin={admin} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <Banner ok={ok} error={error} />

        <div className="mb-4 border-b-2 border-ink pb-2">
          <h1 className="label-caps text-2xl text-ink">Operations board</h1>
        </div>
        <FieldGrid className="grid-cols-2 sm:grid-cols-5">
          <Stat label="Clients" value={String(companies.length)} />
          <Stat label="Projects" value={String(projectCount)} />
          <Stat label="Tasks done" value={`${totals.closedIssues}/${totals.totalIssues}`} />
          <Stat label="Est. remaining" value={formatMinutes(totals.remainingMinutes) ?? "—"} />
          <Stat
            label="Unanswered messages"
            value={String(unanswered.length)}
            className="max-sm:col-span-2"
          />
        </FieldGrid>
        {failing > 0 && (
          <p className="mt-3 border border-hold bg-hold/5 px-3 py-2 text-sm font-medium text-hold">
            {failing} project{failing === 1 ? "" : "s"} could not be loaded from their provider —
            check the repo and token.
          </p>
        )}

        {/* Inbox + needs attention */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="sheet p-5">
            <div className="mb-4 flex items-baseline justify-between gap-2 border-b border-rule pb-2">
              <h2 className="label-caps text-xs text-ink">Unanswered client messages</h2>
              <Link
                href="/admin/inbox"
                className="label-caps text-[11px] text-transit hover:underline"
              >
                Open inbox
              </Link>
            </div>
            {unanswered.length === 0 ? (
              <p className="text-sm text-ink-soft">
                Nothing waiting — all client comments have a reply.
              </p>
            ) : (
              <ul className="space-y-3">
                {unanswered.slice(0, 4).map((m) => (
                  <li key={`${m.projectId}-${m.issueId}`} className="border border-rule bg-sheet-dim/60 p-3">
                    <div className="mb-1 flex items-center justify-between gap-2 font-mono text-xs text-ink-soft">
                      <span className="font-semibold text-ink">{m.companyName}</span>
                      <span>{ago(m.createdAt)}</span>
                    </div>
                    <a
                      href={m.issueUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-sm font-medium text-ink hover:underline"
                      title={m.issueTitle}
                    >
                      {m.projectName}: {m.issueTitle}
                    </a>
                    <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{m.text}</p>
                  </li>
                ))}
                {unanswered.length > 4 && (
                  <li className="text-xs text-ink-soft">
                    +{unanswered.length - 4} more in the{" "}
                    <Link href="/admin/inbox" className="font-medium text-transit hover:underline">
                      inbox
                    </Link>
                    .
                  </li>
                )}
              </ul>
            )}
          </section>

          <section className="sheet p-5">
            <h2 className="label-caps mb-4 border-b border-rule pb-2 text-xs text-ink">
              Exceptions — needs attention
            </h2>
            {needsAttention.length === 0 ? (
              <p className="text-sm text-ink-soft">Every project has recent momentum.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {needsAttention.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-3">
                    <Link
                      href={`/admin/projects/${v.id}`}
                      className="min-w-0 flex-1 truncate font-medium text-ink hover:underline"
                    >
                      {v.name}
                    </Link>
                    <Stamp tone="hold" className="shrink-0">
                      {v.forecast?.status === "stalled" ? "On hold" : `${v.staleCount} stale`}
                    </Stamp>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Clients & projects + new client */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <section>
            <h2 className="label-caps mb-3 text-sm text-ink">Clients &amp; projects</h2>
            {companies.length === 0 && (
              <p className="text-sm text-ink-soft">No clients yet. Create the first one →</p>
            )}
            <div className="space-y-5">
              {companies.map((company) => (
                <div key={company.id} className="sheet p-5">
                  <div className="flex items-center justify-between gap-3 border-b border-rule pb-3">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/companies/${company.id}`}
                        className="font-semibold text-ink hover:underline"
                      >
                        {company.name}
                      </Link>
                      <p className="font-mono text-xs text-ink-soft">
                        @{company.username} · {company.projects.length} project
                        {company.projects.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <form action={impersonateCompany}>
                        <input type="hidden" name="id" value={company.id} />
                        <PendingButton
                          className="btn px-3 py-1.5 text-[11px]"
                          title="Open this client's own dashboard"
                        >
                          View as
                        </PendingButton>
                      </form>
                      <Link href={`/admin/companies/${company.id}`} className="btn px-3 py-1.5 text-[11px]">
                        Manage
                      </Link>
                    </div>
                  </div>

                  {company.projects.length > 0 && (
                    <ul className="mt-4 space-y-3">
                      {company.projects.map((project) => {
                        const v = views.get(project.id);
                        return (
                          <li key={project.id} className="border border-rule bg-sheet-dim/60 p-4">
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <Link
                                href={`/admin/projects/${project.id}`}
                                className="min-w-0 truncate text-sm font-medium text-ink hover:underline"
                              >
                                <span className="mr-2 font-mono text-xs font-normal text-ink-soft">
                                  {consignmentNo(project.id)}
                                </span>
                                {project.name}
                              </Link>
                              <div className="flex shrink-0 items-center gap-2">
                                {v && v.unansweredCount > 0 && (
                                  <Link href="/admin/inbox">
                                    <Stamp tone="exception">{v.unansweredCount} unanswered</Stamp>
                                  </Link>
                                )}
                                <span className="hidden font-mono text-[10px] text-ink-soft sm:inline">
                                  {project.provider}:{project.repo}
                                </span>
                              </div>
                            </div>
                            {v?.progress ? (
                              <>
                                <ProgressBar percent={v.progress.percentByIssues} />
                                <p className="mt-2 flex flex-wrap gap-x-3 font-mono text-xs text-ink-soft">
                                  <span>
                                    {v.progress.closedIssues}/{v.progress.totalIssues} tasks
                                  </span>
                                  <span>{formatMinutes(v.progress.remainingMinutes) ?? "—"} remaining</span>
                                  {v.forecast && <span className="text-ink">{forecastLabel(v.forecast)}</span>}
                                </p>
                              </>
                            ) : (
                              <p className="text-xs font-medium text-exception">
                                Could not load issues from {project.provider}.
                              </p>
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
                  <Link href="/admin/inbox" className="font-medium text-transit hover:underline">
                    Client message inbox
                  </Link>
                </li>
                <li>
                  <Link href="/" className="font-medium text-transit hover:underline">
                    Open the client-facing view
                  </Link>
                </li>
              </ul>
              <p className="mt-3 text-xs text-ink-soft">
                Use “View as” on any client to see their dashboard exactly as they do.
              </p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
