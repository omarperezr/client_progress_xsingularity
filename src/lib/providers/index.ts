import * as github from "./github";
import * as gitlab from "./gitlab";
import type { NormalizedIssue, ProviderProject } from "./types";

const providers = { github, gitlab } as const;

export type ProviderName = keyof typeof providers;

export function isProvider(name: string): name is ProviderName {
  return name in providers;
}

export async function fetchIssues(
  provider: string,
  project: ProviderProject,
): Promise<NormalizedIssue[]> {
  if (!isProvider(provider)) throw new Error(`Unknown provider: ${provider}`);
  return providers[provider].fetchIssues(project);
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
