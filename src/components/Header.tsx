import Link from "next/link";
import { logout } from "@/app/actions";
import { PendingButton } from "./PendingButton";
import { Barcode } from "./Manifest";

export function Header({ companyName }: { companyName: string }) {
  return (
    <header className="border-b-2 border-ink bg-sheet">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex min-w-0 items-center gap-3 text-ink">
          <Barcode className="h-5 shrink-0" />
          <span className="label-caps truncate text-lg leading-none">
            Client Progress
            <span className="ml-2 hidden font-mono text-[10px] font-normal normal-case tracking-normal text-ink-soft sm:inline">
              xSingularity · carrier of record
            </span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-3">
          <span
            className="hidden max-w-48 truncate font-mono text-xs text-ink-soft sm:block"
            title={`Signed in as ${companyName}`}
          >
            {companyName}
          </span>
          <form action={logout}>
            <PendingButton className="btn px-3 py-1.5 text-xs">Sign out</PendingButton>
          </form>
        </div>
      </div>
    </header>
  );
}
