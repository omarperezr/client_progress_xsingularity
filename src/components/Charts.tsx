import type { BurnupPoint, Breakdown, Forecast, WeekBucket } from "@/lib/analytics";
import { formatMinutes } from "@/lib/estimate";

// Dark-surface palette, kept in step with the app's Tailwind zinc/emerald/amber theme.
const DONE = "#10b981"; // emerald-500
const GRID = "#27272a"; // zinc-800
const AXIS = "#3f3f46"; // zinc-700
const MUTED = "#71717a"; // zinc-500

/**
 * Burnup: cumulative % complete per week, plus a dashed projection to 100% at the
 * forecast ETA. One series, so no legend — the title names it.
 */
export function Burnup({ burnup, forecast }: { burnup: BurnupPoint[]; forecast: Forecast }) {
  const W = 720;
  const H = 220;
  const L = 34;
  const R = 706;
  const T = 12;
  const B = 184;
  const useTime = burnup.some((p) => p.percentByTime !== null);
  const value = (p: BurnupPoint) => (useTime ? (p.percentByTime ?? 0) : p.percentByIssues);

  const lastIdx = burnup.length - 1;
  const projWeeks =
    forecast.status === "projected" && forecast.weeksRemaining ? forecast.weeksRemaining : 0;
  const domainMax = Math.max(lastIdx + projWeeks, lastIdx, 1);

  const x = (i: number) => L + (i / domainMax) * (R - L);
  const y = (pct: number) => B - (Math.max(0, Math.min(100, pct)) / 100) * (B - T);

  const pts = burnup.map((p, i) => ({ px: x(i), py: y(value(p)), pct: value(p), label: p.label }));
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p.px.toFixed(1)},${p.py.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1].px.toFixed(1)},${B} L${pts[0].px.toFixed(1)},${B} Z`;

  const last = pts[pts.length - 1];
  const projEnd = projWeeks > 0 ? { px: x(lastIdx + projWeeks), py: y(100) } : null;

  const every = Math.max(1, Math.ceil(burnup.length / 6));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Progress over time">
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}>
          <line x1={L} x2={R} y1={y(g)} y2={y(g)} stroke={GRID} strokeWidth={1} />
          <text x={L - 6} y={y(g) + 3} textAnchor="end" fontSize={9} fill={MUTED}>
            {g}%
          </text>
        </g>
      ))}

      <path d={area} fill={DONE} fillOpacity={0.12} />
      <path d={line} fill="none" stroke={DONE} strokeWidth={2} strokeLinejoin="round" />

      {projEnd && (
        <>
          <line
            x1={last.px}
            y1={last.py}
            x2={projEnd.px}
            y2={projEnd.py}
            stroke={DONE}
            strokeWidth={2}
            strokeDasharray="4 4"
            strokeOpacity={0.6}
          />
          <circle cx={projEnd.px} cy={projEnd.py} r={3.5} fill={DONE} fillOpacity={0.6} />
          <text x={projEnd.px} y={projEnd.py - 7} textAnchor="end" fontSize={9} fill={MUTED}>
            forecast
          </text>
        </>
      )}

      {pts.map((p, i) => (
        <circle key={i} cx={p.px} cy={p.py} r={i === lastIdx ? 3.5 : 2} fill={DONE}>
          <title>{`${p.label}: ${p.pct}% complete`}</title>
        </circle>
      ))}

      {pts.map((p, i) =>
        i % every === 0 || i === lastIdx ? (
          <text key={`l${i}`} x={p.px} y={B + 14} textAnchor="middle" fontSize={9} fill={MUTED}>
            {p.label}
          </text>
        ) : null,
      )}
    </svg>
  );
}

/** Weekly throughput bars (tasks closed per week). One series, native hover titles. */
export function VelocityChart({ weeks }: { weeks: WeekBucket[] }) {
  const data = weeks.slice(-12);
  const W = 720;
  const H = 180;
  const L = 24;
  const R = 712;
  const T = 10;
  const B = 150;
  const max = Math.max(1, ...data.map((w) => w.closedIssues));
  const slot = (R - L) / data.length;
  const barW = Math.min(34, slot - 6);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Tasks completed per week">
      <line x1={L} x2={R} y1={B} y2={B} stroke={AXIS} strokeWidth={1} />
      {data.map((w, i) => {
        const h = (w.closedIssues / max) * (B - T);
        const cx = L + slot * i + slot / 2;
        return (
          <g key={w.weekStart}>
            <rect
              x={cx - barW / 2}
              y={B - h}
              width={barW}
              height={Math.max(h, w.closedIssues > 0 ? 2 : 0)}
              rx={4}
              fill={DONE}
              fillOpacity={0.85}
            >
              <title>
                {`Week of ${w.label}: ${w.closedIssues} task${w.closedIssues === 1 ? "" : "s"}${
                  w.closedMinutes ? ` · ${formatMinutes(w.closedMinutes)}` : ""
                }`}
              </title>
            </rect>
            {w.closedIssues > 0 && (
              <text x={cx} y={B - h - 4} textAnchor="middle" fontSize={9} fill={MUTED}>
                {w.closedIssues}
              </text>
            )}
            <text x={cx} y={B + 14} textAnchor="middle" fontSize={9} fill={MUTED}>
              {w.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Segmented status bar: done / in progress / not started, with a labeled legend. */
export function StatusBar({
  status,
}: {
  status: { notStarted: number; inProgress: number; done: number };
}) {
  const total = status.done + status.inProgress + status.notStarted;
  const segs = [
    { key: "Done", n: status.done, color: DONE },
    { key: "In progress", n: status.inProgress, color: "#f59e0b" },
    { key: "Not started", n: status.notStarted, color: "#52525b" },
  ].filter((s) => s.n > 0);

  return (
    <div>
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full">
        {total === 0 ? (
          <div className="h-full w-full bg-zinc-800" />
        ) : (
          segs.map((s) => (
            <div
              key={s.key}
              title={`${s.key}: ${s.n}`}
              style={{ width: `${(s.n / total) * 100}%`, backgroundColor: s.color }}
              className="h-full first:rounded-l-full last:rounded-r-full"
            />
          ))
        )}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs">
        {[
          { key: "Done", n: status.done, color: DONE },
          { key: "In progress", n: status.inProgress, color: "#f59e0b" },
          { key: "Not started", n: status.notStarted, color: "#52525b" },
        ].map((s) => (
          <li key={s.key} className="flex items-center gap-1.5 text-zinc-400">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.key} <span className="font-medium text-zinc-200">{s.n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A ranked list of workstreams or people, each with a magnitude bar. */
export function BreakdownList({ items }: { items: Breakdown[] }) {
  return (
    <ul className="space-y-3">
      {items.map((b) => (
        <li key={b.key}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-zinc-200" title={b.key}>
              {b.key}
            </span>
            <span className="shrink-0 text-xs text-zinc-500">
              {b.doneIssues}/{b.totalIssues} ·{" "}
              {b.remainingMinutes ? `${formatMinutes(b.remainingMinutes)} left` : "done"}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500"
              style={{ width: `${b.percent}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
