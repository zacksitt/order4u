import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/auth";
import { prisma } from "@/server/db";
import type { MembershipRole } from "@prisma/client";

export type StaffSession = {
  userId: string;
  tenantId: string;
  role: MembershipRole;
  email: string;
  name: string;
};

const membershipExists = cache(async (tenantId: string, userId: string, role: MembershipRole) => {
  const row = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId_role: { tenantId, userId, role } },
    select: { tenantId: true },
  });
  return row !== null;
});

async function requireSession(): Promise<StaffSession> {
  const session = await auth();
  if (!session?.user?.id || !session.tenantId || !session.role) {
    redirect("/login");
  }
  if (!(await membershipExists(session.tenantId, session.user.id, session.role))) {
    redirect("/session-expired");
  }
  return {
    userId: session.user.id,
    tenantId: session.tenantId,
    role: session.role,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
  };
}

export async function requireSignedIn(): Promise<StaffSession> {
  return requireSession();
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

export async function requireCustomer(): Promise<StaffSession> {
  const s = await requireSession();
  if (s.role !== "customer") redirect("/login?error=customer");
  return s;
}

export async function requireOrderCreator(): Promise<StaffSession> {
  const s = await requireSession();
  if (s.role !== "agent" && s.role !== "customer") redirect("/login");
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
