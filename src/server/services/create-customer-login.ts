import { hashSync } from "bcryptjs";
import { Prisma } from "@prisma/client";

import { generatePortalAccessToken } from "@/lib/order-code";
import { customerPiiWrite } from "@/server/crypto/customer-pii";
import { prisma } from "@/server/db";

export type CreateCustomerResult = { ok: true; customerId: string } | { ok: false; error: string };

export async function createAgentCustomerRecord(input: {
  tenantId: string;
  name: string;
  phone?: string;
  email?: string;
  password?: string;
}): Promise<CreateCustomerResult> {
  const email = input.email?.trim().toLowerCase() ?? "";
  const password = input.password ?? "";
  if (password && !email) return { ok: false, error: "Enter an email to set a password." };
  if (email && password) {
    return createCustomerWithLogin({
      tenantId: input.tenantId,
      name: input.name,
      phone: input.phone,
      email,
      password,
    });
  }

  const customer = await prisma.customer.create({
    data: {
      tenantId: input.tenantId,
      name: input.name,
      portalAccessToken: generatePortalAccessToken(),
      ...customerPiiWrite({ phone: input.phone || "—", email }),
    },
  });
  return { ok: true, customerId: customer.id };
}

async function createCustomerWithLogin(input: {
  tenantId: string;
  name: string;
  phone?: string;
  email: string;
  password: string;
}): Promise<CreateCustomerResult> {
  const email = input.email.trim().toLowerCase();
  const taken = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (taken) return { ok: false, error: "That email is already in use." };

  try {
    const customer = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash: hashSync(input.password, 10),
          displayName: input.name,
          mustChangePassword: true,
        },
      });
      await tx.tenantMembership.create({
        data: { tenantId: input.tenantId, userId: user.id, role: "customer" },
      });
      return tx.customer.create({
        data: {
          tenantId: input.tenantId,
          userId: user.id,
          name: input.name,
          portalAccessToken: generatePortalAccessToken(),
          ...customerPiiWrite({ phone: input.phone || "—", email }),
        },
      });
    });
    return { ok: true, customerId: customer.id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "That email is already in use." };
    }
    return { ok: false, error: "Could not create the customer. Try again." };
  }
}

export async function syncCustomerLogin(input: {
  tenantId: string;
  customerId: string;
  name: string;
  email: string;
  password: string;
}): Promise<CreateCustomerResult> {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, tenantId: input.tenantId },
    include: { user: true },
  });
  if (!customer) return { ok: false, error: "Customer not found." };

  try {
    if (customer.user) {
      if (email && email !== customer.user.email) {
        const taken = await prisma.user.findUnique({ where: { email }, select: { id: true } });
        if (taken && taken.id !== customer.user.id) {
          return { ok: false, error: "That email is already in use." };
        }
      }
      await prisma.user.update({
        where: { id: customer.user.id },
        data: {
          displayName: input.name,
          ...(email ? { email } : {}),
          ...(password
            ? { passwordHash: hashSync(password, 10), mustChangePassword: true }
            : {}),
        },
      });
    } else if (email && password) {
      const taken = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (taken) return { ok: false, error: "That email is already in use." };
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash: hashSync(password, 10),
          displayName: input.name,
          mustChangePassword: true,
        },
      });
      await prisma.tenantMembership.create({
        data: { tenantId: input.tenantId, userId: user.id, role: "customer" },
      });
      await prisma.customer.update({
        where: { id: customer.id },
        data: { userId: user.id },
      });
    }

    return { ok: true, customerId: customer.id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "That email is already in use." };
    }
    return { ok: false, error: "Could not update login." };
  }
}
