import { NextResponse } from "next/server";
import { z } from "zod";

import { getMessengerEnv } from "@/lib/messenger/env";
import { auth } from "@/auth";
import { getTenantBySlug } from "@/server/queries/tenant-messenger";
import {
  buildPersistentMenuProfile,
  graphSetMessengerProfile,
  graphSubscribePageWebhooks,
} from "@/server/services/messenger/graph-api";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  slug: z.string().min(1).optional(),
  messengerPageId: z.string().min(1).optional(),
});

function authorizeSetup(request: Request): boolean {
  const env = getMessengerEnv();
  const headerSecret = request.headers.get("x-messenger-setup-secret");
  if (env.setupSecret && headerSecret === env.setupSecret) return true;
  return false;
}

export async function POST(request: Request) {
  const env = getMessengerEnv();
  if (!env.pageAccessToken) {
    return NextResponse.json(
      { ok: false, error: "MESSENGER_PAGE_ACCESS_TOKEN is not configured." },
      { status: 503 },
    );
  }

  const session = await auth();
  const allowed = authorizeSetup(request) || session?.role === "agent" || session?.role === "admin";
  if (!allowed) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let slug = "demo-shop";
  let messengerPageId: string | undefined;
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (parsed.success) {
      if (parsed.data.slug) slug = parsed.data.slug;
      messengerPageId = parsed.data.messengerPageId;
    }
  } catch {
    /* empty body ok */
  }

  if (!messengerPageId && env.pageId) messengerPageId = env.pageId;

  let tenant = await getTenantBySlug(slug);
  if (!tenant) {
    return NextResponse.json({ ok: false, error: `Unknown shop slug: ${slug}` }, { status: 404 });
  }

  if (messengerPageId && tenant.messengerPageId !== messengerPageId) {
    tenant = await prisma.tenant.update({
      where: { id: tenant.id },
      data: { messengerPageId },
    });
  }

  const placeOrderUrl = `${env.appUrl}/order/${tenant.slug}`;
  const profile = buildPersistentMenuProfile({
    shopName: tenant.name,
  });

  const result = await graphSetMessengerProfile(env.pageAccessToken, profile);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }

  const pageId = messengerPageId ?? tenant.messengerPageId ?? env.pageId;
  let webhookSubscribe: { ok: true } | { ok: false; error: string } | null = null;
  if (pageId) {
    webhookSubscribe = await graphSubscribePageWebhooks(pageId, env.pageAccessToken);
  }

  return NextResponse.json({
    ok: true,
    shop: tenant.name,
    slug: tenant.slug,
    placeOrderUrl,
    webhookCallbackUrl: `${env.appUrl}/api/webhooks/messenger`,
    pageWebhookSubscribe: webhookSubscribe?.ok
      ? "subscribed"
      : webhookSubscribe
        ? { error: webhookSubscribe.error }
        : "skipped (no page id)",
    note: "Persistent menu set. Page must be subscribed for Meta to POST messages to your webhook.",
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    usage: {
      method: "POST",
      auth: "Agent session cookie OR header x-messenger-setup-secret matching MESSENGER_SETUP_SECRET",
      body: { slug: "demo-shop (optional)" },
    },
  });
}
