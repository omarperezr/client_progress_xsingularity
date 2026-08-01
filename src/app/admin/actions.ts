"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, destroySession, hashPassword } from "@/lib/auth";
import {
  createAdminSession,
  destroyAdminSession,
  requireAdmin,
  verifyAdminCredentials,
} from "@/lib/admin-auth";
import { isProvider } from "@/lib/providers";

/** Sends the admin back to `path` with a message shown at the top of the page. */
function back(path: string, error: string): never {
  redirect(`${path}?error=${encodeURIComponent(error)}`);
}

function done(path: string, message: string): never {
  revalidatePath(path);
  redirect(`${path}?ok=${encodeURIComponent(message)}`);
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function adminLogin(formData: FormData) {
  const username = text(formData, "username");
  const password = String(formData.get("password") ?? "");
  if (!username || !password) back("/admin/login", "Enter a username and password.");
  let ok = false;
  try {
    ok = verifyAdminCredentials(username, password);
    if (ok) await createAdminSession(username);
  } catch (err) {
    // Missing ADMIN_USERNAME / ADMIN_PASSWORD / SESSION_SECRET env vars land here.
    console.error("adminLogin misconfiguration:", err);
    back("/admin/login", "Server configuration error — check the deployment's environment variables.");
  }
  if (!ok) back("/admin/login", "Invalid admin credentials.");
  redirect("/admin");
}

export async function adminLogout() {
  await destroyAdminSession();
  redirect("/admin/login");
}

/**
 * Logs the admin into a client's own view ("view as"). Sets the client session
 * cookie alongside the admin one, so the dashboard shows exactly what the client
 * sees and the admin can return with `stopImpersonating`.
 */
export async function impersonateCompany(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) back("/admin", "That client no longer exists.");
  await createSession(company.id);
  redirect("/");
}

export async function stopImpersonating() {
  // Still gated on the admin session; only clears the client session.
  await requireAdmin();
  await destroySession();
  redirect("/admin");
}

