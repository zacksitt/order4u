"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { agentCreateCustomerSchema, customerProfileSchema, firstIssueMessage } from "@/lib/input-rules";
import { requireAgent } from "@/server/auth/session";
import { customerPiiRead, customerPiiWrite } from "@/server/crypto/customer-pii";
import { prisma } from "@/server/db";
import { searchAgentCustomers } from "@/server/queries/customers";
import { createAgentCustomerRecord, syncCustomerLogin } from "@/server/services/create-customer-login";

export type ActionResult = { ok: true; customerId?: string } | { ok: false; error: string };

export async function searchCustomersAction(query: string) {
  return searchAgentCustomers(query);
}

export async function createAgentCustomer(
  raw: z.infer<typeof agentCreateCustomerSchema>,
): Promise<ActionResult> {
  const session = await requireAgent();
  const parsed = agentCreateCustomerSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error, "Invalid customer.") };

  const created = await createAgentCustomerRecord({
    tenantId: session.tenantId,
    name: parsed.data.name,
    phone: parsed.data.phone,
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (!created.ok) return created;

  revalidatePath("/agent/customers");
  revalidatePath("/agent/orders/new");
  return { ok: true, customerId: created.customerId };
}

export async function updateAgentCustomer(raw: z.infer<typeof customerProfileSchema>): Promise<ActionResult> {
  const session = await requireAgent();
  const parsed = customerProfileSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error, "Invalid customer.") };

  const existing = await prisma.customer.findFirst({
    where: { id: parsed.data.id, tenantId: session.tenantId },
  });
  if (!existing) return { ok: false, error: "Customer not found." };

  const previous = customerPiiRead(existing);
  const login = await syncCustomerLogin({
    tenantId: session.tenantId,
    customerId: existing.id,
    name: parsed.data.name,
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (!login.ok) return login;

  await prisma.customer.update({
    where: { id: existing.id },
    data: {
      name: parsed.data.name,
      ...customerPiiWrite({
        phone: parsed.data.phone || "—",
        email: parsed.data.email || previous.email,
        facebookProfileUrl: parsed.data.facebookProfileUrl,
        notes: parsed.data.notes,
        messengerPsid: previous.messengerPsid,
      }),
    },
  });

  revalidatePath("/agent/customers");
  revalidatePath("/agent/orders");
  return { ok: true };
}
