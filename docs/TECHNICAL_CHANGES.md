# Technical changes

Working notes for the current slice (7 Nov 2026). Parked work stays in [`BACKLOG.md`](../BACKLOG.md). Schema details: [`DATABASE.md`](./DATABASE.md).

## Behaviour

### Customers and login

- Agent **Customers** page: search by name, login email, or full phone; **New customer** / **Edit** in modals. Paginated (10 / 25 / 100, default 10) with URL `page`, `pageSize`, `q`, `sort`, `dir`. Sortable **Name**, **Orders**, **Created**. Changing search/size/page refetches via the App Router (not a client-side slice of 200 rows).
- Agent **Orders** list: optional `customer` id filter (picker + link from the customer **Orders** count).
- Name required. Email and password optional. Both together create or update a `users` row + `customer` membership and set `must_change_password`.
- New order: pick an existing customer (same combobox pattern as catalog items) or add by name + phone. **No email/password on the order form.**
- New customer without a login is a `customers` row only. Agent can add login later in Edit.
- First sign-in with an agent-set password goes to `/customer/change-password`. Other `/customer/*` routes stay blocked until they change it (`users.must_change_password` on the JWT).
- Demo `customer@demo.shop` / `demo` is not forced to reset.

### PII at rest

- Helper: `src/server/crypto/customer-pii.ts` (`encryptPii` / `decryptPii` / `phoneHashFromPlain`).
- Env: `CUSTOMER_PII_KEY` (32-byte key, base64). Missing key fails closed. Do not commit the live key.
- After `db push`: `npm run db:encrypt-pii` (skips rows already prefixed `enc:v1:`). Remote deploy runs this after Prisma push.

### FX

- Settings save writes `exchange_rate_history` when the shop rate changes (same transaction). Seeds a row if history is empty.
- Orders still copy `product_invoices.rate_thb_mmk` at create. No history UI. Live-rate-until-paid is parked.

### Order form (customer / public)

- Source: Shopee / Lazada (`order_items.marketplace`). URL still required. Invoice still created on submit.
- Line **notes / product options** → `order_items.customer_note`.

### Reports (`/agent/reports`)

- Filters: customer name, order code, cargo, date range (`orders.created_at`), summary status. KPIs follow the filter.
- Table is **item profit**, not rolled up by product or by order: one row per bought line (`actual_price` set).
- Columns: Date, Order (link, `scroll=false` on sort only), Item, Actual price (quoted × qty), Buy price (paid × qty), Profit.
- Sort: date, actual price, buy price, profit (query `sort` + `dir`). Default: date descending.
- Profit is not stored; `(price − actual_price) × qty` in the page query.

### Staff PWA

- Agent / cargo / login: **Download app** (`beforeinstallprompt`). Replaces **Share login link**.
- Invoice Share / Download PDF unchanged.

### Copy

- Dashboard action title: **Ready to ship to cargo**. Handoff button remains **Give to cargo**.

## Code map

| Area | Where |
|---|---|
| Schema | `prisma/schema.prisma` |
| PII | `src/server/crypto/customer-pii.ts`, `scripts/encrypt-customer-pii.ts` |
| Customer login create/update | `src/server/services/create-customer-login.ts`, `src/server/actions/customers.ts` |
| Auth / first password | `src/auth.ts`, `src/auth.config.ts`, `src/middleware.ts`, `src/server/actions/change-password.ts` |
| New order customer pick | `src/components/order4u/new-order-form.tsx`, `customer-search-combobox.tsx` |
| Customer directory | `src/app/agent/customers/page.tsx`, `customers-directory.tsx`, `src/server/queries/customers.ts` |
| Orders customer filter | `src/app/agent/orders/page.tsx`, `orders-customer-filter.tsx` |
| FX history write | `src/server/actions/settings.ts` |
| Reports | `src/app/agent/reports/page.tsx` |
| PWA button | `src/components/order4u/install-app-button.tsx` |

## Env / deploy

Set on the server before deploy:

- `CUSTOMER_PII_KEY` — `openssl rand -base64 32`

Then `npx prisma db push` and `npm run db:encrypt-pii`. See [`DEPLOY.md`](../DEPLOY.md) and `scripts/remote-deploy.sh`.

Restart `npm run dev` after Prisma generate so Next does not keep an old PrismaClient (e.g. missing `phoneHash`).

## Out of this slice

Fee rules by type/brand, Thailand/Myanmar tracking numbers, FX history UI, email/Facebook sending, request-only orders without a price, native store APK.
