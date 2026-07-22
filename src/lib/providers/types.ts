export type IssueState = "open" | "closed";

export interface NormalizedIssue {
  id: number;
  title: string;
  state: IssueState;
  assignees: string[];
  labels: string[];
  estimateMinutes: number | null;
  /** Time the team logged on the issue (GitLab "time spent"); null when unsupported. */
  spentMinutes: number | null;
  url: string;
  updatedAt: string;
  /** When the issue was closed (ISO); null while open. Drives velocity + forecast. */
  closedAt: string | null;
  /** Number of comments/notes on the issue, when the provider reports it cheaply. */
  commentCount: number;
}

export interface NormalizedComment {
  id: number;
  author: string;
  body: string;
  createdAt: string;
  url: string | null;
}

export interface ProviderProject {
  repo: string;
  baseUrl: string | null;
  token: string;
}
