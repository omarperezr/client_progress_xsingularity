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
}

export function computeProgress(issues: NormalizedIssue[]): ProjectProgress {
  const closed = issues.filter((i) => i.state === "closed");
  const sum = (list: NormalizedIssue[]) =>
    list.reduce((acc, i) => acc + (i.estimateMinutes ?? 0), 0);
  const totalMinutes = sum(issues);
  const doneMinutes = sum(closed);
  return {
    totalIssues: issues.length,
    closedIssues: closed.length,
    percentByIssues: issues.length ? Math.round((closed.length / issues.length) * 100) : 0,
    percentByTime: totalMinutes ? Math.round((doneMinutes / totalMinutes) * 100) : null,
    totalMinutes,
    doneMinutes,
    remainingMinutes: totalMinutes - doneMinutes,
  };
}
