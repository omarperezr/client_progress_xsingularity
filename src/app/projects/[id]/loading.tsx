import { HeaderSkeleton, Shimmer } from "@/components/Skeleton";

function CardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`sheet p-5 ${className}`}>
      <Shimmer className="mb-4 h-4 w-32" />
      <Shimmer className="h-24 w-full" />
    </div>
  );
}

export default function ProjectLoading() {
  return (
    <div className="min-h-screen w-full">
      <HeaderSkeleton maxWidth="max-w-6xl" />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <Shimmer className="h-4 w-24" />
        <div className="mt-3 mb-6 border-b-2 border-ink pb-3">
          <Shimmer className="h-7 w-56" />
        </div>

        {/* Headline: forecast + progress */}
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <CardSkeleton />
          <CardSkeleton />
        </div>

        {/* Key numbers */}
        <div className="mt-6 grid grid-cols-2 gap-px border border-ink bg-ink sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Shimmer key={i} className="h-14 border-0" />
          ))}
        </div>

        {/* Charts */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>

        {/* Task list */}
        <div className="mt-6">
          <Shimmer className="mb-3 h-4 w-28" />
          <div className="sheet divide-y divide-rule">
            {Array.from({ length: 5 }).map((_, i) => (
              <Shimmer key={i} className="h-12 w-full border-0" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
