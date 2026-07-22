import "server-only";
import { cache } from "react";
import { timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionSecret } from "./auth";

const ADMIN_COOKIE = "admin_session";
const ADMIN_DAYS = 1;

function constantTimeEquals(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Checks credentials against ADMIN_USERNAME / ADMIN_PASSWORD from the environment. */
export function verifyAdminCredentials(username: string, password: string) {
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPassword) {
    throw new Error("ADMIN_USERNAME / ADMIN_PASSWORD env vars are not set");
  }
  // Both comparisons always run so a wrong username costs the same as a wrong password.
  const userOk = constantTimeEquals(username, expectedUser);
  const passwordOk = constantTimeEquals(password, expectedPassword);
  return userOk && passwordOk;
}

export async function createAdminSession(username: string) {
  const token = await new SignJWT({ admin: true, username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_DAYS}d`)
    .sign(sessionSecret());
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_DAYS * 24 * 3600,
  });
}

export async function destroyAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

/** Returns the logged-in admin username, or null. Memoized per request. */
export const getAdmin = cache(async () => {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    // The client session is signed with the same secret, so the admin claim must be explicit.
    if (payload.admin !== true) return null;
    // Reject sessions minted for a username that is no longer the configured admin.
    if (payload.username !== process.env.ADMIN_USERNAME) return null;
    return String(payload.username);
  } catch {
    return null;
  }
});

/** Guard for admin pages and server actions — redirects to the admin login when absent. */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
