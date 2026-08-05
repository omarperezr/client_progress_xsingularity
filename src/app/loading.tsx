import { HeaderSkeleton, ProjectCardSkeleton, Shimmer } from "@/components/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen w-full">
      <HeaderSkeleton />
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="mb-6 border-b-2 border-ink pb-2">
          <Shimmer className="h-7 w-48" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      </main>
    </div>
  );
}
