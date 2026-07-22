// Marker embedded in every comment a client posts through the app, so the admin
// inbox can tell client messages apart from the team's replies on the same issue.
export const CLIENT_COMMENT_TAG = "(via Client Progress)";

/** Body posted to the issue when a client comments: names the client, keeps the tag. */
export function formatClientComment(companyName: string, message: string) {
  return `**${companyName} ${CLIENT_COMMENT_TAG}:**\n\n${message}`;
}

/**
 * True only for comments the app itself posted — the bold header line
 * `**<Company> (via Client Progress):**` at the very start of the body.
 *
 * Matching only the leading header (not the tag anywhere) is deliberate: when a
 * team member replies with the provider's "Reply" button the client's message is
 * quoted (`> **Acme (via Client Progress):** …`), so the tag appears inside the
 * reply. Those quote lines start with `>`, so they don't match — and the reply is
 * correctly counted as an answer instead of another client message.
 */
export function isClientComment(body: string) {
  const firstLine = body.trimStart().split("\n", 1)[0] ?? "";
  return firstLine.startsWith("**") && firstLine.includes(CLIENT_COMMENT_TAG);
}

/** Drops the `**<Company> (via Client Progress):**` header for clean display. */
export function stripClientPrefix(body: string) {
  return body.replace(/^\s*\*\*[^*]*\(via Client Progress\):\*\*\s*/i, "").trim();
}
