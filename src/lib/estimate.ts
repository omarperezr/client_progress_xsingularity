// Parses human estimates like "3d 4h 30m", "1w 2d", "5h" into minutes.
// 1w = 5 working days, 1d = 8 working hours.
const UNIT_MINUTES: Record<string, number> = { w: 5 * 8 * 60, d: 8 * 60, h: 60, m: 1 };
const TOKEN_RE = /(\d+(?:\.\d+)?)\s*(w|d|h|m)\b/gi;

export function parseEstimate(text: string | null | undefined): number | null {
  if (!text) return null;
  let minutes = 0;
  let matched = false;
  for (const [, amount, unit] of text.matchAll(TOKEN_RE)) {
    minutes += parseFloat(amount) * UNIT_MINUTES[unit.toLowerCase()];
    matched = true;
  }
  return matched ? Math.round(minutes) : null;
}

/** Finds an estimate inside an issue body: a line like "Estimate: 2d 4h". */
export function estimateFromBody(body: string | null | undefined): number | null {
  if (!body) return null;
  const line = body.match(/^\s*(?:\*\*)?estimate(?:\*\*)?\s*:\s*(.+)$/im);
  return line ? parseEstimate(line[1]) : null;
}

/** Finds an estimate in labels like "estimate: 4h" or "estimate::4h". */
export function estimateFromLabels(labelNames: string[] | null | undefined): number | null {
  for (const name of labelNames ?? []) {
    const m = name.match(/^estimate\s*::?\s*(.+)$/i);
    if (m) {
      const minutes = parseEstimate(m[1]);
      if (minutes !== null) return minutes;
    }
  }
  return null;
}

/** Formats minutes as "2d 3h 30m" using 8-hour working days. */
export function formatMinutes(minutes: number | null | undefined): string | null {
  if (minutes === null || minutes === undefined) return null;
  const d = Math.floor(minutes / (8 * 60));
  const h = Math.floor((minutes % (8 * 60)) / 60);
  const m = Math.round(minutes % 60);
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  return parts.length ? parts.join(" ") : "0m";
}
