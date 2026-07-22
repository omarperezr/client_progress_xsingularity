import { estimateFromBody, estimateFromLabels } from "../estimate";
import type { NormalizedComment, NormalizedIssue, ProviderProject } from "./types";

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
  closed_at: string | null;
  comments: number;
  pull_request?: unknown;
}

interface GitHubComment {
  id: number;
  user: { login: string } | null;
  body: string;
  created_at: string;
  html_url: string;
}

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "client-progress-xsingularity",
  };
}

async function api<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, { headers: headers(token), cache: "no-store" });
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

async function fetchAllPages(url: string, token: string): Promise<GitHubIssue[]> {
  const items: GitHubIssue[] = [];
  let next: string | null = url;
  while (next) {
    const res: Response = await fetch(next, { headers: headers(token), cache: "no-store" });
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
        closedAt: issue.closed_at,
        commentCount: issue.comments ?? 0,
      } satisfies NormalizedIssue;
    });
}

export async function fetchComments(
  project: ProviderProject,
  issueId: number,
): Promise<NormalizedComment[]> {
  const host = project.baseUrl || DEFAULT_API;
  const raw = await api<GitHubComment[]>(
    `${host}/repos/${project.repo}/issues/${issueId}/comments?per_page=100`,
    project.token,
  );
  return raw.map((c) => ({
    id: c.id,
    author: c.user?.login ?? "unknown",
    body: c.body ?? "",
    createdAt: c.created_at,
    url: c.html_url,
  }));
}

/** Posts a comment on the issue. Requires a token with Issues: Read & write. */
export async function postComment(
  project: ProviderProject,
  issueId: number,
  body: string,
): Promise<NormalizedComment> {
  const host = project.baseUrl || DEFAULT_API;
  const res = await fetch(`${host}/repos/${project.repo}/issues/${issueId}/comments`, {
    method: "POST",
    headers: { ...headers(project.token), "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ body }),
  });
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const c: GitHubComment = await res.json();
  return {
    id: c.id,
    author: c.user?.login ?? "unknown",
    body: c.body ?? "",
    createdAt: c.created_at,
    url: c.html_url,
  };
}
