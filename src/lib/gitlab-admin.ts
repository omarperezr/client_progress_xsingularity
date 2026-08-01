/**
 * Write-side GitLab operations for project intake: create the repo when a
 * project is approved, create issues from confirmed drafts. Uses a single
 * admin token (GITLAB_ADMIN_TOKEN, `api` scope); the created Project row
 * stores that token so the existing read path keeps working unchanged.
 */

const HOST = "https://gitlab.com";

export function adminToken(): string {
  const token = process.env.GITLAB_ADMIN_TOKEN;
  if (!token) throw new Error("GITLAB_ADMIN_TOKEN is not set.");
  return token;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${HOST}/api/v4${path}`, {
    ...init,
    headers: {
      "PRIVATE-TOKEN": adminToken(),
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`GitLab API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

/** Creates a private repo; GITLAB_NAMESPACE_ID targets a group, else the token's user. */
export async function createRepo(name: string): Promise<{ pathWithNamespace: string; webUrl: string }> {
  const namespaceId = process.env.GITLAB_NAMESPACE_ID;
  const project = await api<{ path_with_namespace: string; web_url: string }>("/projects", {
    method: "POST",
    body: JSON.stringify({
      name,
      visibility: "private",
      initialize_with_readme: true,
      ...(namespaceId ? { namespace_id: Number(namespaceId) } : {}),
    }),
  });
  return { pathWithNamespace: project.path_with_namespace, webUrl: project.web_url };
}

export async function createIssue(
  repo: string,
  issue: { title: string; description: string; estimateMinutes?: number | null },
): Promise<number> {
  const id = encodeURIComponent(repo);
  const created = await api<{ iid: number }>(`/projects/${id}/issues`, {
    method: "POST",
    body: JSON.stringify({ title: issue.title, description: issue.description }),
  });
  if (issue.estimateMinutes) {
    // Native time tracking — the progress dashboard already prefers it.
    await api(
      `/projects/${id}/issues/${created.iid}/time_estimate?duration=${issue.estimateMinutes}m`,
      { method: "POST" },
    );
  }
  return created.iid;
}
