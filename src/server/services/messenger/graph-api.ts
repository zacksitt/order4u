const GRAPH_VERSION = "v21.0";

const PAGE_WEBHOOK_FIELDS = "messages,messaging_postbacks,messaging_optins";

export async function graphSubscribePageWebhooks(
  pageId: string,
  pageAccessToken: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(pageId)}/subscribed_apps?subscribed_fields=${encodeURIComponent(PAGE_WEBHOOK_FIELDS)}&access_token=${encodeURIComponent(pageAccessToken)}`;
  const res = await fetch(url, { method: "POST" });
  const data = (await res.json()) as { success?: boolean; error?: { message: string } };
  if (!res.ok) {
    return { ok: false, error: data.error?.message ?? `Graph API ${res.status}` };
  }
  return { ok: true };
}

export async function graphGetPageWebhookSubscription(
  pageId: string,
  pageAccessToken: string,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(pageId)}/subscribed_apps?access_token=${encodeURIComponent(pageAccessToken)}`;
  const res = await fetch(url);
  const data = (await res.json()) as { data?: unknown; error?: { message: string } };
  if (!res.ok) {
    return { ok: false, error: data.error?.message ?? `Graph API ${res.status}` };
  }
  return { ok: true, data: data.data ?? data };
}

type SendMessagePayload = {
  recipient: { id: string };
  message: Record<string, unknown>;
  messaging_type?: "RESPONSE" | "UPDATE" | "MESSAGE_TAG";
};

export async function graphSendMessage(
  pageAccessToken: string,
  payload: SendMessagePayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, messaging_type: payload.messaging_type ?? "RESPONSE" }),
  });
  const data = (await res.json()) as { error?: { message: string } };
  if (!res.ok) {
    return { ok: false, error: data.error?.message ?? `Graph API ${res.status}` };
  }
  return { ok: true };
}

export type MessengerProfilePayload = {
  get_started?: { payload: string };
  greeting?: { locale: string; text: string }[];
  persistent_menu?: {
    locale: string;
    composer_input_disabled: boolean;
    call_to_actions: (
      | { type: "web_url"; title: string; url: string; webview_height_ratio?: "compact" | "tall" | "full" }
      | { type: "postback"; title: string; payload: string }
    )[];
  }[];
};

export async function graphSetMessengerProfile(
  pageAccessToken: string,
  profile: MessengerProfilePayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/me/messenger_profile?access_token=${encodeURIComponent(pageAccessToken)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  const data = (await res.json()) as { result?: string; error?: { message: string } };
  if (!res.ok) {
    return { ok: false, error: data.error?.message ?? `Graph API ${res.status}` };
  }
  return { ok: true };
}

export function buildWelcomeButtonMessage(
  shopName: string,
  placeOrderUrl: string,
  myOrdersUrl: string,
): Record<string, unknown> {
  return {
    attachment: {
      type: "template",
      payload: {
        template_type: "button",
        text: `${shopName}: tap below to place an order or view your orders.`,
        buttons: [
          { type: "web_url", url: placeOrderUrl, title: "Place order", webview_height_ratio: "full" },
          { type: "web_url", url: myOrdersUrl, title: "My orders", webview_height_ratio: "full" },
        ],
      },
    },
  };
}

export function buildPersistentMenuProfile(input: {
  shopName: string;
}): MessengerProfilePayload {
  return {
    get_started: { payload: "GET_STARTED" },
    greeting: [{ locale: "default", text: `Welcome to ${input.shopName}. Tap Place order — we’ll send your personal form link.` }],
    persistent_menu: [
      {
        locale: "default",
        composer_input_disabled: false,
        call_to_actions: [
          {
            type: "postback",
            title: "Place order",
            payload: "PLACE_ORDER",
          },
          {
            type: "postback",
            title: "My orders",
            payload: "MY_ORDERS",
          },
        ],
      },
    ],
  };
}
