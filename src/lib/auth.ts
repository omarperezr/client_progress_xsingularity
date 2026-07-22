import "server-only";
import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

const SESSION_COOKIE = "session";
const SESSION_DAYS = 7;

export function sessionSecret() {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET env var is not set");
  return new TextEncoder().encode(value);
}

export function hashPassword(password: string) {
  return bcrypt.hashSync(password, 12);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compareSync(password, hash);
}

export async function createSession(companyId: number) {
  const token = await new SignJWT({ companyId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(sessionSecret());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 3600,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * Returns the logged-in company or null. Memoized per request with React
 * `cache()` so pages and their server actions that check the session more than
 * once share a single JWT verification and company lookup.
 */
export const getSessionCompany = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    const companyId = payload.companyId as number;
    return await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, username: true },
    });
  } catch {
    return null;
  }
});
