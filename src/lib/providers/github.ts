import { estimateFromBody, estimateFromLabels } from "../estimate";
import type { NormalizedIssue, ProviderProject } from "./types";

const DEFAULT_API = "https://api.github.com";

interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  body: string | null;
  assignees: { login: string }[] | null;
  labels: (string | { name: string })[] | null;
  html_url: string;
  updated_at: string;
  pull_request?: unknown;
}

async function fetchAllPages(url: string, token: string): Promise<GitHubIssue[]> {
  const items: GitHubIssue[] = [];
  let next: string | null = url;
  while (next) {
    const res: Response = await fetch(next, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "client-progress-xsingularity",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`GitHub API ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    items.push(...(await res.json()));
    const link = res.headers.get("link") ?? "";
    const match = link.match(/<([^>]+)>;\s*rel="next"/);
    next = match ? match[1] : null;
  }
  return items;
}

/** project.repo is "owner/repo"; project.baseUrl overrides the API host (GitHub Enterprise). */
export async function fetchIssues(project: ProviderProject): Promise<NormalizedIssue[]> {
  const api = project.baseUrl || DEFAULT_API;
  const raw = await fetchAllPages(
    `${api}/repos/${project.repo}/issues?state=all&per_page=100`,
    project.token,
  );
  return raw
    .filter((issue) => !issue.pull_request) // GitHub lists PRs as issues; skip them
    .map((issue) => {
      const labels = (issue.labels ?? []).map((l) => (typeof l === "string" ? l : l.name));
      return {
        id: issue.number,
        title: issue.title,
        state: issue.state === "closed" ? "closed" : "open",
        assignees: (issue.assignees ?? []).map((a) => a.login),
        labels,
        estimateMinutes: estimateFromBody(issue.body) ?? estimateFromLabels(labels),
        spentMinutes: null,
        url: issue.html_url,
        updatedAt: issue.updated_at,
      } satisfies NormalizedIssue;
    });
}
