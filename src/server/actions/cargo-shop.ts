"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { unstable_update } from "@/auth";
import { zUuid } from "@/lib/input-rules";
import { requireCargo } from "@/server/auth/session";
import { prisma } from "@/server/db";

export async function switchCargoShop(formData: FormData) {
  const session = await requireCargo();
  const parsed = zUuid.safeParse(formData.get("tenantId"));
  if (!parsed.success) return;
  if (parsed.data === session.tenantId) return;

  const membership = await prisma.tenantMembership.findUnique({
    where: {
      tenantId_userId_role: {
        tenantId: parsed.data,
        userId: session.userId,
        role: "cargo",
      },
    },
    select: { tenantId: true },
  });
  if (!membership) return;

  await unstable_update({ tenantId: parsed.data });
  revalidatePath("/cargo", "layout");
  revalidatePath("/cargo/dashboard");
  revalidatePath("/cargo/orders");
  revalidatePath("/cargo/categories");
  redirect("/cargo/dashboard");
}
