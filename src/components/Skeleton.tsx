import { Barcode } from "./Manifest";

/** Shared loading-skeleton primitives. Purely presentational, no client JS. */

export function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`shimmer ${className}`} />;
}

/** A static stand-in for the app header shown while a page's data loads. */
export function HeaderSkeleton({ maxWidth = "max-w-5xl" }: { maxWidth?: string }) {
  return (
    <header className="border-b-2 border-ink bg-sheet">
      <div className={`mx-auto flex ${maxWidth} items-center justify-between gap-4 px-4 py-3`}>
        <span className="flex items-center gap-3 text-ink">
          <Barcode className="h-5" />
          <span className="label-caps text-lg leading-none">Client Progress</span>
        </span>
        <Shimmer className="h-8 w-28" />
      </div>
    </header>
  );
}

/** A card matching the dashboard project card layout. */
export function ProjectCardSkeleton() {
  return (
    <div className="sheet p-5">
      <div className="mb-4 flex items-center justify-between">
        <Shimmer className="h-5 w-32" />
        <Shimmer className="h-5 w-16" />
      </div>
      <Shimmer className="h-4 w-full" />
      <div className="mt-4 grid grid-cols-3 gap-px">
        <Shimmer className="h-12" />
        <Shimmer className="h-12" />
        <Shimmer className="h-12" />
      </div>
      <Shimmer className="mt-3 h-4 w-40" />
    </div>
  );
}
