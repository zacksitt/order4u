# Messenger bot — local setup (ngrok + webhook)

## 1. Environment

Add to `.env.local` (see `env.example`):

```bash
APP_URL=https://YOUR-NGROK-SUBDOMAIN.ngrok-free.app
META_APP_SECRET=your_app_secret
MESSENGER_VERIFY_TOKEN=pick_any_random_string
MESSENGER_PAGE_ACCESS_TOKEN=page_token_from_meta
MESSENGER_PAGE_ID=numeric_page_id
MESSENGER_SETUP_SECRET=local-setup-secret
# Local only if signature fails during debugging:
# MESSENGER_SKIP_SIGNATURE_VERIFY=true
```

`APP_URL` must match your **public HTTPS** URL (ngrok), no trailing slash.

## 2. Database

```bash
npm run db:push
npm run db:seed
```

Demo shop slug: `demo-shop`.

## 3. Run app + ngrok

Terminal 1:

```bash
npm run dev
```

Terminal 2 ([ngrok](https://ngrok.com/download)):

Use the **same port** Next.js prints (often `3000`, or `3002` if 3000 is busy):

```bash
ngrok http 3002
```

Copy the `https://….ngrok-free.app` URL into `APP_URL` and restart `npm run dev`.

`next.config.ts` reads `APP_URL` for `allowedDevOrigins` so Messenger / ngrok can load dev pages without HMR cross-origin warnings.

## 4. Meta Developer Console

1. **Messenger → Settings → Webhooks**  
   - Callback URL: `https://YOUR-NGROK/api/webhooks/messenger`  
   - Verify token: same as `MESSENGER_VERIFY_TOKEN`  
   - Click **Verify and save**

2. **Subscribe your Page** (required or Meta never POSTs message events):
   - In the Webhooks UI: add your Page and enable `messages`, `messaging_postbacks`, **or**
   - Run `POST /api/messenger/setup-menu` (subscribes via Graph API `/{page-id}/subscribed_apps`).

3. Copy **Page ID** → `MESSENGER_PAGE_ID` in `.env.local`

4. Copy **Page access token** → `MESSENGER_PAGE_ACCESS_TOKEN`

**No POST in ngrok when you chat?** Open [http://127.0.0.1:4040](http://127.0.0.1:4040). If you only see GET (verify) and no POST from `facebook`, fix callback URL + Page subscription. Dev terminal should log `[messenger] POST /api/webhooks/messenger` on each message.

```bash
curl -s "http://localhost:3000/api/messenger/webhook-status" \
  -H "x-messenger-setup-secret: local-setup-secret"
```

## 5. Install persistent menu + Get Started

With dev server running (agent logged in **or** setup secret):

```bash
curl -X POST "http://localhost:3000/api/messenger/setup-menu" \
  -H "Content-Type: application/json" \
  -H "x-messenger-setup-secret: local-setup-secret" \
  -d '{"slug":"demo-shop"}'
```

Or log in as `agent@demo.shop` and POST from browser devtools / REST client with session cookie.

## 6. Test

1. Message your Facebook Page from a tester account.  
2. Tap **Get Started** or send `hi` / `order`.  
3. Bot should reply with **Place order** / **My orders** buttons (personalized `?c=` links).  
4. Persistent menu **My orders** sends postback → bot replies with your private list link.

## Troubleshooting

| Issue | Check |
|--------|--------|
| Webhook verify fails | `MESSENGER_VERIFY_TOKEN` matches Meta; ngrok URL is HTTPS |
| 403 on POST | `META_APP_SECRET` + signature; or temporary `MESSENGER_SKIP_SIGNATURE_VERIFY=true` |
| No reply in chat | `MESSENGER_PAGE_ACCESS_TOKEN`; app in Dev mode + tester role |
| Wrong shop | Set `messengerPageId` on tenant via setup-menu + `MESSENGER_PAGE_ID` |

Webhook route: `src/app/api/webhooks/messenger/route.ts`  
Menu API: `POST /api/messenger/setup-menu`
