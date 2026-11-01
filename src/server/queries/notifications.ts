import type { NotificationType, Prisma } from "@prisma/client";

import { prisma } from "@/server/db";
import { getOptionalSession } from "@/server/auth/session";

export type StaffNotification = {
  id: string;
  type: NotificationType;
  orderCode: string;
  href: string;
  read: boolean;
  createdAt: string;
};

export type NotificationFeed = {
  items: StaffNotification[];
  unreadCount: number;
};

const EMPTY_FEED: NotificationFeed = { items: [], unreadCount: 0 };

function readPayload(payload: Prisma.JsonValue): { orderCode: string; href: string } {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const orderCode = payload.orderCode;
    const href = payload.href;
    if (typeof orderCode === "string" && typeof href === "string") {
      return { orderCode, href };
    }
  }
  return { orderCode: "", href: "" };
}

export async function listNotificationFeed(): Promise<NotificationFeed> {
  const session = await getOptionalSession();
  if (!session) return EMPTY_FEED;

  const where = { userId: session.userId, tenantId: session.tenantId };
  const [rows, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notification.count({ where: { ...where, readAt: null } }),
  ]);

  return {
    unreadCount,
    items: rows.map((row) => {
      const payload = readPayload(row.payload);
      return {
        id: row.id,
        type: row.type,
        orderCode: payload.orderCode,
        href: payload.href,
        read: row.readAt != null,
        createdAt: row.createdAt.toISOString(),
      };
    }),
  };
}
