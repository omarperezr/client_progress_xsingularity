"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createMeeting,
  createMeetingFromTranscript,
  finalizeMeeting,
  uploadMeetingChunk,
} from "@/app/admin/actions";

// Keep well under the serverless request-body cap.
const CHUNK_BYTES = 3 * 1024 * 1024;
const MAX_BYTES = 25 * 1024 * 1024;

/** Chunked uploader for a meeting recording; transcription runs on finalize. */
export function MeetingUpload({ projectId }: { projectId: number }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    // A .txt is already a transcript — save it directly, no Whisper involved.
    if (file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt")) {
      setBusy(true);
      setState("Saving transcript…");
      try {
        const form = new FormData();
        form.append("projectId", String(projectId));
        form.append("title", file.name);
        form.append("transcript", await file.text());
        await createMeetingFromTranscript(form); // redirects to the meeting page
      } catch (err) {
        setState(err instanceof Error ? err.message : "Saving failed.");
        setBusy(false);
      }
      return;
    }
    if (file.size > MAX_BYTES) {
      setState("File is over 25MB. Upload Zoom's audio-only .m4a (Settings → Recording → \"Record a separate audio file\"), not the video.");
      return;
    }
    setBusy(true);
    try {
      const meetingId = await createMeeting(projectId, file.name);
      const chunks = Math.ceil(file.size / CHUNK_BYTES);
      for (let seq = 0; seq < chunks; seq++) {
        setState(`Uploading… ${Math.round((seq / chunks) * 100)}%`);
        const form = new FormData();
        form.append("chunk", file.slice(seq * CHUNK_BYTES, (seq + 1) * CHUNK_BYTES));
        await uploadMeetingChunk(meetingId, seq, form);
      }
      setState("Transcribing with Whisper…");
      await finalizeMeeting(meetingId);
      setState(null);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (err) {
      setState(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block text-sm text-zinc-400">
        Zoom recording (audio-only .m4a preferred, max 25MB) or a .txt transcript
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,video/mp4,.txt,text/plain"
          required
          className="mt-1 block w-full text-sm text-zinc-300 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-sm file:text-zinc-200 hover:file:bg-zinc-700"
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
      >
        {busy ? "Working…" : "Upload & transcribe"}
      </button>
      {state && <p className="text-sm text-amber-400">{state}</p>}
    </form>
  );
}
