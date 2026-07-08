import { estimateFromBody, estimateFromLabels } from "../estimate";
import type { NormalizedIssue, ProviderProject } from "./types";

const DEFAULT_HOST = "https://gitlab.com";

interface GitLabIssue {
  iid: number;
  title: string;
  state: string;
  description: string | null;
  assignees: { username: string }[] | null;
  labels: string[] | null;
  time_stats?: { time_estimate: number };
  web_url: string;
  updated_at: string;
}

async function fetchAllPages(url: string, token: string): Promise<GitLabIssue[]> {
  const items: GitLabIssue[] = [];
  let next: string | null = url;
  while (next) {
    const res: Response = await fetch(next, {
      headers: { "PRIVATE-TOKEN": token },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`GitLab API ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    items.push(...(await res.json()));
    const link = res.headers.get("link") ?? "";
    const match = link.match(/<([^>]+)>;\s*rel="next"/);
    next = match ? match[1] : null;
  }
  return items;
}

/**
 * project.repo is a numeric project id or "group/project" path;
 * project.baseUrl overrides the host for self-managed GitLab.
 */
export async function fetchIssues(project: ProviderProject): Promise<NormalizedIssue[]> {
  const host = project.baseUrl || DEFAULT_HOST;
  const id = encodeURIComponent(project.repo);
  const raw = await fetchAllPages(
    `${host}/api/v4/projects/${id}/issues?scope=all&per_page=100`,
    project.token,
  );
  return raw.map((issue) => ({
    id: issue.iid,
    title: issue.title,
    state: issue.state === "closed" ? "closed" : "open",
    assignees: (issue.assignees ?? []).map((a) => a.username),
    labels: issue.labels ?? [],
    // Prefer GitLab native time tracking (/estimate quick action), fall back to body/labels.
    estimateMinutes: issue.time_stats?.time_estimate
      ? Math.round(issue.time_stats.time_estimate / 60)
      : estimateFromBody(issue.description) ?? estimateFromLabels(issue.labels),
    url: issue.web_url,
    updatedAt: issue.updated_at,
  }));
}
