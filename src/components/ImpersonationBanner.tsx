import { getAdmin } from "@/lib/admin-auth";
import { stopImpersonating } from "@/app/admin/actions";

/**
 * Renders only when an admin session is present on a client page — i.e. an
 * xSingularity member is "viewing as" a client. Gives them a way back to admin.
 */
export async function ImpersonationBanner({ companyName }: { companyName: string }) {
  const admin = await getAdmin();
  if (!admin) return null;

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
        <span className="text-amber-300">
          Viewing as <span className="font-medium">{companyName}</span> — signed in as xSingularity
          admin <span className="text-amber-400/70">({admin})</span>
        </span>
        <form action={stopImpersonating}>
          <button
            type="submit"
            className="rounded-md border border-amber-500/40 px-3 py-1 text-xs font-medium text-amber-200 transition hover:bg-amber-500/20"
          >
            ← Return to admin
          </button>
        </form>
      </div>
    </div>
  );
}
