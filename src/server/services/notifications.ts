import type { NotificationType } from "@prisma/client";

import type { DbClient } from "@/server/services/actions-log";

export async function notifyUser(
  db: DbClient,
  input: {
    tenantId: string;
    userId: string;
    type: NotificationType;
    orderId: string;
    orderCode: string;
    href: string;
  },
): Promise<void> {
  await db.notification.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      type: input.type,
      orderId: input.orderId,
      payload: { orderCode: input.orderCode, href: input.href },
    },
  });
}
