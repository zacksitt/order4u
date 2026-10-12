import { NextResponse } from "next/server";

import { getMessengerEnv } from "@/lib/messenger/env";
import { graphGetPageWebhookSubscription } from "@/server/services/messenger/graph-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const env = getMessengerEnv();
  const secret = request.headers.get("x-messenger-setup-secret");
  if (!env.setupSecret || secret !== env.setupSecret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const pageId = env.pageId;
  let pageSubscription: unknown = null;
  let pageSubscriptionError: string | undefined;

  if (pageId && env.pageAccessToken) {
    const sub = await graphGetPageWebhookSubscription(pageId, env.pageAccessToken);
    if (sub.ok) pageSubscription = sub.data;
    else pageSubscriptionError = sub.error;
  }

  return NextResponse.json({
    ok: true,
    webhookCallbackUrl: `${env.appUrl}/api/webhooks/messenger`,
    configured: {
      appUrl: Boolean(env.appUrl),
      verifyToken: Boolean(env.verifyToken),
      appSecret: Boolean(env.appSecret),
      pageAccessToken: Boolean(env.pageAccessToken),
      pageId: Boolean(pageId),
    },
    pageId: pageId ?? null,
    pageSubscription,
    pageSubscriptionError,
    hints: [
      "Meta Developer → Messenger → Webhooks: callback URL must match webhookCallbackUrl exactly.",
      "After verify, subscribe your Page to messages + messaging_postbacks (setup-menu does this via Graph API).",
      "When you message the Page, ngrok http://127.0.0.1:4040 should show POST /api/webhooks/messenger from Facebook.",
      "If POST returns 403, META_APP_SECRET must match App settings → Basic → App secret.",
    ],
  });
}
