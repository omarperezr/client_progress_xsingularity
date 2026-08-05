export function ProgressBar({ percent, label }: { percent: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div>
      {label && (
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <span className="label-caps text-[10px] text-ink-soft">{label}</span>
          <span className="font-mono text-xs font-semibold text-ink">{clamped}%</span>
        </div>
      )}
      <div className="relative h-3 w-full border border-ink bg-sheet-dim">
        <div className="h-full bg-ink transition-all" style={{ width: `${clamped}%` }} />
        {/* Graduation ticks every 10%, printed over the meter. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to right, transparent 0, transparent calc(10% - 1px), var(--color-paper) calc(10% - 1px), var(--color-paper) 10%)",
          }}
        />
      </div>
    </div>
  );
}
