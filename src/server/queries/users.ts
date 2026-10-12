import type { CargoStaffUser } from "@/lib/types";
import { requireAgent } from "@/server/auth/session";
import { prisma } from "@/server/db";

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
