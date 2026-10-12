import { getMessengerEnv } from "@/lib/messenger/env";
import { resolveTenantForPageId } from "@/server/queries/tenant-messenger";
import {
  buildWelcomeButtonMessage,
  graphSendMessage,
} from "@/server/services/messenger/graph-api";
import { upsertMessengerCustomer } from "@/server/services/messenger/upsert-messenger-customer";

export type MessagingEvent = {
  sender?: { id: string };
  recipient?: { id: string };
  timestamp?: number;
  message?: { mid?: string; text?: string };
  postback?: { payload?: string; title?: string };
};

export type WebhookEntry = {
  id: string;
  messaging?: MessagingEvent[];
};

export async function handleMessengerWebhookBody(body: {
  object?: string;
  entry?: WebhookEntry[];
}): Promise<void> {
  if (body.object !== "page") return;

  const env = getMessengerEnv();
  if (!env.pageAccessToken) {
    console.warn("[messenger] MESSENGER_PAGE_ACCESS_TOKEN not set; skipping Send API");
    return;
  }

  for (const entry of body.entry ?? []) {
    const pageId = entry.id;
    for (const event of entry.messaging ?? []) {
      await handleMessagingEvent(pageId, event, env.pageAccessToken, env.appUrl);
    }
  }
}

async function handleMessagingEvent(
  pageId: string,
  event: MessagingEvent,
  pageAccessToken: string,
  appUrl: string,
) {
  const psid = event.sender?.id;
  if (!psid) return;

  const tenant = await resolveTenantForPageId(pageId);
  if (!tenant) {
    console.warn("[messenger] No tenant for page", pageId);
    return;
  }

  const customer = await upsertMessengerCustomer({
    tenantId: tenant.id,
    psid,
  });

  const portal = customer.portalAccessToken;
  if (!portal) {
    console.error("[messenger] Customer missing portalAccessToken", customer.id);
    return;
  }
  const placeOrderUrl = `${appUrl}/order/${tenant.slug}?c=${encodeURIComponent(portal)}`;
  const myOrdersUrl = `${appUrl}/my?c=${encodeURIComponent(portal)}`;

  const text = event.message?.text?.trim().toLowerCase() ?? "";
  const payload =
    event.postback?.payload ??
    (text.includes("my order") ? "MY_ORDERS" : null) ??
    (text.includes("order") || /^(hi|hello|start|menu|help)\b/.test(text) ? "GET_STARTED" : null);

  if (!payload) return;

  const message =
    payload === "MY_ORDERS"
      ? {
          attachment: {
            type: "template",
            payload: {
              template_type: "button",
              text: "Open your order list (private link):",
              buttons: [{ type: "web_url", url: myOrdersUrl, title: "My orders", webview_height_ratio: "full" }],
            },
          },
        }
      : payload === "PLACE_ORDER"
        ? {
            attachment: {
              type: "template",
              payload: {
                template_type: "button",
                text: `${tenant.name}: tap below to fill in your order (linked to this chat).`,
                buttons: [
                  {
                    type: "web_url",
                    url: placeOrderUrl,
                    title: "Open order form",
                    webview_height_ratio: "full",
                  },
                ],
              },
            },
          }
        : buildWelcomeButtonMessage(tenant.name, placeOrderUrl, myOrdersUrl);

  const result = await graphSendMessage(pageAccessToken, {
    recipient: { id: psid },
    message,
  });
  if (!result.ok) {
    console.error("[messenger] Send API failed:", result.error);
  }
}
