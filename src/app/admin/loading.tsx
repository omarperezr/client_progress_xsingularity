import { Shimmer } from "@/components/Skeleton";

function AdminHeaderSkeleton() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-900/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <span className="text-lg font-semibold tracking-tight text-white">
          Admin <span className="text-zinc-500">· xSingularity</span>
        </span>
        <Shimmer className="h-8 w-28" />
      </div>
    </header>
  );
}

export default function AdminLoading() {
  return (
    <div className="min-h-screen w-full bg-zinc-950">
      <AdminHeaderSkeleton />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <Shimmer className="mb-4 h-6 w-32" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Shimmer key={i} className="h-16" />
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Shimmer className="h-48" />
          <Shimmer className="h-48" />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            <Shimmer className="h-40" />
            <Shimmer className="h-40" />
          </div>
          <Shimmer className="h-64" />
        </div>
      </main>
    </div>
  );
}
