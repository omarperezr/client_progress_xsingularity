import type { NormalizedIssue } from "./providers/types";

// An open issue is "stale" if the team has not touched it in this many days.
const STALE_DAYS = 14;
// Weeks of recent history used to estimate throughput for the forecast.
const FORECAST_WINDOW_WEEKS = 6;
const MS_PER_DAY = 24 * 3600 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

export interface WeekBucket {
  weekStart: string;
  label: string;
  closedIssues: number;
  closedMinutes: number;
}

export interface BurnupPoint {
  weekStart: string;
  label: string;
  percentByIssues: number;
  percentByTime: number | null;
}

export interface Forecast {
  status: "complete" | "no-data" | "stalled" | "projected";
  etaDate: string | null;
  weeksRemaining: number | null;
  perWeekIssues: number;
  perWeekMinutes: number;
  basis: "time" | "issues";
}

export interface Breakdown {
  key: string;
  totalIssues: number;
  doneIssues: number;
  totalMinutes: number;
  remainingMinutes: number;
  percent: number;
}

export interface Analytics {
  status: { notStarted: number; inProgress: number; done: number };
  weeks: WeekBucket[];
  burnup: BurnupPoint[];
  forecast: Forecast;
  workstreams: Breakdown[];
  assignees: Breakdown[];
  recentlyClosed: NormalizedIssue[];
  stale: NormalizedIssue[];
  /** Mean spent/estimate on closed issues that logged both (GitLab); null otherwise. */
  estimateAccuracy: number | null;
}

/** Monday 00:00 UTC of the week containing `d`. */
function startOfWeekUTC(d: Date): number {
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const weekday = (day.getUTCDay() + 6) % 7; // 0 = Monday
  return day.getTime() - weekday * MS_PER_DAY;
}

