"use server";

import { prisma } from "@/lib/db";
import { getSessionCompany } from "@/lib/auth";
import { fetchComments, fetchIssues, postComment, revalidateProject } from "@/lib/providers";
import type { NormalizedComment } from "@/lib/providers/types";
import { formatClientComment } from "@/lib/comments";
import { mailConfigured, sendTaskQuestion } from "@/lib/mailer";

const MAX_MESSAGE = 5000;

type Result<T> = ({ ok: true } & T) | { ok: false; error: string };
type SimpleResult = { ok: true } | { ok: false; error: string };

/** Loads the project only if it belongs to the logged-in client. */
async function ownedProject(projectId: number) {
  const company = await getSessionCompany();
  if (!company) return null;
  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId: company.id },
  });
  return project ? { company, project } : null;
}

export async function loadComments(
  projectId: number,
  issueId: number,
): Promise<Result<{ comments: NormalizedComment[] }>> {
  const owned = await ownedProject(projectId);
  if (!owned) return { ok: false, error: "Not found." };
  try {
    const comments = await fetchComments(owned.project.provider, owned.project, issueId);
    return { ok: true, comments };
  } catch (err) {
    console.error(`loadComments(${projectId}, ${issueId}):`, err);
    return { ok: false, error: "Could not load the discussion right now." };
  }
}

export async function submitComment(
  projectId: number,
  issueId: number,
  message: string,
): Promise<Result<{ comment: NormalizedComment }>> {
  const owned = await ownedProject(projectId);
  if (!owned) return { ok: false, error: "Not found." };

  const text = message.trim();
  if (!text) return { ok: false, error: "Write a message first." };
  if (text.length > MAX_MESSAGE) return { ok: false, error: "Message is too long." };

  // The repo token posts under the app identity, so name the client in the body.
  const body = formatClientComment(owned.company.name, text);
  try {
    const comment = await postComment(owned.project.provider, owned.project, issueId, body);
    // The new comment changes the issue's comment count and thread, so drop the
    // cached copies both the client and admin views read from.
    revalidateProject(projectId);
    return { ok: true, comment };
  } catch (err) {
    console.error(`submitComment(${projectId}, ${issueId}):`, err);
    const forbidden = err instanceof Error && /\b40[13]\b/.test(err.message);
    return {
      ok: false,
      error: forbidden
        ? "This project's token is read-only, so comments can't be posted. Ask your xSingularity contact to enable write access."
        : "Could not post your comment right now.",
    };
  }
}

export async function askAboutTask(
  projectId: number,
  issueId: number,
  message: string,
): Promise<SimpleResult> {
  const owned = await ownedProject(projectId);
  if (!owned) return { ok: false, error: "Not found." };
  if (!mailConfigured()) {
    return { ok: false, error: "Email isn't set up yet — please use comments for now." };
  }

  const text = message.trim();
  if (!text) return { ok: false, error: "Write a message first." };
  if (text.length > MAX_MESSAGE) return { ok: false, error: "Message is too long." };

  // Resolve the real issue title/url server-side so the team email can't be spoofed.
  let issue;
  try {
    const issues = await fetchIssues(owned.project.provider, owned.project);
    issue = issues.find((i) => i.id === issueId);
  } catch (err) {
    console.error(`askAboutTask fetchIssues(${projectId}):`, err);
    return { ok: false, error: "Could not reach the project right now." };
  }
  if (!issue) return { ok: false, error: "That task no longer exists." };

  try {
    await sendTaskQuestion({
      companyName: owned.company.name,
      projectName: owned.project.name,
      issueId,
      issueTitle: issue.title,
      issueUrl: issue.url,
      message: text,
    });
    return { ok: true };
  } catch (err) {
    console.error(`askAboutTask send(${projectId}, ${issueId}):`, err);
    return { ok: false, error: "Could not send your message right now." };
  }
}
