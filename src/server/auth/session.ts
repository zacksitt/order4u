import { redirect } from "next/navigation";

import { auth } from "@/auth";
import type { MembershipRole } from "@prisma/client";

export type StaffSession = {
  userId: string;
  tenantId: string;
  role: MembershipRole;
  email: string;
  name: string;
};

async function requireSession(): Promise<StaffSession> {
  const session = await auth();
  if (!session?.user?.id || !session.tenantId || !session.role) {
    redirect("/login");
  }
  return {
    userId: session.user.id,
    tenantId: session.tenantId,
    role: session.role,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
  };
}

export async function requireAgent(): Promise<StaffSession> {
  const s = await requireSession();
  if (s.role !== "agent") redirect("/login?error=agent");
  return s;
}

export async function requireCargo(): Promise<StaffSession> {
  const s = await requireSession();
  if (s.role !== "cargo") redirect("/login?error=cargo");
  return s;
}

export async function getOptionalSession(): Promise<StaffSession | null> {
  const session = await auth();
  if (!session?.user?.id || !session.tenantId || !session.role) return null;
  return {
    userId: session.user.id,
    tenantId: session.tenantId,
    role: session.role,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
  };
}