export async function createCompany(formData: FormData) {
  await requireAdmin();
  const name = text(formData, "name");
  const username = text(formData, "username");
  const password = String(formData.get("password") ?? "");
  if (!name || !username || !password) back("/admin", "Name, username and password are required.");

  let company;
  try {
    company = await prisma.company.create({
      data: { name, username, passwordHash: hashPassword(password) },
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      back("/admin", `Username "${username}" is already taken.`);
    }
    throw err;
  }
  revalidatePath("/admin");
  done(`/admin/companies/${company.id}`, `Company "${company.name}" created.`);
}

export async function updateCompany(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const path = `/admin/companies/${id}`;
  const name = text(formData, "name");
  const username = text(formData, "username");
  const password = String(formData.get("password") ?? "");
  if (!id || !name || !username) back(path, "Name and username are required.");

  try {
    await prisma.company.update({
      where: { id },
      data: {
        name,
        username,
        // An empty password field means "keep the current password".
        ...(password ? { passwordHash: hashPassword(password) } : {}),
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      back(path, `Username "${username}" is already taken.`);
    }
    throw err;
  }
  revalidatePath("/admin");
  done(path, password ? "Company updated and password reset." : "Company updated.");
}

export async function deleteCompany(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id) back("/admin", "Missing company id.");
  // Projects are removed with the company (onDelete: Cascade).
  const company = await prisma.company.delete({ where: { id } });
  done("/admin", `Company "${company.name}" and its projects were deleted.`);
}

export async function createProject(formData: FormData) {
  await requireAdmin();
  const companyId = Number(formData.get("companyId"));
  const path = `/admin/companies/${companyId}`;
  const name = text(formData, "name");
  const provider = text(formData, "provider");
  const repo = text(formData, "repo");
  const token = String(formData.get("token") ?? "").trim();
  const baseUrl = text(formData, "baseUrl");

  if (!companyId) back("/admin", "Missing company id.");
  if (!name || !repo || !token) back(path, "Name, repo and token are required.");
  if (!isProvider(provider)) back(path, `Provider must be "github" or "gitlab".`);

  const project = await prisma.project.create({
    data: { companyId, name, provider, repo, token, baseUrl: baseUrl || null },
  });
  revalidatePath("/admin");
  done(path, `Project "${project.name}" created.`);
}

export async function updateProject(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const path = `/admin/projects/${id}`;
  const name = text(formData, "name");
  const provider = text(formData, "provider");
  const repo = text(formData, "repo");
  const token = String(formData.get("token") ?? "").trim();
  const baseUrl = text(formData, "baseUrl");
  const companyId = Number(formData.get("companyId"));

  if (!id) back("/admin", "Missing project id.");
  if (!name || !repo || !companyId) back(path, "Name, repo and company are required.");
  if (!isProvider(provider)) back(path, `Provider must be "github" or "gitlab".`);

  await prisma.project.update({
    where: { id },
    data: {
      companyId,
      name,
      provider,
      repo,
      baseUrl: baseUrl || null,
      // An empty token field means "keep the current token".
      ...(token ? { token } : {}),
    },
  });
  revalidatePath("/admin");
  done(path, token ? "Project updated and token replaced." : "Project updated.");
}

export async function deleteProject(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id) back("/admin", "Missing project id.");
  const project = await prisma.project.delete({ where: { id } });
  revalidatePath("/admin");
  done(`/admin/companies/${project.companyId}`, `Project "${project.name}" was deleted.`);
}

/* ─────────────────────────── Project intake ───────────────────────────
 * Package sold on the site → kick-off call on Zoom → this flow:
 * approve (create GitLab repo) → upload recording → transcribe (Groq Whisper)
 * → AI-draft issues → developer review → push confirmed issues to GitLab.
 */

import { MAX_AUDIO_BYTES, draftIssuesFromTranscript, transcribe } from "@/lib/groq";
import { adminToken, createIssue, createRepo } from "@/lib/gitlab-admin";

/** Approval step: creates the GitLab repo and the Project row in one go. */
export async function createProjectWithRepo(formData: FormData) {
  await requireAdmin();
  const companyId = Number(formData.get("companyId"));
  const path = `/admin/companies/${companyId}`;
  const name = text(formData, "name");
  const pkg = text(formData, "package");
  if (!companyId) back("/admin", "Missing company id.");
  if (!name) back(path, "Project name is required.");

  let repo;
  let token;
  try {
    token = adminToken();
    repo = await createRepo(name);
  } catch (err) {
    console.error("createProjectWithRepo:", err);
    back(path, err instanceof Error ? err.message : "Could not create the GitLab repository.");
  }
  const project = await prisma.project.create({
    data: {
      companyId,
      name,
      provider: "gitlab",
      repo: repo.pathWithNamespace,
      token,
      package: pkg || null,
    },
  });
  revalidatePath("/admin");
  done(`/admin/projects/${project.id}`, `GitLab repo "${repo.pathWithNamespace}" created.`);
}

/* Meeting recordings arrive in ~3MB chunks because serverless request bodies
 * are capped well below a full recording. Chunks live in Postgres only until
 * transcription succeeds. */

export async function createMeeting(projectId: number, filename: string): Promise<number> {
  await requireAdmin();
  const meeting = await prisma.meeting.create({
    data: { projectId, filename: filename.slice(0, 255) || "recording" },
  });
  return meeting.id;
}

export async function uploadMeetingChunk(meetingId: number, seq: number, formData: FormData) {
  await requireAdmin();
  const blob = formData.get("chunk");
  if (!(blob instanceof Blob)) throw new Error("Missing chunk.");
  const data = Buffer.from(await blob.arrayBuffer());
  await prisma.meetingChunk.create({ data: { meetingId, seq, data } });
}

/** Reassembles the chunks, transcribes with Groq Whisper, drops the audio. */
export async function finalizeMeeting(meetingId: number): Promise<void> {
  await requireAdmin();
  const meeting = await prisma.meeting.findUniqueOrThrow({ where: { id: meetingId } });
  const chunks = await prisma.meetingChunk.findMany({
    where: { meetingId },
    orderBy: { seq: "asc" },
  });
  const audio = Buffer.concat(chunks.map((c) => Buffer.from(c.data)));
  if (audio.byteLength > MAX_AUDIO_BYTES) {
    await prisma.meeting.delete({ where: { id: meetingId } });
    throw new Error(
      "Recording is over 25MB (Groq's limit). Upload Zoom's audio-only .m4a instead of the video.",
    );
  }
  try {
    const transcript = await transcribe(audio, meeting.filename);
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { transcript, status: "transcribed" },
    });
  } finally {
    // Success or failure, never keep audio around.
    await prisma.meetingChunk.deleteMany({ where: { meetingId } });
  }
  revalidatePath(`/admin/projects/${meeting.projectId}`);
}

export async function deleteMeeting(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id) back("/admin", "Missing meeting id.");
  const meeting = await prisma.meeting.delete({ where: { id } });
  done(`/admin/projects/${meeting.projectId}`, "Meeting deleted.");
}

