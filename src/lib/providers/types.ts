export type IssueState = "open" | "closed";

export interface NormalizedIssue {
  id: number;
  title: string;
  state: IssueState;
  assignees: string[];
  labels: string[];
  estimateMinutes: number | null;
  url: string;
  updatedAt: string;
}

export interface ProviderProject {
  repo: string;
  baseUrl: string | null;
  token: string;
}
