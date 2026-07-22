import "server-only";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/** True when the three env vars the mailer needs are all present. */
export function mailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM && process.env.TEAM_EMAIL);
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface TaskQuestion {
  companyName: string;
  projectName: string;
  issueId: number;
  issueTitle: string;
  issueUrl: string;
  message: string;
  /** Optional reply-to so the team can answer the client directly. */
  replyTo?: string | null;
}

/**
 * Sends a "question about this task" email to the xSingularity team inbox.
 * Uses Resend's REST API directly so no SDK/dependency is required.
 */
export async function sendTaskQuestion(q: TaskQuestion): Promise<void> {
  if (!mailConfigured()) {
    throw new Error("Email is not configured on the server.");
  }

  const subject = `[${q.companyName}] Question on “${q.issueTitle}” (${q.projectName})`;
  const html = `
    <p><strong>${escapeHtml(q.companyName)}</strong> asked about a task in
    <strong>${escapeHtml(q.projectName)}</strong>:</p>
    <blockquote style="border-left:3px solid #ccc;margin:0;padding:0 0 0 12px;color:#333;white-space:pre-wrap">${escapeHtml(
      q.message,
    )}</blockquote>
    <p>Task #${q.issueId}: <a href="${escapeHtml(q.issueUrl)}">${escapeHtml(q.issueTitle)}</a></p>
  `.trim();
  const text =
    `${q.companyName} asked about a task in ${q.projectName}:\n\n` +
    `${q.message}\n\n` +
    `Task #${q.issueId}: ${q.issueTitle}\n${q.issueUrl}`;

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: [process.env.TEAM_EMAIL],
      subject,
      html,
      text,
      ...(q.replyTo ? { reply_to: q.replyTo } : {}),
    }),
  });

  if (!res.ok) {
    throw new Error(`Email provider ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}
