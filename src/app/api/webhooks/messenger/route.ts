import { NextResponse } from "next/server";

import { getMessengerEnv } from "@/lib/messenger/env";
import {
  handleMessengerWebhookBody,
  type WebhookEntry,
} from "@/server/services/messenger/handle-webhook";
import { verifyMessengerSignature } from "@/server/services/messenger/verify-signature";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const env = getMessengerEnv();
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && env.verifyToken && token === env.verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: Request) {
  const env = getMessengerEnv();
  const rawBody = await request.text();
  const userAgent = request.headers.get("user-agent") ?? "";
  console.info("[messenger] POST /api/webhooks/messenger", { bytes: rawBody.length, userAgent });

  if (env.appSecret && !env.skipSignatureVerify) {
    const sig = request.headers.get("x-hub-signature-256");
    if (!verifyMessengerSignature(rawBody, sig, env.appSecret)) {
      console.warn("[messenger] Invalid X-Hub-Signature-256 — check META_APP_SECRET matches Meta App settings → Basic");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }
  } else if (!env.appSecret && !env.skipSignatureVerify) {
    console.warn("[messenger] META_APP_SECRET missing; set MESSENGER_SKIP_SIGNATURE_VERIFY=true for local only");
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    await handleMessengerWebhookBody(body as { object?: string; entry?: WebhookEntry[] });
    console.info("[messenger] webhook handled OK");
  } catch (err) {
    console.error("[messenger] webhook handler error", err);
  }

  return NextResponse.json({ ok: true });
}
