import "server-only";
import { fetchComments } from "./providers";
import type { NormalizedIssue, ProviderProject } from "./providers/types";
import { isClientComment, stripClientPrefix } from "./comments";

export interface ClientMessage {
  companyId: number;
  companyName: string;
  projectId: number;
  projectName: string;
  provider: string;
  issueId: number;
  issueTitle: string;
  issueUrl: string;
  text: string;
  createdAt: string;
  /** True once someone (not a client) commented after the latest client message. */
  answered: boolean;
}

interface ProjectRef extends ProviderProject {
  id: number;
  name: string;
  provider: string;
  companyId: number;
}

// Comment fetches are one API call each; only scan issues that actually have comments.
const asc = (a: string, b: string) => Date.parse(a) - Date.parse(b);

/**
 * Finds every issue in a project whose latest client (app-posted) comment is still
 * the newest activity — i.e. awaiting a team reply — plus already-answered ones.
 * Takes issues already fetched by the caller so they aren't re-requested.
 */
export async function collectProjectMessages(
  project: ProjectRef,
  companyName: string,
  issues: NormalizedIssue[],
): Promise<ClientMessage[]> {
  const withComments = issues.filter((i) => i.commentCount > 0);

  const results = await Promise.all(
    withComments.map(async (issue): Promise<ClientMessage | null> => {
      let comments;
      try {
        comments = await fetchComments(project.provider, project, issue.id);
      } catch (err) {
        console.error(`inbox: comments for project ${project.id} issue ${issue.id}:`, err);
        return null;
      }
      const sorted = [...comments].sort((a, b) => asc(a.createdAt, b.createdAt));
      const clientMsgs = sorted.filter((c) => isClientComment(c.body));
      if (clientMsgs.length === 0) return null;

      const latest = clientMsgs[clientMsgs.length - 1];
      // Answered = a non-client comment exists *after* the client's latest message.
      const answered = sorted.some(
        (c) => !isClientComment(c.body) && Date.parse(c.createdAt) > Date.parse(latest.createdAt),
      );
      return {
        companyId: project.companyId,
        companyName,
        projectId: project.id,
        projectName: project.name,
        provider: project.provider,
        issueId: issue.id,
        issueTitle: issue.title,
        issueUrl: issue.url,
        text: stripClientPrefix(latest.body),
        createdAt: latest.createdAt,
        answered,
      };
    }),
  );

  return results.filter((m): m is ClientMessage => m !== null);
}

export function sortByNewest(messages: ClientMessage[]) {
  return [...messages].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
