import Link from "next/link";
import { adminLogout } from "@/app/admin/actions";
import { PendingButton } from "./PendingButton";
import { Barcode } from "./Manifest";

export function AdminHeader({ admin }: { admin: string }) {
  return (
    <header className="border-b-2 border-cargo bg-sheet">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/admin" className="flex min-w-0 items-center gap-3 text-ink">
          <Barcode className="h-5 shrink-0" />
          <span className="label-caps truncate text-lg leading-none">
            Dispatch
            <span className="ml-2 hidden font-mono text-[10px] font-normal normal-case tracking-normal text-ink-soft sm:inline">
              xSingularity · operations
            </span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/"
            className="label-caps hidden text-xs text-ink-soft transition-colors hover:text-ink sm:block"
          >
            Client view
          </Link>
          <span className="border border-cargo px-2 py-1 font-mono text-xs text-ink" title="Signed in admin">
            {admin}
          </span>
          <form action={adminLogout}>
            <PendingButton className="btn px-3 py-1.5 text-xs">Sign out</PendingButton>
          </form>
        </div>
      </div>
    </header>
  );
}
