"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn } from "@/auth";
import { firstIssueMessage, loginSchema } from "@/lib/input-rules";
import { prisma } from "@/server/db";
import { compareSync } from "bcryptjs";

export type LoginResult = { ok: false; error: string };

export async function loginWithCredentials(
  email: string,
  password: string,
): Promise<LoginResult | void> {
  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error, "Invalid email or password.") };
  const { email: normalized, password: secret } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user?.isActive || !compareSync(secret, user.passwordHash)) {
    return { ok: false, error: "Invalid email or password." };
  }

  const membership = await prisma.tenantMembership.findFirst({
    where: { userId: user.id, role: { in: ["agent", "cargo", "customer"] } },
    orderBy: { role: "asc" },
  });
  if (!membership) {
    return { ok: false, error: "No access for this account." };
  }

  const redirectTo =
    membership.role === "cargo"
      ? "/cargo/orders"
      : membership.role === "customer"
        ? user.mustChangePassword
          ? "/customer/change-password"
          : "/customer/orders"
        : "/agent/dashboard";

  try {
    await signIn("credentials", {
      email: normalized,
      password: secret,
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
