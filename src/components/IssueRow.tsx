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
    <li className="rounded-lg border border-zinc-800 bg-zinc-950">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <span className="shrink-0">
          {issue.state === "closed" ? (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
              Done
            </span>
          ) : (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
              In progress
            </span>
          )}
        </span>
        <a
          href={issue.url}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex-1 truncate text-sm text-zinc-200 hover:underline"
          title={issue.title}
        >
          {issue.title}
        </a>
        <span className="hidden shrink-0 text-xs text-zinc-500 sm:inline">
          {issue.assignees.length ? issue.assignees.join(", ") : "Unassigned"}
        </span>
        <span className="shrink-0 text-xs text-zinc-500">
          {formatMinutes(issue.estimateMinutes) ?? "—"}
        </span>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="shrink-0 rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 transition hover:bg-zinc-800"
        >
          {open ? "Hide" : "Discuss"}
          {count > 0 && <span className="ml-1 text-zinc-500">({count})</span>}
        </button>
      </div>

      {open && (
        <div className="border-t border-zinc-800 px-4 py-4">
          {loading && <p className="text-sm text-zinc-500">Loading discussion…</p>}
          {loadError && <p className="text-sm text-red-400">{loadError}</p>}

          {comments && comments.length > 0 && (
            <ul className="mb-4 space-y-3">
              {comments.map((c) => (
                <li key={c.id} className="rounded-md bg-zinc-900 p-3">
                  <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
                    <span className="font-medium text-zinc-300">{c.author}</span>
                    <span>{when(c.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-zinc-300">{c.body}</p>
                </li>
              ))}
            </ul>
          )}
          {comments && comments.length === 0 && (
            <p className="mb-4 text-sm text-zinc-500">No comments yet. Start the conversation below.</p>
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
      <label className="mb-1 block text-xs font-medium text-zinc-400">Add a comment</label>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Ask a question or leave a note — it posts to the task thread."
        className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={post}
          disabled={busy || !body.trim()}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
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
      <p className="mt-4 rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
        Sent to the xSingularity team — they’ll reply by email.
      </p>
    );
  }

  return (
    <div className="mt-4 border-t border-zinc-800 pt-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm text-indigo-400 transition hover:text-indigo-300"
        >
          Prefer email? Ask the xSingularity team about this task →
        </button>
      ) : (
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-400">
            Message the xSingularity team (private — not posted to the task)
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="e.g. When do you expect this to be ready?"
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
          />
          {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={send}
              disabled={busy || !body.trim()}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send email"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
