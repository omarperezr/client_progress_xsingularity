/** Shared loading-skeleton primitives. Purely presentational, no client JS. */

export function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-zinc-800/70 ${className}`} />;
}

/** A static stand-in for the app header shown while a page's data loads. */
export function HeaderSkeleton({ maxWidth = "max-w-5xl" }: { maxWidth?: string }) {
  return (
    <header className="border-b border-zinc-800 bg-zinc-900/60">
      <div className={`mx-auto flex ${maxWidth} items-center justify-between px-4 py-4`}>
        <span className="text-lg font-semibold tracking-tight text-white">
          Client Progress <span className="text-zinc-500">· xSingularity</span>
        </span>
        <Shimmer className="h-8 w-28" />
      </div>
    </header>
  );
}

/** A card matching the dashboard project card layout. */
export function ProjectCardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="mb-3 flex items-center justify-between">
        <Shimmer className="h-5 w-32" />
        <Shimmer className="h-5 w-16 rounded-full" />
      </div>
      <Shimmer className="h-2.5 w-full rounded-full" />
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Shimmer className="h-12" />
        <Shimmer className="h-12" />
        <Shimmer className="h-12" />
      </div>
      <Shimmer className="mt-3 h-3 w-40" />
    </div>
  );
}
