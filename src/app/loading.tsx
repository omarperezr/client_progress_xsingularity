import { HeaderSkeleton, ProjectCardSkeleton, Shimmer } from "@/components/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen w-full bg-zinc-950">
      <HeaderSkeleton />
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <Shimmer className="mb-6 h-6 w-40" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      </main>
    </div>
  );
}
