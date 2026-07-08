"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, destroySession, verifyPassword } from "@/lib/auth";

export async function login(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) redirect("/login?error=missing");

  const company = await prisma.company.findUnique({ where: { username } });
  if (!company || !verifyPassword(password, company.passwordHash)) {
    redirect("/login?error=invalid");
  }

  await createSession(company.id);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
