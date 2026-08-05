import type { Forecast } from "@/lib/analytics";

/** Consignment number: the manifest identity of a project, derived from its id. */
export function consignmentNo(id: number): string {
  return `XS-${String(id).padStart(4, "0")}`;
}

const STAMP_TONES = {
  delivered: "text-delivered",
  transit: "text-transit",
  pending: "text-ink-soft",
  hold: "text-hold",
  exception: "text-exception",
} as const;

export type StampTone = keyof typeof STAMP_TONES;

/** Rubber status stamp. `landing` plays the one authored stamp-land moment. */
export function Stamp({
  tone,
  children,
  landing = false,
  className = "",
}: {
  tone: StampTone;
  children: React.ReactNode;
  landing?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`stamp text-[11px] ${STAMP_TONES[tone]} ${landing ? "stamp-landing" : ""} ${className}`}
    >
      {children}
    </span>
  );
}

export function forecastStamp(f: Forecast): { tone: StampTone; label: string } {
  switch (f.status) {
    case "complete":
      return { tone: "delivered", label: "Delivered" };
    case "projected":
      return { tone: "transit", label: "In transit" };
    case "stalled":
      return { tone: "hold", label: "On hold" };
    default:
      return { tone: "pending", label: "Pending" };
  }
}

/**
 * The journey line: departed → current position → destination.
 * Percent is progress; labels sit under each end.
 */
export function RouteLine({
  percent,
  startLabel,
  endLabel,
  animate = false,
}: {
  percent: number;
  startLabel: string;
  endLabel: string;
  animate?: boolean;
}) {
  const p = Math.max(0, Math.min(100, percent));
  return (
    <div>
      <div className="relative flex h-4 items-center" aria-hidden="true">
        {/* Departure post */}
        <span className="z-10 size-2 shrink-0 rounded-full bg-ink" />
        {/* Traveled leg */}
        <div className="relative h-0.5 grow bg-rule-mid">
          <div
            className={`absolute inset-y-0 left-0 bg-ink ${animate ? "route-fill" : ""}`}
            style={{ width: `${p}%` }}
          />
          {/* Checkpoints along the route: passed ones are inked, ahead ones hollow */}
          {[25, 50, 75].map((c) => (
            <span
              key={c}
              className={`absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                c <= p ? "bg-ink" : "border border-rule-mid bg-paper"
              }`}
              style={{ left: `${c}%` }}
            />
          ))}
          {/* Current position marker */}
          <span
            className="absolute top-1/2 z-10 size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-ink bg-cargo"
            style={{ left: `${p}%` }}
          />
        </div>
        {/* Destination post */}
        <span className="z-10 size-2 shrink-0 rounded-full border-2 border-ink bg-sheet" />
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-2 font-mono text-[10px] text-ink-soft">
        <span className="truncate">{startLabel}</span>
        <span className="shrink-0 font-semibold text-ink">{p}%</span>
        <span className="truncate text-right">{endLabel}</span>
      </div>
    </div>
  );
}

/**
 * A run of waybill field boxes with collapsed 1px ink borders.
 * Wrap FieldBox children; pass the column count for the breakpoint you need.
 */
export function FieldGrid({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <dl className={`grid gap-px border border-ink bg-ink ${className}`}>{children}</dl>
  );
}

/** Brand mark: a short barcode strip, drawn once, used on plates and sign-in. */
export function Barcode({ className = "h-5" }: { className?: string }) {
  const bars = [2, 1, 3, 1, 1, 2, 4, 1, 2, 1, 1, 3, 1, 2, 1, 4, 1, 1, 2, 1];
  let x = 0;
  return (
    <svg viewBox="0 0 46 20" className={className} aria-hidden="true" fill="currentColor">
      {bars.map((w, i) => {
        const rect = i % 2 === 0 ? <rect key={i} x={x} y={0} width={w} height={20} /> : null;
        x += w;
        return rect;
      })}
    </svg>
  );
}

export function FieldBox({
  label,
  value,
  hint,
  className = "",
}: {
  label: string;
  value: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={`bg-sheet px-3 py-2 ${className}`}>
      <dt className="label-caps text-[10px] text-ink-soft">{label}</dt>
      <dd className="mt-0.5 font-mono text-sm font-semibold text-ink">
        {value}
        {hint && <span className="ml-1 font-sans text-xs font-normal text-ink-soft">{hint}</span>}
      </dd>
    </div>
  );
}
