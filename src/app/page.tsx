import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionCompany } from "@/lib/auth";
import { fetchIssues, computeProgress, type ProjectProgress } from "@/lib/providers";
import { computeAnalytics, type Forecast } from "@/lib/analytics";
import { formatMinutes } from "@/lib/estimate";
import { Header } from "@/components/Header";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { RouteLine, FieldGrid, FieldBox, Stamp, consignmentNo, forecastStamp } from "@/components/Manifest";

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
      return "All tasks delivered";
    case "projected":
      return `Est. arrival ${new Date(f.etaDate!).toLocaleDateString("en-US", {
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

/** Destination label for the route line. */
function etaLabel(f: Forecast | null): string {
  if (f?.status === "complete") return "Delivered";
  if (f?.status === "projected")
    return new Date(f.etaDate!).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return "ETA TBD";
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
    <div className="min-h-screen w-full">
      <ImpersonationBanner companyName={company.name} />
      <Header companyName={company.name} />
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-ink pb-2">
          <h1 className="label-caps text-2xl text-ink">Project manifest</h1>
          <p className="font-mono text-xs text-ink-soft">
            {cards.length} consignment{cards.length === 1 ? "" : "s"} on file
          </p>
        </div>
        {cards.length === 0 && (
          <div className="sheet p-8 text-center">
            <p className="text-sm text-ink-soft">
              No projects on file yet. Your xSingularity contact will set them up shortly.
            </p>
          </div>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          {cards.map((card) => (
            <Link
              key={card.id}
              href={`/projects/${card.id}`}
              className="sheet block p-5 transition-shadow hover:shadow-sheet-raised"
            >
              <div className="mb-3 flex items-center justify-between gap-2 border-b border-rule pb-2">
                <span className="font-mono text-xs text-ink-soft">{consignmentNo(card.id)}</span>
                <span className="label-caps text-[10px] text-ink-soft">via {card.provider}</span>
              </div>
              <h2 className="text-lg font-semibold leading-snug text-ink">{card.name}</h2>
              {card.progress ? (
                <>
                  <div className="mt-4">
                    <RouteLine
                      percent={card.progress.percentByIssues}
                      startLabel="Kickoff"
                      endLabel={etaLabel(card.forecast)}
                    />
                  </div>
                  <FieldGrid className="mt-4 grid-cols-3">
                    <FieldBox
                      label="Tasks done"
                      value={`${card.progress.closedIssues}/${card.progress.totalIssues}`}
                    />
                    <FieldBox label="Est. total" value={formatMinutes(card.progress.totalMinutes) ?? "—"} />
                    <FieldBox
                      label="Remaining"
                      value={formatMinutes(card.progress.remainingMinutes) ?? "—"}
                    />
                  </FieldGrid>
                  {card.forecast && (
                    <p className="mt-4 flex items-center gap-2 text-xs text-ink-soft">
                      <Stamp tone={forecastStamp(card.forecast).tone}>
                        {forecastStamp(card.forecast).label}
                      </Stamp>
                      {forecastLabel(card.forecast)}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-3 text-sm font-medium text-exception">
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
