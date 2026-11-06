"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { firstIssueMessage, itemCategorySchema, zUuid } from "@/lib/input-rules";
import { requireCargo } from "@/server/auth/session";
import { prisma } from "@/server/db";

export type ActionResult = { ok: true } | { ok: false; error: string };

const categorySchema = itemCategorySchema;

export async function createItemCategory(raw: z.infer<typeof categorySchema>): Promise<ActionResult> {
  const session = await requireCargo();
  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error, "Enter a name and a cargo price greater than 0.") };

  const existing = await prisma.itemCategory.findFirst({
    where: { tenantId: session.tenantId, name: parsed.data.name },
  });
  if (existing) return { ok: false, error: "A category with that name already exists." };

  await prisma.itemCategory.create({
    data: {
      tenantId: session.tenantId,
      name: parsed.data.name,
      cargoPriceThb: parsed.data.cargoPriceThb,
    },
  });

  revalidatePath("/cargo/categories");
  revalidatePath("/cargo/orders", "layout");
  return { ok: true };
}

export async function updateItemCategory(input: {
  id: string;
  name: string;
  cargoPriceThb: number;
}): Promise<ActionResult> {
  const id = zUuid.safeParse(input.id);
  if (!id.success) return { ok: false, error: "Category not found." };
  const session = await requireCargo();
  const parsed = categorySchema.safeParse({ name: input.name, cargoPriceThb: input.cargoPriceThb });
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error, "Enter a name and a cargo price greater than 0.") };

  const row = await prisma.itemCategory.findFirst({
    where: { id: id.data, tenantId: session.tenantId },
  });
  if (!row) return { ok: false, error: "Category not found." };

  const clash = await prisma.itemCategory.findFirst({
    where: { tenantId: session.tenantId, name: parsed.data.name, NOT: { id: id.data } },
  });
  if (clash) return { ok: false, error: "A category with that name already exists." };

  await prisma.itemCategory.update({
    where: { id: id.data },
    data: { name: parsed.data.name, cargoPriceThb: parsed.data.cargoPriceThb },
  });

  revalidatePath("/cargo/categories");
  revalidatePath("/cargo/orders", "layout");
  return { ok: true };
}

export async function deleteItemCategory(id: string): Promise<ActionResult> {
  const parsedId = zUuid.safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Category not found." };
  const session = await requireCargo();
  const row = await prisma.itemCategory.findFirst({
    where: { id: parsedId.data, tenantId: session.tenantId },
    include: { _count: { select: { orderItems: true } } },
  });
  if (!row) return { ok: false, error: "Category not found." };
  if (row._count.orderItems > 0) {
    return { ok: false, error: "This category is used on an order line. Clear those lines first." };
  }

  await prisma.itemCategory.delete({ where: { id: parsedId.data } });
  revalidatePath("/cargo/categories");
  return { ok: true };
}
