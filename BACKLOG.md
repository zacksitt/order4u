# Order4U backlog

Status: parked — implement when we pick this up. Do not start until then.

## Buy before pay, lock FX at Customer paid

Agreed 7 Nov 2026.

### Rules

1. Agent buying is independent of product payment. Bought → Seller sent → Arrived can happen while payment is still awaiting.
2. Goods cannot leave for cargo until product is paid. Hand to cargo (and Myanmar transfer) requires `productPaymentStatus = paid`.
3. FX is live from shop Settings until **Customer paid**. Then it is written onto the product invoice and never changes.

```
Create order → estimate invoice (Settings rate)
     ↓
Agent buys / items arrive     Customer can pay any time
     ↓                              ↓
All arrived, unpaid → wait     Customer paid → lock today's Settings rate
     ↓
Hand to cargo → cargo warehouse → Myanmar
```

### 1. Buying without payment

Today `ItemRow` is `locked={!paid || handed}` and the checklist blocks item updates until payment.

- Unlock item status/price whenever the order is not yet handed to cargo (`locked={handed}` only).
- Server `updateOrderItemStatus` / `updateOrderItemActualPrice` already allow this; leave them.
- Next step: if unpaid and items still to buy, show buying as the main step; keep **Customer paid** available (not only as the first step).
- Progress bar: do not freeze on “Paid”. Buying/Arrived can move while payment is awaiting.
- Status: e.g. **Buying · awaiting payment**, not always **Awaiting payment**.
- Filters/dashboard **To buy**: drop the `productPaymentStatus = paid` requirement.
- **Ready for cargo** still needs paid + all arrived.

### 2. Cargo cannot take the goods until paid

Put the gate in `canHandOrderToCargo`:

- all items arrived
- fulfillment is `collecting` | `ready_for_cargo`
- product is paid

Use that in `handOrderToCargo`, agent next-step “Give to cargo”, and `HandToCargoPanel`.

If unpaid and all arrived: **Waiting for product payment** — items are here; confirm Customer paid before giving to cargo.

Also reject cargo **in transit** if product is unpaid (safety if an old order was already handed).

Cargo receive/check/invoice stay as they are once the order is legitimately handed.

### 3. Exchange rate from Settings until paid

Do not rewrite every unpaid invoice on each Settings save. Compute live, lock once.

| Moment | Rate |
|---|---|
| Unpaid (screen, PDF, header total) | Shop `defaultThbMmkRate` now |
| Agent taps **Customer paid** | Recalc MMK from same THB + current Settings rate, save on `product_invoices`, then mark paid |
| After paid | Stored `rateThbMmk` only |

Shared helper, e.g. `productInvoiceForDisplay(order, shopRate)`:

- unpaid → `buildProductInvoice({ thbSubtotal, thbShipping, rate: shopRate, serviceFeePercent })`
- paid → stored snapshot

`markProductPaid` loads tenant rate, updates invoice row (`rateThbMmk`, `mmkServiceFee`, `mmkTotalDue`), then sets `productPaidAt`. Log `product_paid` with old rate → new rate.

Keep service fee % as on the invoice. Only FX (and MMK amounts) follow Settings.

Unpaid invoice copy: **Rate (from shop settings)** not **Rate locked**. After paid: **Rate locked**.

Cargo invoice already uses the product invoice rate; that only exists after paid + handoff.

### 4. Customer tracking

Keep as-is: public journey stays hidden until product is paid. They still see the live amount due. After pay, tracking uses the locked total.

### 5. Files

| Area | Files |
|---|---|
| Rules | `src/lib/order-rules.ts` |
| Live invoice | `src/lib/product-invoice-calc.ts`, mapper or query (pass tenant rate) |
| Lock on pay | `src/server/actions/agent-orders.ts` (`markProductPaid`) |
| Agent UI | `agent-order-detail.tsx`, `order-progress.tsx`, `status-labels.ts`, `agent-order-actions.tsx` |
| Filters / KPI | `order-filters.ts`, `recent-orders.tsx`, `dashboard.ts` |
| Invoice UI | `money-row.tsx`, `product-invoice-card.tsx`, PDF, public/agent totals |
| Cargo safety | `cargo-orders.ts` in-transit |
| Copy | Settings hint: unpaid invoices follow the shop rate until Customer paid |

No schema change required for v1.

### 6. Checks when implementing

- Unpaid: buy through Arrived; Give to cargo hidden/rejected.
- Change Settings rate → unpaid MMK updates; paid orders unchanged.
- Customer paid with a new shop rate → invoice + PDF match that rate.
- Paid + all arrived → Give to cargo works.
- Filters: unpaid orders with pending items appear in To buy.

### Out of scope unless asked

- Auto-updating THB line prices
- Live service-fee %
- Full tracking before pay

---

## Fee rules by product type and brand

Parked 7 Nov 2026. Do not start until a fee model is decided.

Examples (may differ per shop): Shopee/Lazada 5%, branded 3%, other under THB 5,000 10%, other over THB 10,000 8%.

Open decisions:

- One invoice percent vs per-line fees (today the product invoice is one % of the whole THB total).
- Shop tenant vs per-login agent (today Settings is per tenant).
- Rule priority when a line matches more than one rule.

---

## Thailand and Myanmar tracking numbers

Parked 7 Nov 2026. Do not start until then.

Statuses already split (`seller_shipped` vs `in_transit`). Missing: carrier / tracking number or URL on the Thailand leg (likely per item) and the Myanmar leg (likely per order), shown on agent, cargo, and customer views.
