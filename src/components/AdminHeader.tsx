import Link from "next/link";
import { adminLogout } from "@/app/admin/actions";

export function AdminHeader({ admin }: { admin: string }) {
  return (
    <header className="border-b border-zinc-800 bg-zinc-900/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/admin" className="text-lg font-semibold tracking-tight text-white">
          Admin <span className="text-zinc-500">· xSingularity</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-zinc-400 transition hover:text-zinc-200">
            Client view
          </Link>
          <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-300">
            {admin}
          </span>
          <form action={adminLogout}>
            <button
              type="submit"
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-zinc-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
