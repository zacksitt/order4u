import type { CargoStaffUser } from "@/lib/types";
import { requireAgent, requireCargo } from "@/server/auth/session";
import { prisma } from "@/server/db";

export type CargoShopChoice = { id: string; name: string };

export async function listCargoStaff(): Promise<CargoStaffUser[]> {
  const session = await requireAgent();
  const memberships = await prisma.tenantMembership.findMany({
    where: { tenantId: session.tenantId, role: "cargo" },
    include: { user: true },
    orderBy: { user: { displayName: "asc" } },
  });

  return memberships.map((m) => ({
    id: m.user.id,
    displayName: m.user.displayName,
    email: m.user.email,
  }));
}

export async function listCargoShops(): Promise<CargoShopChoice[]> {
  const session = await requireCargo();
  const memberships = await prisma.tenantMembership.findMany({
    where: { userId: session.userId, role: "cargo" },
    include: { tenant: { select: { id: true, name: true } } },
    orderBy: { tenant: { name: "asc" } },
  });

  return memberships.map((m) => ({
    id: m.tenant.id,
    name: m.tenant.name,
  }));
}
