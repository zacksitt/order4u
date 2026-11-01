"use server";

import { revalidatePath } from "next/cache";

import { getOptionalSession } from "@/server/auth/session";
import { prisma } from "@/server/db";

function revalidateShells() {
  revalidatePath("/agent", "layout");
  revalidatePath("/cargo", "layout");
}

export async function markNotificationRead(id: string): Promise<void> {
  const session = await getOptionalSession();
  if (!session) return;

  await prisma.notification.updateMany({
    where: { id, userId: session.userId, tenantId: session.tenantId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidateShells();
}

export async function markAllNotificationsRead(): Promise<void> {
  const session = await getOptionalSession();
  if (!session) return;

  await prisma.notification.updateMany({
    where: { userId: session.userId, tenantId: session.tenantId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidateShells();
}
