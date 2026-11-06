import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "demo";
const SHOP_SLUG = "demo-shop";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function main() {
  const passwordHash = hashSync(DEMO_PASSWORD, 10);

  const agent = await ensureUser({
    email: "agent@demo.shop",
    passwordHash,
    displayName: "Demo Agent",
  });

  const existingShop = await prisma.tenant.findUnique({ where: { slug: SHOP_SLUG } });
  const shop = existingShop
    ? await prisma.tenant.update({
        where: { id: existingShop.id },
        data: { defaultAgentId: agent.id },
      })
    : await prisma.tenant.create({
        data: {
          id: randomUUID(),
          name: "Demo Shop",
          slug: SHOP_SLUG,
          defaultAgentId: agent.id,
          defaultThbMmkRate: 92,
          defaultServiceFeePercent: 7,
          paymentInstructions: "KBZ Pay / Wave — send screenshot in chat after transfer.",
        },
      });

  const cargo1 = await ensureUser({
    email: "cargo1@demo.shop",
    passwordHash,
    displayName: "Ko Warehouse",
  });
  const cargo2 = await ensureUser({
    email: "cargo2@demo.shop",
    passwordHash,
    displayName: "Ma Warehouse",
  });

  const customerUser = await ensureUser({
    email: "customer@demo.shop",
    passwordHash,
    displayName: "Demo Customer",
  });

  for (const row of [
    { userId: agent.id, role: "agent" as const },
    { userId: cargo1.id, role: "cargo" as const },
    { userId: cargo2.id, role: "cargo" as const },
    { userId: customerUser.id, role: "customer" as const },
  ]) {
    await prisma.tenantMembership.upsert({
      where: { tenantId_userId_role: { tenantId: shop.id, userId: row.userId, role: row.role } },
      update: {},
      create: { tenantId: shop.id, userId: row.userId, role: row.role },
    });
  }

  console.log("Seed OK — password for all users:", DEMO_PASSWORD);
  console.log("Agent:", agent.email, agent.id);
  console.log("Cargo:", cargo1.email, cargo1.id);
  console.log("Cargo:", cargo2.email, cargo2.id);
  console.log("Customer:", customerUser.email, customerUser.id);
}

/** Create the user with crypto.randomUUID(). A legacy non-UUID id is replaced; an existing UUID is kept. */
async function ensureUser(opts: { email: string; passwordHash: string; displayName: string }) {
  const existing = await prisma.user.findUnique({ where: { email: opts.email } });
  if (!existing) {
    return prisma.user.create({ data: { id: randomUUID(), ...opts } });
  }
  if (UUID_RE.test(existing.id)) return existing;

  const fromId = existing.id;
  const id = randomUUID();
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: fromId },
      data: { email: `${fromId}@replaced.local` },
    });
    await tx.user.create({ data: { id, ...opts } });
    await tx.tenantMembership.updateMany({ where: { userId: fromId }, data: { userId: id } });
    await tx.order.updateMany({ where: { assignedAgentId: fromId }, data: { assignedAgentId: id } });
    await tx.order.updateMany({ where: { assignedCargoUserId: fromId }, data: { assignedCargoUserId: id } });
    await tx.order.updateMany({ where: { handedToCargoByUserId: fromId }, data: { handedToCargoByUserId: id } });
    await tx.order.updateMany({ where: { createdByUserId: fromId }, data: { createdByUserId: id } });
    await tx.tenant.updateMany({ where: { defaultAgentId: fromId }, data: { defaultAgentId: id } });
    await tx.notification.updateMany({ where: { userId: fromId }, data: { userId: id } });
    await tx.actionsLog.updateMany({ where: { updatedBy: fromId }, data: { updatedBy: id } });
    await tx.user.delete({ where: { id: fromId } });
  });

  return prisma.user.findUniqueOrThrow({ where: { id } });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