function weekLabel(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function doneMinutes(i: NormalizedIssue) {
  return i.estimateMinutes ?? 0;
}

function remainingMinutes(i: NormalizedIssue) {
  if (i.state === "closed") return 0;
  return Math.max((i.estimateMinutes ?? 0) - (i.spentMinutes ?? 0), 0);
}

function breakdown(key: string, issues: NormalizedIssue[]): Breakdown {
  const done = issues.filter((i) => i.state === "closed").length;
  return {
    key,
    totalIssues: issues.length,
    doneIssues: done,
    totalMinutes: issues.reduce((a, i) => a + (i.estimateMinutes ?? 0), 0),
    remainingMinutes: issues.reduce((a, i) => a + remainingMinutes(i), 0),
    percent: issues.length ? Math.round((done / issues.length) * 100) : 0,
  };
}

export function computeAnalytics(issues: NormalizedIssue[], now = new Date()): Analytics {
  const totalMinutes = issues.reduce((a, i) => a + (i.estimateMinutes ?? 0), 0);
  const closed = issues.filter((i) => i.state === "closed");

  // --- status split (open+assigned is "in progress"; open+unassigned is "not started")
  const status = { notStarted: 0, inProgress: 0, done: 0 };
  for (const i of issues) {
    if (i.state === "closed") status.done++;
    else if (i.assignees.length) status.inProgress++;
    else status.notStarted++;
  }

  // --- weekly throughput, from the earliest close (or 8 weeks ago) up to now
  const closeTimes = closed
    .map((i) => (i.closedAt ? Date.parse(i.closedAt) : NaN))
    .filter((t) => !Number.isNaN(t));
  const nowWeek = startOfWeekUTC(now);
  const firstWeek =
    closeTimes.length > 0
      ? Math.min(startOfWeekUTC(new Date(Math.min(...closeTimes))), nowWeek - 7 * MS_PER_WEEK)
      : nowWeek - 7 * MS_PER_WEEK;

  const buckets = new Map<number, WeekBucket>();
  for (let w = firstWeek; w <= nowWeek; w += MS_PER_WEEK) {
    buckets.set(w, { weekStart: new Date(w).toISOString(), label: weekLabel(w), closedIssues: 0, closedMinutes: 0 });
  }
  for (const i of closed) {
    if (!i.closedAt) continue;
    const w = startOfWeekUTC(new Date(i.closedAt));
    const bucket = buckets.get(w);
    if (bucket) {
      bucket.closedIssues++;
      bucket.closedMinutes += doneMinutes(i);
    }
  }
  const weeks = [...buckets.values()];

  // --- burnup: cumulative % complete at the end of each week
  let cumIssues = 0;
  let cumMinutes = 0;
  const totalIssues = issues.length;
  const burnup: BurnupPoint[] = weeks.map((wk) => {
    cumIssues += wk.closedIssues;
    cumMinutes += wk.closedMinutes;
    return {
      weekStart: wk.weekStart,
      label: wk.label,
      percentByIssues: totalIssues ? Math.round((cumIssues / totalIssues) * 100) : 0,
      percentByTime: totalMinutes ? Math.round((cumMinutes / totalMinutes) * 100) : null,
    };
  });

  // --- forecast from throughput over the recent window
  const forecast = computeForecast(issues, weeks, totalMinutes, now);

  // --- breakdowns by workstream (label) and assignee
  const labelGroups = new Map<string, NormalizedIssue[]>();
  for (const i of issues) {
    for (const label of i.labels) {
      if (/^estimate\b/i.test(label)) continue; // estimate:* labels are metadata, not workstreams
      (labelGroups.get(label) ?? labelGroups.set(label, []).get(label)!).push(i);
    }
  }
  const workstreams = [...labelGroups.entries()]
    .map(([key, group]) => breakdown(key, group))
    .sort((a, b) => b.totalIssues - a.totalIssues || b.remainingMinutes - a.remainingMinutes);

  const assigneeGroups = new Map<string, NormalizedIssue[]>();
  for (const i of issues) {
    for (const a of i.assignees) {
      (assigneeGroups.get(a) ?? assigneeGroups.set(a, []).get(a)!).push(i);
    }
  }
  const assignees = [...assigneeGroups.entries()]
    .map(([key, group]) => breakdown(key, group))
    .sort((a, b) => b.remainingMinutes - a.remainingMinutes || b.totalIssues - a.totalIssues);

  // --- recent activity + at-risk
  const recentlyClosed = [...closed]
    .filter((i) => i.closedAt)
    .sort((a, b) => Date.parse(b.closedAt!) - Date.parse(a.closedAt!))
    .slice(0, 5);
  const staleCutoff = now.getTime() - STALE_DAYS * MS_PER_DAY;
  const stale = issues
    .filter((i) => i.state === "open" && Date.parse(i.updatedAt) < staleCutoff)
    .sort((a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt));

  // --- estimate accuracy (GitLab time tracking only)
  const withBoth = closed.filter((i) => (i.estimateMinutes ?? 0) > 0 && (i.spentMinutes ?? 0) > 0);
  const estimateAccuracy = withBoth.length
    ? withBoth.reduce((a, i) => a + i.spentMinutes! / i.estimateMinutes!, 0) / withBoth.length
    : null;

  return {
    status,
    weeks,
    burnup,
    forecast,
    workstreams,
    assignees,
    recentlyClosed,
    stale,
    estimateAccuracy,
  };
}

function computeForecast(
  issues: NormalizedIssue[],
  weeks: WeekBucket[],
  totalMinutes: number,
  now: Date,
): Forecast {
  const openIssues = issues.filter((i) => i.state === "open");
  const remaining = openIssues.reduce((a, i) => a + remainingMinutes(i), 0);
  const basis: "time" | "issues" = totalMinutes > 0 ? "time" : "issues";

  if (openIssues.length === 0 && issues.length > 0) {
    return { status: "complete", etaDate: null, weeksRemaining: null, perWeekIssues: 0, perWeekMinutes: 0, basis };
  }

  const window = weeks.slice(-FORECAST_WINDOW_WEEKS);
  const span = Math.max(window.length, 1);
  const perWeekIssues = window.reduce((a, w) => a + w.closedIssues, 0) / span;
  const perWeekMinutes = window.reduce((a, w) => a + w.closedMinutes, 0) / span;

  const rate = basis === "time" ? perWeekMinutes : perWeekIssues;
  const left = basis === "time" ? remaining : openIssues.length;

  if (rate <= 0) {
    // Either nothing has ever closed, or work stopped inside the window.
    const everClosed = issues.some((i) => i.state === "closed");
    return {
      status: everClosed ? "stalled" : "no-data",
      etaDate: null,
      weeksRemaining: null,
      perWeekIssues,
      perWeekMinutes,
      basis,
    };
  }

  const weeksRemaining = left / rate;
  const eta = new Date(now.getTime() + Math.ceil(weeksRemaining * 7) * MS_PER_DAY);
  return {
    status: "projected",
    etaDate: eta.toISOString(),
    weeksRemaining,
    perWeekIssues,
    perWeekMinutes,
    basis,
  };
}
