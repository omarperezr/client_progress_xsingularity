import Link from "next/link";
import { logout } from "@/app/actions";

export function Header({ companyName }: { companyName: string }) {
  return (
    <header className="border-b border-zinc-800 bg-zinc-900/60">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white">
          Client Progress <span className="text-zinc-500">· xSingularity</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-400">{companyName}</span>
          <form action={logout}>
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
