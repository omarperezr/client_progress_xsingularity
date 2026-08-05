import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { AdminHeader } from "@/components/AdminHeader";
import { Banner, Card, DangerButton, DangerZone, Field, SubmitButton } from "@/components/AdminForm";
import { PendingButton } from "@/components/PendingButton";
import {
  addDraftIssue,
  analyzeMeeting,
  deleteDraftIssue,
  deleteMeeting,
  pushDraftIssues,
  updateDraftIssue,
} from "../../actions";

export const dynamic = "force-dynamic";
// Transcription/analysis actions call Groq; allow more than the default runtime.
export const maxDuration = 60;

export const metadata = { title: "Meeting · Client Progress" };

export default async function MeetingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const { ok, error } = await searchParams;

  const meeting = await prisma.meeting.findUnique({
    where: { id: Number(id) || 0 },
    include: {
      project: { include: { company: true } },
      draftIssues: { orderBy: { id: "asc" } },
    },
  });
  if (!meeting) notFound();

  const drafts = meeting.draftIssues.filter((d) => d.status === "draft");
  const pushed = meeting.draftIssues.filter((d) => d.status === "pushed");

  return (
    <div className="min-h-screen w-full">
      <AdminHeader admin={admin} />
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <Link
          href={`/admin/projects/${meeting.projectId}`}
          className="label-caps text-xs text-ink-soft transition-colors hover:text-ink"
        >
          ← {meeting.project.name}
        </Link>
        <div className="mt-3 mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-b-2 border-ink pb-3">
          <h1 className="min-w-0 truncate text-2xl font-semibold leading-tight text-ink">
            {meeting.filename}
          </h1>
          <span className="stamp text-[10px] text-transit">{meeting.status}</span>
        </div>
        <Banner ok={ok} error={error} />

        <div className="space-y-6">
          <Card title="Transcript" description="Produced by Whisper from the uploaded recording.">
            {meeting.transcript ? (
              <details>
                <summary className="cursor-pointer text-sm font-medium text-ink-soft transition-colors hover:text-ink">
                  Show full transcript ({meeting.transcript.length.toLocaleString()} chars)
                </summary>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                  {meeting.transcript}
                </p>
              </details>
            ) : (
              <p className="text-sm text-ink-soft">Still uploading or transcription failed.</p>
            )}
          </Card>

          {meeting.transcript && (
            <Card
              title="Draft issues"
              description="AI-drafted from the transcript. Edit or discard each draft; pushing sends every remaining draft to GitLab as a real issue with its time estimate."
            >
              <form action={analyzeMeeting} className="mb-5">
                <input type="hidden" name="id" value={meeting.id} />
                <SubmitButton pendingText="Analyzing transcript…">
                  {meeting.draftIssues.length ? "Re-analyze transcript (adds drafts)" : "Generate draft issues"}
                </SubmitButton>
              </form>

              <div className="space-y-4">
                {drafts.map((draft) => (
                  <details key={draft.id} className="border border-rule bg-sheet-dim/60 p-4">
                    <summary className="cursor-pointer text-sm font-medium text-ink">
                      {draft.title}
                      <span className="ml-2 font-mono text-xs font-normal text-ink-soft">
                        {draft.estimateMinutes ? `${(draft.estimateMinutes / 60).toFixed(1)}h · ` : ""}
                        {draft.requirement}
                      </span>
                    </summary>
                    <form action={updateDraftIssue} className="mt-4 space-y-3">
                      <input type="hidden" name="id" value={draft.id} />
                      <Field label="Title" name="title" defaultValue={draft.title} required />
                      <Field
                        label="Client requirement"
                        name="requirement"
                        defaultValue={draft.requirement}
                      />
                      <label className="block">
                        <span className="label-caps mb-1 block text-[11px] text-ink-soft">
                          Description (Markdown)
                        </span>
                        <textarea
                          name="description"
                          defaultValue={draft.description}
                          rows={8}
                          required
                          className="input font-mono text-xs"
                        />
                      </label>
                      <Field
                        label="Estimate (hours)"
                        name="estimateHours"
                        type="number"
                        defaultValue={
                          draft.estimateMinutes ? String(draft.estimateMinutes / 60) : ""
                        }
                      />
                      <div className="flex gap-3">
                        <SubmitButton>Save draft</SubmitButton>
                      </div>
                    </form>
                    <form action={deleteDraftIssue} className="mt-2">
                      <input type="hidden" name="id" value={draft.id} />
                      <PendingButton
                        pendingText="Discarding…"
                        className="text-sm font-medium text-exception hover:underline"
                      >
                        Discard draft
                      </PendingButton>
                    </form>
                  </details>
                ))}
                {drafts.length === 0 && (
                  <p className="text-sm text-ink-soft">
                    No drafts pending{pushed.length ? " — everything was pushed." : "."}
                  </p>
                )}
              </div>

              {drafts.length > 0 && (
                <form action={pushDraftIssues} className="mt-6">
                  <input type="hidden" name="meetingId" value={meeting.id} />
                  <SubmitButton pendingText="Pushing to GitLab…">
                    {`Push ${drafts.length} issue${drafts.length === 1 ? "" : "s"} to GitLab`}
                  </SubmitButton>
                </form>
              )}

              {pushed.length > 0 && (
                <ul className="mt-6 space-y-1.5 text-sm text-ink-soft">
                  {pushed.map((d) => (
                    <li key={d.id} className="flex items-center gap-2">
                      <span className="stamp text-[10px] text-delivered">Pushed</span>
                      <span className="font-mono text-xs">#{d.gitlabIid}</span> {d.title}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {meeting.transcript && (
            <Card title="Add a draft by hand" description="For requirements the analysis missed.">
              <form action={addDraftIssue} className="space-y-3">
                <input type="hidden" name="meetingId" value={meeting.id} />
                <Field label="Title" name="title" required />
                <label className="block">
                  <span className="label-caps mb-1 block text-[11px] text-ink-soft">
                    Description (Markdown)
                  </span>
                  <textarea name="description" rows={4} className="input font-mono text-xs" />
                </label>
                <SubmitButton>Add draft</SubmitButton>
              </form>
            </Card>
          )}

          <DangerZone
            summary="Delete this meeting"
            warning="Removes the transcript and all drafts. Issues already pushed to GitLab are untouched."
          >
            <form action={deleteMeeting}>
              <input type="hidden" name="id" value={meeting.id} />
              <DangerButton>Yes, delete permanently</DangerButton>
            </form>
          </DangerZone>
        </div>
      </main>
    </div>
  );
}
