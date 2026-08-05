"use client";

import { useState, useTransition } from "react";
import type { NormalizedComment } from "@/lib/providers/types";
import { formatMinutes } from "@/lib/estimate";
import { askAboutTask, loadComments, submitComment } from "@/app/projects/[id]/actions";

export interface IssueRowData {
  id: number;
  title: string;
  state: "open" | "closed";
  assignees: string[];
  estimateMinutes: number | null;
  spentMinutes: number | null;
  url: string;
  commentCount: number;
}

function when(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function IssueRow({
  projectId,
  issue,
  emailEnabled,
}: {
  projectId: number;
  issue: IssueRowData;
  emailEnabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<NormalizedComment[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, startLoad] = useTransition();

  const count = comments?.length ?? issue.commentCount;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && comments === null && !loading) {
      startLoad(async () => {
        const res = await loadComments(projectId, issue.id);
        if (res.ok) setComments(res.comments);
        else setLoadError(res.error);
      });
    }
  }

  return (
    <li className="bg-sheet">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <span className="w-8 shrink-0 font-mono text-xs text-ink-soft sm:w-14">#{issue.id}</span>
        <span className="shrink-0">
          {issue.state === "closed" ? (
            <span className="stamp text-[10px] text-delivered">Done</span>
          ) : (
            <span className="stamp text-[10px] text-transit">In progress</span>
          )}
        </span>
        <a
          href={issue.url}
          target="_blank"
          rel="noopener noreferrer"
          className="order-last min-w-0 basis-full truncate text-sm font-medium text-ink hover:underline sm:order-none sm:flex-1 sm:basis-auto"
          title={issue.title}
        >
          {issue.title}
        </a>
        <span className="hidden shrink-0 font-mono text-xs text-ink-soft md:inline">
          {issue.assignees.length ? issue.assignees.join(", ") : "Unassigned"}
        </span>
        <span className="shrink-0 font-mono text-xs text-ink-soft">
          {formatMinutes(issue.estimateMinutes) ?? "—"}
        </span>
        <button type="button" onClick={toggle} aria-expanded={open} className="btn shrink-0 px-2.5 py-1 text-[11px]">
          {open ? "Hide" : "Discuss"}
          {count > 0 && <span className="font-mono normal-case text-ink-soft">({count})</span>}
        </button>
      </div>

      {open && (
        <div className="border-t border-rule bg-sheet-dim/60 px-4 py-4">
          {loading && <p className="text-sm text-ink-soft">Loading discussion…</p>}
          {loadError && <p className="text-sm font-medium text-exception">{loadError}</p>}

          {comments && comments.length > 0 && (
            <ul className="mb-4 space-y-3">
              {comments.map((c) => (
                <li key={c.id} className="border border-rule bg-sheet p-3">
                  <div className="mb-1 flex items-center justify-between gap-2 font-mono text-xs text-ink-soft">
                    <span className="font-semibold text-ink">{c.author}</span>
                    <span>{when(c.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-ink">{c.body}</p>
                </li>
              ))}
            </ul>
          )}
          {comments && comments.length === 0 && (
            <p className="mb-4 text-sm text-ink-soft">No comments yet. Start the conversation below.</p>
          )}

          <CommentComposer
            projectId={projectId}
            issueId={issue.id}
            onPosted={(c) => setComments((prev) => [...(prev ?? []), c])}
          />

          {emailEnabled && <AskTeam projectId={projectId} issueId={issue.id} />}
        </div>
      )}
    </li>
  );
}

function CommentComposer({
  projectId,
  issueId,
  onPosted,
}: {
  projectId: number;
  issueId: number;
  onPosted: (c: NormalizedComment) => void;
}) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post() {
    if (!body.trim() || busy) return;
    setBusy(true);
    setError(null);
    const res = await submitComment(projectId, issueId, body);
    setBusy(false);
    if (res.ok) {
      onPosted(res.comment);
      setBody("");
    } else {
      setError(res.error);
    }
  }

  return (
    <div>
      <label className="label-caps mb-1 block text-[11px] text-ink-soft">Add a comment</label>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Ask a question or leave a note — it posts to the task thread."
        className="input"
      />
      {error && <p className="mt-1 text-xs font-medium text-exception">{error}</p>}
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={post}
          disabled={busy || !body.trim()}
          className="btn btn-primary px-3 py-1.5 text-xs"
        >
          {busy ? "Posting…" : "Post comment"}
        </button>
      </div>
    </div>
  );
}

function AskTeam({ projectId, issueId }: { projectId: number; issueId: number }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function send() {
    if (!body.trim() || busy) return;
    setBusy(true);
    setError(null);
    const res = await askAboutTask(projectId, issueId, body);
    setBusy(false);
    if (res.ok) {
      setSent(true);
      setBody("");
    } else {
      setError(res.error);
    }
  }

  if (sent) {
    return (
      <p className="mt-4 border border-delivered bg-delivered/5 px-3 py-2 text-sm font-medium text-delivered">
        Sent to the xSingularity team — they’ll reply by email.
      </p>
    );
  }

  return (
    <div className="mt-4 border-t border-rule pt-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm font-medium text-transit underline decoration-rule-mid transition-colors hover:decoration-transit"
        >
          Prefer email? Ask the xSingularity team about this task
        </button>
      ) : (
        <div>
          <label className="label-caps mb-1 block text-[11px] text-ink-soft">
            Message the xSingularity team (private — not posted to the task)
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="e.g. When do you expect this to be ready?"
            className="input"
          />
          {error && <p className="mt-1 text-xs font-medium text-exception">{error}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn px-3 py-1.5 text-xs">
              Cancel
            </button>
            <button
              type="button"
              onClick={send}
              disabled={busy || !body.trim()}
              className="btn btn-primary px-3 py-1.5 text-xs"
            >
              {busy ? "Sending…" : "Send email"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
