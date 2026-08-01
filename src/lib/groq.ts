/**
 * Groq free-tier API: Whisper for meeting transcription, an LLM for turning
 * the transcript into draft issues. One env var (GROQ_API_KEY) powers both.
 */

const GROQ_HOST = "https://api.groq.com/openai/v1";
// Free tier rejects audio files over 25MB. Zoom's audio-only .m4a is ~0.5MB/min,
// so a typical 1h call fits. ponytail: no chunked transcription — if calls start
// exceeding 25MB, split the audio by time client-side and concatenate transcripts.
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

function apiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set.");
  return key;
}

export async function transcribe(audio: Buffer, filename: string): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(audio)]), filename);
  form.append("model", "whisper-large-v3-turbo");
  form.append("response_format", "text");
  const res = await fetch(`${GROQ_HOST}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}` },
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Groq transcription ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return (await res.text()).trim();
}

export interface DraftedIssue {
  requirement: string;
  title: string;
  description: string;
  estimateHours: number;
}

const DRAFT_PROMPT = `You are a senior software engineer planning a client project.
You are given the transcript of a project kick-off call (it may be in Spanish or English, possibly with transcription errors).

Extract every concrete requirement the client stated, and for each requirement write one or more development issues. Rules:
- "requirement": the client's need in one sentence, in the language the client spoke.
- "title": short imperative issue title in English.
- "description": Markdown with two sections: "## Context" (why, referencing what the client said) and "## Acceptance criteria" (a checklist).
- "estimateHours": realistic effort for one developer, between 0.5 and 40.
- Only include real, buildable requirements — skip pleasantries, scheduling talk and pricing discussion.

Respond with JSON only: {"issues": [{"requirement": "...", "title": "...", "description": "...", "estimateHours": 2}]}`;

export async function draftIssuesFromTranscript(
  transcript: string,
  context: { projectName: string; package?: string | null },
): Promise<DraftedIssue[]> {
  const res = await fetch(`${GROQ_HOST}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: DRAFT_PROMPT },
        {
          role: "user",
          content:
            `Project: ${context.projectName}` +
            (context.package ? `\nPackage sold: ${context.package}` : "") +
            `\n\nTranscript:\n${transcript}`,
        },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`Groq analysis ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = await res.json();
  const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
  const issues: unknown = parsed.issues;
  if (!Array.isArray(issues)) throw new Error("Model returned no issues array.");
  return issues
    .filter(
      (i): i is DraftedIssue =>
        !!i && typeof i.title === "string" && typeof i.description === "string",
    )
    .map((i) => ({
      requirement: String(i.requirement ?? "").slice(0, 500) || "General",
      title: i.title.slice(0, 255),
      description: i.description,
      estimateHours: Math.min(Math.max(Number(i.estimateHours) || 1, 0.5), 40),
    }));
}
