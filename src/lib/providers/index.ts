import { revalidateTag, unstable_cache } from "next/cache";
import * as github from "./github";
import * as gitlab from "./gitlab";
import type { NormalizedComment, NormalizedIssue, ProviderProject } from "./types";

const providers = { github, gitlab } as const;

export type ProviderName = keyof typeof providers;

export function isProvider(name: string): name is ProviderName {
  return name in providers;
}

function pick(provider: string) {
  if (!isProvider(provider)) throw new Error(`Unknown provider: ${provider}`);
  return providers[provider];
}

/**
 * Provider data changes slowly relative to how often clients reload the
 * dashboard, and the paginated GitHub/GitLab calls are the slowest part of a
 * page load. We cache each project's issues (and per-issue comments) for a short
 * window so the dashboard, project page and admin views share one fetch instead
 * of hitting the API on every request. A client posting a comment revalidates
 * the affected project (see `revalidateProject`).
 */
const CACHE_TTL_SECONDS = 60;

/** A project identified well enough (by id) to key its cache entries. */
export type CacheableProject = ProviderProject & { id: number };

export function issuesTag(projectId: number) {
  return `project:${projectId}:issues`;
}

export function commentsTag(projectId: number) {
  return `project:${projectId}:comments`;
}

/**
 * Marks a project's cached issues + comments stale, e.g. after a client
 * comments. Uses stale-while-revalidate ("max") so the next view refreshes in
 * the background rather than blocking.
 */
export function revalidateProject(projectId: number) {
  revalidateTag(issuesTag(projectId), "max");
  revalidateTag(commentsTag(projectId), "max");
}

export function fetchIssues(
  provider: string,
  project: CacheableProject,
): Promise<NormalizedIssue[]> {
  // Keyed by project id (which uniquely determines repo/token), so the cache is
  // shared across every page that renders this project.
  return unstable_cache(
    () => pick(provider).fetchIssues(project),
    ["provider-issues", provider, String(project.id)],
    { revalidate: CACHE_TTL_SECONDS, tags: [issuesTag(project.id)] },
  )();
}

export function fetchComments(
  provider: string,
  project: CacheableProject,
  issueId: number,
): Promise<NormalizedComment[]> {
  return unstable_cache(
    () => pick(provider).fetchComments(project, issueId),
    ["provider-comments", provider, String(project.id), String(issueId)],
    { revalidate: CACHE_TTL_SECONDS, tags: [commentsTag(project.id)] },
  )();
}

export async function postComment(
  provider: string,
  project: ProviderProject,
  issueId: number,
  body: string,
): Promise<NormalizedComment> {
  return pick(provider).postComment(project, issueId, body);
}

export interface ProjectProgress {
  totalIssues: number;
  closedIssues: number;
  percentByIssues: number;
  percentByTime: number | null;
  totalMinutes: number;
  doneMinutes: number;
  remainingMinutes: number;
  /** Total time the team logged on issues (GitLab "time spent"); 0 when unsupported. */
  spentMinutes: number;
}

/**
 * Remaining time per issue: 0 once closed; otherwise the estimate minus any
 * time the team already logged on it (GitLab "time spent"), never below 0.
 */
export function computeProgress(issues: NormalizedIssue[]): ProjectProgress {
  const closed = issues.filter((i) => i.state === "closed");
  const totalMinutes = issues.reduce((acc, i) => acc + (i.estimateMinutes ?? 0), 0);
  const remainingMinutes = issues.reduce((acc, i) => {
    if (i.state === "closed") return acc;
    return acc + Math.max((i.estimateMinutes ?? 0) - (i.spentMinutes ?? 0), 0);
  }, 0);
  const doneMinutes = totalMinutes - remainingMinutes;
  return {
    totalIssues: issues.length,
    closedIssues: closed.length,
    percentByIssues: issues.length ? Math.round((closed.length / issues.length) * 100) : 0,
    percentByTime: totalMinutes ? Math.round((doneMinutes / totalMinutes) * 100) : null,
    totalMinutes,
    doneMinutes,
    remainingMinutes,
    spentMinutes: issues.reduce((acc, i) => acc + (i.spentMinutes ?? 0), 0),
  };
}