/** Turns the transcript into draft issues for developer review. */
export async function analyzeMeeting(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const path = `/admin/meetings/${id}`;
  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: { project: true },
  });
  if (!meeting?.transcript) back(path, "This meeting has no transcript yet.");

  let drafted;
  try {
    drafted = await draftIssuesFromTranscript(meeting.transcript, {
      projectName: meeting.project.name,
      package: meeting.project.package,
    });
  } catch (err) {
    console.error("analyzeMeeting:", err);
    back(path, err instanceof Error ? err.message : "Analysis failed.");
  }
  await prisma.draftIssue.createMany({
    data: drafted.map((d) => ({
      meetingId: meeting.id,
      requirement: d.requirement,
      title: d.title,
      description: d.description,
      estimateMinutes: Math.round(d.estimateHours * 60),
    })),
  });
  await prisma.meeting.update({ where: { id }, data: { status: "analyzed" } });
  done(path, `${drafted.length} draft issue${drafted.length === 1 ? "" : "s"} generated — review below.`);
}

export async function updateDraftIssue(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const draft = await prisma.draftIssue.findUnique({ where: { id }, include: { meeting: true } });
  if (!draft) back("/admin", "Draft no longer exists.");
  const path = `/admin/meetings/${draft.meetingId}`;
  const title = text(formData, "title");
  const description = String(formData.get("description") ?? "").trim();
  const hours = Number(formData.get("estimateHours"));
  if (!title || !description) back(path, "Title and description are required.");
  await prisma.draftIssue.update({
    where: { id },
    data: {
      title,
      description,
      requirement: text(formData, "requirement") || draft.requirement,
      estimateMinutes: hours > 0 ? Math.round(hours * 60) : null,
    },
  });
  done(path, "Draft updated.");
}

export async function deleteDraftIssue(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const draft = await prisma.draftIssue.delete({ where: { id } });
  done(`/admin/meetings/${draft.meetingId}`, "Draft discarded.");
}

export async function addDraftIssue(formData: FormData) {
  await requireAdmin();
  const meetingId = Number(formData.get("meetingId"));
  const path = `/admin/meetings/${meetingId}`;
  const title = text(formData, "title");
  if (!title) back(path, "Title is required.");
  await prisma.draftIssue.create({
    data: {
      meetingId,
      title,
      description: String(formData.get("description") ?? "").trim() || title,
      requirement: text(formData, "requirement") || "Added by developer",
    },
  });
  done(path, "Draft added.");
}

/** The confirm step: every remaining draft becomes a real GitLab issue. */
export async function pushDraftIssues(formData: FormData) {
  await requireAdmin();
  const meetingId = Number(formData.get("meetingId"));
  const path = `/admin/meetings/${meetingId}`;
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { project: true, draftIssues: { where: { status: "draft" }, orderBy: { id: "asc" } } },
  });
  if (!meeting) back("/admin", "Meeting no longer exists.");
  if (meeting.project.provider !== "gitlab") back(path, "Pushing issues requires a GitLab project.");
  if (meeting.draftIssues.length === 0) back(path, "No drafts left to push.");

  let pushed = 0;
  for (const draft of meeting.draftIssues) {
    try {
      const iid = await createIssue(meeting.project.repo, draft);
      await prisma.draftIssue.update({
        where: { id: draft.id },
        data: { status: "pushed", gitlabIid: iid },
      });
      pushed++;
    } catch (err) {
      // Stop at the first failure; already-pushed drafts stay marked, so
      // re-running the action continues where it left off without duplicates.
      console.error(`pushDraftIssues draft ${draft.id}:`, err);
      back(path, `Pushed ${pushed} issue(s), then failed: ${err instanceof Error ? err.message : err}`);
    }
  }
  revalidatePath(`/admin/projects/${meeting.projectId}`);
  done(path, `${pushed} issue${pushed === 1 ? "" : "s"} created in GitLab.`);
}

/** Manual path: paste a transcript (unrecorded call, notes) instead of audio. */
export async function createMeetingFromTranscript(formData: FormData) {
  await requireAdmin();
  const projectId = Number(formData.get("projectId"));
  const path = `/admin/projects/${projectId}`;
  const transcript = String(formData.get("transcript") ?? "").trim();
  if (!projectId) back("/admin", "Missing project id.");
  if (transcript.length < 50) back(path, "Transcript is too short to analyze.");
  const meeting = await prisma.meeting.create({
    data: {
      projectId,
      filename: text(formData, "title") || "Pasted transcript",
      transcript,
      status: "transcribed",
    },
  });
  done(`/admin/meetings/${meeting.id}`, "Transcript saved — generate draft issues below.");
}
