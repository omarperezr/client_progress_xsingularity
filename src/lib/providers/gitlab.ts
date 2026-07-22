import { estimateFromBody, estimateFromLabels } from "../estimate";
import type { NormalizedComment, NormalizedIssue, ProviderProject } from "./types";

const DEFAULT_HOST = "https://gitlab.com";

interface GitLabIssue {
  iid: number;
  title: string;
  state: string;
  description: string | null;
  assignees: { username: string }[] | null;
  labels: string[] | null;
  time_stats?: { time_estimate: number; total_time_spent: number };
  user_notes_count?: number;
  web_url: string;
  updated_at: string;
  closed_at: string | null;
}

interface GitLabNote {
  id: number;
  author: { username: string } | null;
  body: string;
  created_at: string;
  system: boolean;
}

async function api<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, { headers: { "PRIVATE-TOKEN": token }, cache: "no-store" });
  if (!res.ok) {
    throw new Error(`GitLab API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
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
    spentMinutes: issue.time_stats?.total_time_spent
      ? Math.round(issue.time_stats.total_time_spent / 60)
      : null,
    url: issue.web_url,
    updatedAt: issue.updated_at,
    closedAt: issue.closed_at,
    commentCount: issue.user_notes_count ?? 0,
  }));
}

function issuePath(project: ProviderProject, issueId: number) {
  const host = project.baseUrl || DEFAULT_HOST;
  const id = encodeURIComponent(project.repo);
  return `${host}/api/v4/projects/${id}/issues/${issueId}`;
}

export async function fetchComments(
  project: ProviderProject,
  issueId: number,
): Promise<NormalizedComment[]> {
  const raw = await api<GitLabNote[]>(
    `${issuePath(project, issueId)}/notes?per_page=100&sort=asc&order_by=created_at`,
    project.token,
  );
  return raw
    // System notes are automated ("changed status to closed"); show only real discussion.
    .filter((n) => !n.system)
    .map((n) => ({
      id: n.id,
      author: n.author?.username ?? "unknown",
      body: n.body ?? "",
      createdAt: n.created_at,
      url: null,
    }));
}

/** Posts a note on the issue. Requires a token with the `api` scope (Developer role). */
export async function postComment(
  project: ProviderProject,
  issueId: number,
  body: string,
): Promise<NormalizedComment> {
  const res = await fetch(`${issuePath(project, issueId)}/notes`, {
    method: "POST",
    headers: { "PRIVATE-TOKEN": project.token, "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ body }),
  });
  if (!res.ok) {
    throw new Error(`GitLab API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const n: GitLabNote = await res.json();
  return {
    id: n.id,
    author: n.author?.username ?? "unknown",
    body: n.body ?? "",
    createdAt: n.created_at,
    url: null,
  };
}
