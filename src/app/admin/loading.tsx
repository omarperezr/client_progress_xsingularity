import { Shimmer } from "@/components/Skeleton";
import { Barcode } from "@/components/Manifest";

function AdminHeaderSkeleton() {
  return (
    <header className="border-b-2 border-cargo bg-sheet">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <span className="flex items-center gap-3 text-ink">
          <Barcode className="h-5" />
          <span className="label-caps text-lg leading-none">Dispatch</span>
        </span>
        <Shimmer className="h-8 w-28" />
      </div>
    </header>
  );
}

export default function AdminLoading() {
  return (
    <div className="min-h-screen w-full">
      <AdminHeaderSkeleton />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="mb-4 border-b-2 border-ink pb-2">
          <Shimmer className="h-7 w-52" />
        </div>
        <div className="grid grid-cols-2 gap-px border border-ink bg-ink sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Shimmer key={i} className={`h-16 border-0 ${i === 4 ? "max-sm:col-span-2" : ""}`} />
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
