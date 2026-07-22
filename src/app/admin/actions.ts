"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, destroySession, hashPassword } from "@/lib/auth";
import {
  createAdminSession,
  destroyAdminSession,
  requireAdmin,
  verifyAdminCredentials,
} from "@/lib/admin-auth";
import { isProvider } from "@/lib/providers";

/** Sends the admin back to `path` with a message shown at the top of the page. */
function back(path: string, error: string): never {
  redirect(`${path}?error=${encodeURIComponent(error)}`);
}

function done(path: string, message: string): never {
  revalidatePath(path);
  redirect(`${path}?ok=${encodeURIComponent(message)}`);
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function adminLogin(formData: FormData) {
  const username = text(formData, "username");
  const password = String(formData.get("password") ?? "");
  if (!username || !password) back("/admin/login", "Enter a username and password.");
  if (!verifyAdminCredentials(username, password)) {
    back("/admin/login", "Invalid admin credentials.");
  }
  await createAdminSession(username);
  redirect("/admin");
}

export async function adminLogout() {
  await destroyAdminSession();
  redirect("/admin/login");
}

/**
 * Logs the admin into a client's own view ("view as"). Sets the client session
 * cookie alongside the admin one, so the dashboard shows exactly what the client
 * sees and the admin can return with `stopImpersonating`.
 */
export async function impersonateCompany(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) back("/admin", "That client no longer exists.");
  await createSession(company.id);
  redirect("/");
}

export async function stopImpersonating() {
  // Still gated on the admin session; only clears the client session.
  await requireAdmin();
  await destroySession();
  redirect("/admin");
}

export async function createCompany(formData: FormData) {
  await requireAdmin();
  const name = text(formData, "name");
  const username = text(formData, "username");
  const password = String(formData.get("password") ?? "");
  if (!name || !username || !password) back("/admin", "Name, username and password are required.");

  let company;
  try {
    company = await prisma.company.create({
      data: { name, username, passwordHash: hashPassword(password) },
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      back("/admin", `Username "${username}" is already taken.`);
    }
    throw err;
  }
  revalidatePath("/admin");
  done(`/admin/companies/${company.id}`, `Company "${company.name}" created.`);
}

export async function updateCompany(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const path = `/admin/companies/${id}`;
  const name = text(formData, "name");
  const username = text(formData, "username");
  const password = String(formData.get("password") ?? "");
  if (!id || !name || !username) back(path, "Name and username are required.");

  try {
    await prisma.company.update({
      where: { id },
      data: {
        name,
        username,
        // An empty password field means "keep the current password".
        ...(password ? { passwordHash: hashPassword(password) } : {}),
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      back(path, `Username "${username}" is already taken.`);
    }
    throw err;
  }
  revalidatePath("/admin");
  done(path, password ? "Company updated and password reset." : "Company updated.");
}

export async function deleteCompany(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id) back("/admin", "Missing company id.");
  // Projects are removed with the company (onDelete: Cascade).
  const company = await prisma.company.delete({ where: { id } });
  done("/admin", `Company "${company.name}" and its projects were deleted.`);
}

export async function createProject(formData: FormData) {
  await requireAdmin();
  const companyId = Number(formData.get("companyId"));
  const path = `/admin/companies/${companyId}`;
  const name = text(formData, "name");
  const provider = text(formData, "provider");
  const repo = text(formData, "repo");
  const token = String(formData.get("token") ?? "").trim();
  const baseUrl = text(formData, "baseUrl");

  if (!companyId) back("/admin", "Missing company id.");
  if (!name || !repo || !token) back(path, "Name, repo and token are required.");
  if (!isProvider(provider)) back(path, `Provider must be "github" or "gitlab".`);

  const project = await prisma.project.create({
    data: { companyId, name, provider, repo, token, baseUrl: baseUrl || null },
  });
  revalidatePath("/admin");
  done(path, `Project "${project.name}" created.`);
}

export async function updateProject(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const path = `/admin/projects/${id}`;
  const name = text(formData, "name");
  const provider = text(formData, "provider");
  const repo = text(formData, "repo");
  const token = String(formData.get("token") ?? "").trim();
  const baseUrl = text(formData, "baseUrl");
  const companyId = Number(formData.get("companyId"));

  if (!id) back("/admin", "Missing project id.");
  if (!name || !repo || !companyId) back(path, "Name, repo and company are required.");
  if (!isProvider(provider)) back(path, `Provider must be "github" or "gitlab".`);

  await prisma.project.update({
    where: { id },
    data: {
      companyId,
      name,
      provider,
      repo,
      baseUrl: baseUrl || null,
      // An empty token field means "keep the current token".
      ...(token ? { token } : {}),
    },
  });
  revalidatePath("/admin");
  done(path, token ? "Project updated and token replaced." : "Project updated.");
}

export async function deleteProject(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id) back("/admin", "Missing project id.");
  const project = await prisma.project.delete({ where: { id } });
  revalidatePath("/admin");
  done(`/admin/companies/${project.companyId}`, `Project "${project.name}" was deleted.`);
}
