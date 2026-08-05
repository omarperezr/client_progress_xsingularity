import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin-auth";
import { PendingButton } from "@/components/PendingButton";
import { Barcode } from "@/components/Manifest";
import { adminLogin } from "../actions";

export const metadata = { title: "Admin sign in · Client Progress" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getAdmin()) redirect("/admin");
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3 text-ink">
          <Barcode className="h-6" />
          <div>
            <h1 className="label-caps text-2xl leading-none">Dispatch</h1>
            <p className="mt-1 font-mono text-[11px] text-ink-soft">
              xSingularity · Client Progress operations
            </p>
          </div>
        </div>
        <form action={adminLogin} className="sheet space-y-4 border-2 p-6 shadow-sheet-raised">
          <p className="label-caps border-b border-rule pb-2 text-xs text-ink">
            Carrier personnel only
          </p>
          {error && (
            <p className="border border-exception bg-exception/5 px-3 py-2 text-sm font-medium text-exception">
              {error}
            </p>
          )}
          <label className="block">
            <span className="label-caps mb-1 block text-[11px] text-ink-soft">Username</span>
            <input name="username" autoComplete="username" required className="input" />
          </label>
          <label className="block">
            <span className="label-caps mb-1 block text-[11px] text-ink-soft">Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="input"
            />
          </label>
          <PendingButton pendingText="Signing in…" className="btn btn-primary w-full px-4 py-2.5 text-xs">
            Sign in
          </PendingButton>
        </form>
        <p className="mt-6 text-center text-sm text-ink-soft">
          Are you a client?{" "}
          <Link
            href="/login"
            className="font-medium text-transit underline decoration-rule-mid transition-colors hover:decoration-transit"
          >
            Client sign-in
          </Link>
        </p>
      </div>
    </main>
  );
}
