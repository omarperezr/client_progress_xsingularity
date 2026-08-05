import { getAdmin } from "@/lib/admin-auth";
import { stopImpersonating } from "@/app/admin/actions";
import { PendingButton } from "./PendingButton";

/**
 * Renders only when an admin session is present on a client page — i.e. an
 * xSingularity member is "viewing as" a client. Gives them a way back to admin.
 * Hazard tape is physically yellow + black in any light, so its colors are fixed.
 */
export async function ImpersonationBanner({ companyName }: { companyName: string }) {
  const admin = await getAdmin();
  if (!admin) return null;

  return (
    <div className="hazard-band border-b-2 border-[#131110]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-1.5">
        <span className="label-caps text-xs text-[#131110]">
          Inspection mode — viewing as {companyName}
          <span className="ml-1 font-mono font-normal normal-case tracking-normal">({admin})</span>
        </span>
        <form action={stopImpersonating}>
          <PendingButton className="btn border-[#131110] bg-[#131110] px-2.5 py-1 text-[11px] text-hold-bg hover:bg-[#131110]">
            Return to dispatch
          </PendingButton>
        </form>
      </div>
    </div>
  );
}
