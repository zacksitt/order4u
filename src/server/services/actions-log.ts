import type { ActionLogEntityType, Prisma, PrismaClient } from "@prisma/client";

export type DbClient = PrismaClient | Prisma.TransactionClient;

export function formatActionLine(input: {
  at?: Date;
  userId: string;
  action: string;
  detail?: string;
}): string {
  const iso = (input.at ?? new Date()).toISOString();
  const detail = input.detail?.trim();
  return detail
    ? `${iso} ${input.userId} ${input.action} ${detail}`
    : `${iso} ${input.userId} ${input.action}`;
}

export async function appendAction(
  db: DbClient,
  input: {
    tenantId: string;
    entityType: ActionLogEntityType;
    entityId: string;
    userId: string;
    action: string;
    detail?: string;
  },
): Promise<void> {
  const line = formatActionLine(input);
  await db.actionsLog.upsert({
    where: {
      tenantId_entityType_entityId: {
        tenantId: input.tenantId,
        entityType: input.entityType,
        entityId: input.entityId,
      },
    },
    create: {
      tenantId: input.tenantId,
      entityType: input.entityType,
      entityId: input.entityId,
      actions: [line],
      updatedBy: input.userId,
    },
    update: {
      actions: { push: line },
      updatedBy: input.userId,
    },
  });
}
