"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn } from "@/auth";
import { prisma } from "@/server/db";
import { compare } from "bcryptjs";

export type LoginResult = { ok: false; error: string };

export async function loginWithCredentials(
  email: string,
  password: string,
): Promise<LoginResult | void> {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user?.isActive || !compare(password, user.passwordHash)) {
    return { ok: false, error: "Invalid email or password." };
  }

  const membership = await prisma.tenantMembership.findFirst({
    where: { userId: user.id, role: { in: ["agent", "cargo"] } },
    orderBy: { role: "asc" },
  });
  if (!membership) {
    return { ok: false, error: "No agent or cargo access for this account." };
  }

  const redirectTo = membership.role === "cargo" ? "/cargo/queue" : "/agent/dashboard";

  try {
    await signIn("credentials", {
      email: normalized,
      password,
      redirect: false,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return { ok: false, error: "Sign in failed." };
    }
    throw e;
  }

  redirect(redirectTo);
}
