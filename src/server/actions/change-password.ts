"use server";

import { compareSync, hashSync } from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";

import { unstable_update } from "@/auth";
import { changePasswordSchema, firstIssueMessage } from "@/lib/input-rules";
import { requireCustomer } from "@/server/auth/session";
import { prisma } from "@/server/db";

export type ChangePasswordResult = { ok: false; error: string };

export async function changeOwnPassword(
  raw: z.infer<typeof changePasswordSchema>,
): Promise<ChangePasswordResult | void> {
  const session = await requireCustomer();
  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error, "Check the form.") };

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user?.isActive) return { ok: false, error: "Account not found." };
  if (!compareSync(parsed.data.currentPassword, user.passwordHash)) {
    return { ok: false, error: "Current password is wrong." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hashSync(parsed.data.newPassword, 10),
      mustChangePassword: false,
    },
  });

  await unstable_update({ mustChangePassword: false });
  redirect("/customer/orders");
}
