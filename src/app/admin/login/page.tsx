import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin-auth";
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
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Admin</h1>
          <p className="mt-1 text-sm text-zinc-400">xSingularity · Client Progress</p>
        </div>
        <form
          action={adminLogin}
          className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl"
        >
          {error && (
            <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
          )}
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-300">Username</span>
            <input
              name="username"
              autoComplete="username"
              required
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-300">Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            Sign in
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-zinc-500">
          Are you a client?{" "}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300">
            Client sign-in
          </Link>
        </p>
      </div>
    </main>
  );
}
