import { HeaderSkeleton, Shimmer } from "@/components/Skeleton";

function CardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-900 p-5 ${className}`}>
      <Shimmer className="mb-4 h-4 w-32" />
      <Shimmer className="h-24 w-full" />
    </div>
  );
}

export default function ProjectLoading() {
  return (
    <div className="min-h-screen w-full bg-zinc-950">
      <HeaderSkeleton maxWidth="max-w-6xl" />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <Shimmer className="h-4 w-24" />
        <Shimmer className="mt-3 mb-6 h-6 w-56" />

        {/* Headline: forecast + progress */}
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <CardSkeleton />
          <CardSkeleton />
        </div>

        {/* Key numbers */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Shimmer key={i} className="h-16" />
          ))}
        </div>

        {/* Charts */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>

        {/* Task list */}
        <div className="mt-6 space-y-2">
          <Shimmer className="mb-3 h-4 w-20" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Shimmer key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </main>
    </div>
  );
}
