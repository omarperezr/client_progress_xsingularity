import type { BurnupPoint, Breakdown, Forecast, WeekBucket } from "@/lib/analytics";
import { formatMinutes } from "@/lib/estimate";

// Night-dispatch palette, kept in step with the tokens in globals.css.
const INK = "#ece8dd";
const DONE = "#55b183"; // delivered green
const TRANSIT = "#6f9fd8"; // in transit
const CARGO = "#f0561a"; // international orange (projection / forecast marks)
const GRID = "#34312a"; // subtle rules
const AXIS = "#56514a"; // mid rules
const MUTED = "#b3ac9c"; // secondary ink

/**
 * Burnup: cumulative % complete per week, plus a dashed projection to 100% at the
 * forecast ETA. One series, so no legend — the title names it.
 */
export function Burnup({ burnup, forecast }: { burnup: BurnupPoint[]; forecast: Forecast }) {
  const W = 720;
  const H = 224;
  const L = 46;
  const R = 706;
  const T = 14;
  const B = 186;
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

  // Thin x labels by rendered spacing, not point count: a projection-heavy
  // domain squeezes the data points left, so labels need ~64 viewBox units each.
  const pxPerIdx = (R - L) / domainMax;
  const every = Math.max(1, Math.ceil(64 / pxPerIdx));
  const labelIdx = new Set(pts.map((_, i) => i).filter((i) => i % every === 0));
  if (!labelIdx.has(lastIdx) && (lastIdx % every) * pxPerIdx >= 64) labelIdx.add(lastIdx);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full font-mono"
      role="img"
      aria-label="Progress over time"
    >
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}>
          <line x1={L} x2={R} y1={y(g)} y2={y(g)} stroke={GRID} strokeWidth={1} />
          <text x={L - 7} y={y(g) + 4} textAnchor="end" fontSize={12} fill={MUTED}>
            {g}%
          </text>
        </g>
      ))}

      <path d={area} fill={DONE} fillOpacity={0.1} />
      <path d={line} fill="none" stroke={INK} strokeWidth={2} strokeLinejoin="round" />

      {projEnd && (
        <>
          <line
            x1={last.px}
            y1={last.py}
            x2={projEnd.px}
            y2={projEnd.py}
            stroke={CARGO}
            strokeWidth={2}
            strokeDasharray="5 4"
          />
          <path
            d={`M${projEnd.px},${projEnd.py - 4} l4,4 l-4,4 l-4,-4 Z`}
            fill={CARGO}
          />
          <text x={projEnd.px - 10} y={projEnd.py + 4} textAnchor="end" fontSize={12} fill={CARGO}>
            ETA
          </text>
        </>
      )}

      {pts.map((p, i) => (
        <circle key={i} cx={p.px} cy={p.py} r={i === lastIdx ? 3.5 : 2} fill={INK}>
          <title>{`${p.label}: ${p.pct}% complete`}</title>
        </circle>
      ))}

      {pts.map((p, i) =>
        labelIdx.has(i) ? (
          <text key={`l${i}`} x={p.px} y={B + 18} textAnchor="middle" fontSize={12} fill={MUTED}>
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
  const H = 184;
  const L = 24;
  const R = 712;
  const T = 10;
  const B = 152;
  const max = Math.max(1, ...data.map((w) => w.closedIssues));
  const slot = (R - L) / data.length;
  const barW = Math.min(34, slot - 6);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full font-mono"
      role="img"
      aria-label="Tasks completed per week"
    >
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
              fill={TRANSIT}
            >
              <title>
                {`Week of ${w.label}: ${w.closedIssues} task${w.closedIssues === 1 ? "" : "s"}${
                  w.closedMinutes ? ` · ${formatMinutes(w.closedMinutes)}` : ""
                }`}
              </title>
            </rect>
            {w.closedIssues > 0 && (
              <text x={cx} y={B - h - 5} textAnchor="middle" fontSize={12} fill={MUTED}>
                {w.closedIssues}
              </text>
            )}
            <text x={cx} y={B + 17} textAnchor="middle" fontSize={12} fill={MUTED}>
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
    { key: "In progress", n: status.inProgress, color: TRANSIT },
    { key: "Not started", n: status.notStarted, color: "#7d776a" },
  ];

  return (
    <div>
      <div className="flex h-3 w-full border border-ink bg-sheet-dim">
        {total > 0 &&
          segs
            .filter((s) => s.n > 0)
            .map((s) => (
              <div
                key={s.key}
                title={`${s.key}: ${s.n}`}
                style={{ width: `${(s.n / total) * 100}%`, backgroundColor: s.color }}
                className="h-full"
              />
            ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
        {segs.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5 text-xs text-ink-soft">
            <span className="size-2" style={{ backgroundColor: s.color }} />
            {s.key}{" "}
            <span className="font-mono font-semibold text-ink">{s.n}</span>
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
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium text-ink" title={b.key}>
              {b.key}
            </span>
            <span className="shrink-0 font-mono text-xs text-ink-soft">
              {b.doneIssues}/{b.totalIssues} ·{" "}
              {b.remainingMinutes ? `${formatMinutes(b.remainingMinutes)} left` : "done"}
            </span>
          </div>
          <div className="h-2 w-full border border-rule-mid bg-sheet-dim">
            <div className="h-full bg-ink" style={{ width: `${b.percent}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
