import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { fetchIssues } from "@/lib/providers";
import { collectProjectMessages, sortByNewest, type ClientMessage } from "@/lib/inbox";
import { AdminHeader } from "@/components/AdminHeader";

export const dynamic = "force-dynamic";

export const metadata = { title: "Client messages · Admin" };

function ago(iso: string) {
  const days = Math.round((Date.now() - Date.parse(iso)) / (24 * 3600 * 1000));
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.round(days / 7)}w ago`;
}

export default async function AdminInboxPage() {
  const admin = await requireAdmin();

  const companies = await prisma.company.findMany({
    include: { projects: { orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });

  const all: ClientMessage[] = [];
  await Promise.all(
    companies.flatMap((company) =>
      company.projects.map(async (p) => {
        try {
          const issues = await fetchIssues(p.provider, p);
          all.push(...(await collectProjectMessages(p, company.name, issues)));
        } catch (err) {
          console.error(`inbox page: project ${p.id}:`, err);
        }
      }),
    ),
  );

  const awaiting = sortByNewest(all.filter((m) => !m.answered));
  const answered = sortByNewest(all.filter((m) => m.answered));

  return (
    <div className="min-h-screen w-full">
      <AdminHeader admin={admin} />
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <Link href="/admin" className="label-caps text-xs text-ink-soft transition-colors hover:text-ink">
          ← Operations board
        </Link>
        <div className="mt-3 mb-2 border-b-2 border-ink pb-2">
          <h1 className="label-caps text-2xl text-ink">Correspondence</h1>
        </div>
        <p className="mb-6 text-sm text-ink-soft">
          Comments clients left on their tasks through the app. “Awaiting reply” means no one has
          responded on the issue since the client’s last message.
        </p>

        <section className="mb-8">
          <h2 className="label-caps mb-3 text-sm text-exception">
            Awaiting reply ({awaiting.length})
          </h2>
          {awaiting.length === 0 ? (
            <p className="text-sm text-ink-soft">Nothing waiting.</p>
          ) : (
            <ul className="space-y-3">
              {awaiting.map((m) => (
                <MessageCard key={`${m.projectId}-${m.issueId}`} m={m} />
              ))}
            </ul>
          )}
        </section>

        {answered.length > 0 && (
          <section>
            <h2 className="label-caps mb-3 text-sm text-ink-soft">
              Answered ({answered.length})
            </h2>
            <ul className="space-y-3 opacity-70">
              {answered.map((m) => (
                <MessageCard key={`${m.projectId}-${m.issueId}`} m={m} />
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}

function MessageCard({ m }: { m: ClientMessage }) {
  return (
    <li className="sheet p-4">
      <div className="mb-1 flex items-center justify-between gap-2 font-mono text-xs text-ink-soft">
        <span>
          <span className="font-semibold text-ink">{m.companyName}</span> · {m.projectName}
        </span>
        <span>{ago(m.createdAt)}</span>
      </div>
      <p className="text-sm font-semibold text-ink">{m.issueTitle}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">{m.text}</p>
      <div className="mt-3 flex gap-4 text-xs">
        <a
          href={m.issueUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-transit hover:underline"
        >
          Reply on {m.provider}
        </a>
        <Link
          href={`/admin/projects/${m.projectId}`}
          className="text-ink-soft transition-colors hover:text-ink"
        >
          Manage project
        </Link>
      </div>
    </li>
  );
}
