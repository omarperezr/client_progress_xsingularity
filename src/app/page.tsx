import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionCompany } from "@/lib/auth";
import { fetchIssues, computeProgress, type ProjectProgress } from "@/lib/providers";
import { computeAnalytics, type Forecast } from "@/lib/analytics";
import { formatMinutes } from "@/lib/estimate";
import { Header } from "@/components/Header";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { ProgressBar } from "@/components/ProgressBar";

export const dynamic = "force-dynamic";

export const metadata = { title: "Projects · Client Progress" };

interface ProjectCard {
  id: number;
  name: string;
  provider: string;
  repo: string;
  progress: ProjectProgress | null;
  forecast: Forecast | null;
}

/** One-line finish estimate for a project card. */
function forecastLabel(f: Forecast): string {
  switch (f.status) {
    case "complete":
      return "Complete";
    case "projected":
      return `Est. finish ${new Date(f.etaDate!).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;
    case "stalled":
      return "No recent activity";
    default:
      return "Getting started";
  }
}

export default async function DashboardPage() {
  const company = await getSessionCompany();
  if (!company) redirect("/login");

  const projects = await prisma.project.findMany({
    where: { companyId: company.id },
    orderBy: { name: "asc" },
  });

  const cards: ProjectCard[] = await Promise.all(
    projects.map(async (p) => {
      try {
        const issues = await fetchIssues(p.provider, p);
        return {
          id: p.id,
          name: p.name,
          provider: p.provider,
          repo: p.repo,
          progress: computeProgress(issues),
          forecast: computeAnalytics(issues).forecast,
        };
      } catch (err) {
        console.error(`Failed to fetch issues for project ${p.id}:`, err);
        return { id: p.id, name: p.name, provider: p.provider, repo: p.repo, progress: null, forecast: null };
      }
    }),
  );

  return (
    <div className="min-h-screen w-full bg-zinc-950">
      <ImpersonationBanner companyName={company.name} />
      <Header companyName={company.name} />
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <h1 className="mb-6 text-xl font-semibold text-white">Your projects</h1>
        {cards.length === 0 && (
          <p className="text-sm text-zinc-400">
            No projects yet. Your xSingularity contact will set them up shortly.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((card) => (
            <Link
              key={card.id}
              href={`/projects/${card.id}`}
              className="block rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-zinc-600"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-medium text-white">{card.name}</h2>
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs uppercase tracking-wide text-zinc-400">
                  {card.provider}
                </span>
              </div>
              {card.progress ? (
                <>
                  <ProgressBar percent={card.progress.percentByIssues} label="Overall progress" />
                  <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-md bg-zinc-800/60 p-2">
                      <dt className="text-zinc-500">Tasks done</dt>
                      <dd className="mt-0.5 font-medium text-zinc-200">
                        {card.progress.closedIssues}/{card.progress.totalIssues}
                      </dd>
                    </div>
                    <div className="rounded-md bg-zinc-800/60 p-2">
                      <dt className="text-zinc-500">Est. total</dt>
                      <dd className="mt-0.5 font-medium text-zinc-200">
                        {formatMinutes(card.progress.totalMinutes) ?? "—"}
                      </dd>
                    </div>
                    <div className="rounded-md bg-zinc-800/60 p-2">
                      <dt className="text-zinc-500">Remaining</dt>
                      <dd className="mt-0.5 font-medium text-zinc-200">
                        {formatMinutes(card.progress.remainingMinutes) ?? "—"}
                      </dd>
                    </div>
                  </dl>
                  {card.forecast && (
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-zinc-400">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          card.forecast.status === "complete"
                            ? "bg-emerald-500"
                            : card.forecast.status === "stalled"
                              ? "bg-amber-500"
                              : "bg-indigo-500"
                        }`}
                      />
                      {forecastLabel(card.forecast)}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-red-400">
                  Could not load progress from {card.provider}. Please try again later.
                </p>
              )}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
