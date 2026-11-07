import Link from "next/link";

import { PageHeader } from "@/components/order4u/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtThb } from "@/lib/format-money";
import { isProductPaid } from "@/lib/payment-status";
import { ORDER_SUMMARY_FILTERS, orderSummaryLabel } from "@/lib/status-labels";
import { listAgentOrders } from "@/server/queries/orders";

type SortKey = "date" | "profit" | "quoted" | "paid";
type SortDir = "asc" | "desc";

type PageProps = {
  searchParams: Promise<{
    customer?: string;
    code?: string;
    cargo?: string;
    from?: string;
    to?: string;
    status?: string;
    sort?: string;
    dir?: string;
  }>;
};

const SORT_KEYS: SortKey[] = ["date", "profit", "quoted", "paid"];

function parseSort(value: string | undefined): SortKey {
  return SORT_KEYS.includes(value as SortKey) ? (value as SortKey) : "date";
}

function parseDir(value: string | undefined): SortDir {
  return value === "asc" ? "asc" : "desc";
}

function reportsHref(params: Record<string, string>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `/agent/reports?${qs}` : "/agent/reports";
}

function includesFold(hay: string, needle: string) {
  return hay.toLowerCase().includes(needle.toLowerCase());
}

export default async function AgentReportsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const customerQ = params.customer?.trim() ?? "";
  const codeQ = params.code?.trim() ?? "";
  const cargoQ = params.cargo?.trim() ?? "";
  const fromQ = params.from?.trim() ?? "";
  const toQ = params.to?.trim() ?? "";
  const statusQ = params.status?.trim() ?? "";
  const sort = parseSort(params.sort);
  const dir = parseDir(params.dir);
  const filterParams = {
    customer: customerQ,
    code: codeQ,
    cargo: cargoQ,
    from: fromQ,
    to: toQ,
    status: statusQ,
  };

  const allOrders = await listAgentOrders();
  const fromTime = fromQ ? new Date(`${fromQ}T00:00:00`).getTime() : null;
  const toTime = toQ ? new Date(`${toQ}T23:59:59.999`).getTime() : null;

  const orders = allOrders.filter((order) => {
    if (customerQ && !includesFold(order.customerName, customerQ)) return false;
    if (codeQ && !includesFold(order.code, codeQ)) return false;
    if (cargoQ && !includesFold(order.assignedCargoName ?? "", cargoQ)) return false;
    if (fromTime != null && !Number.isNaN(fromTime) && order.createdAt.getTime() < fromTime) return false;
    if (toTime != null && !Number.isNaN(toTime) && order.createdAt.getTime() > toTime) return false;
    if (statusQ) {
      const summary = orderSummaryLabel(
        order.productPaymentStatus,
        order.fulfillment,
        order.cargoPaymentStatus,
      );
      if (summary !== statusQ) return false;
    }
    return true;
  });

  const profitByItem = orders.flatMap((order) =>
    order.items
      .filter((i) => i.actualPrice !== undefined)
      .map((i) => {
        const quoted = i.price * i.qty;
        const paid = i.actualPrice! * i.qty;
        return {
          itemId: i.id,
          orderId: order.id,
          orderCode: order.code,
          createdAt: order.createdAt.getTime(),
          dateLabel: order.createdAt.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          title: i.title,
          quoted,
          paid,
          profitThb: quoted - paid,
        };
      }),
  );

  const keyOf = { date: "createdAt", profit: "profitThb", quoted: "quoted", paid: "paid" } as const;
  const field = keyOf[sort];
  profitByItem.sort((a, b) => {
    const delta = a[field] - b[field];
    return dir === "asc" ? delta : -delta;
  });

  const paidProductMmk = orders
    .filter((o) => isProductPaid(o.productPaymentStatus) && o.productInvoice)
    .reduce((s, o) => s + (o.productInvoice?.mmkTotal ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Reports"
        description="Revenue from paid orders and your profit on each item."
      />

      <form
        action="/agent/reports"
        className="mb-6 grid gap-3 rounded-[14px] border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <div className="space-y-1.5">
          <Label htmlFor="reports-customer">Customer</Label>
          <Input id="reports-customer" name="customer" defaultValue={customerQ} placeholder="Name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reports-code">Order code</Label>
          <Input id="reports-code" name="code" defaultValue={codeQ} placeholder="ORD-…" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reports-cargo">Cargo</Label>
          <Input id="reports-cargo" name="cargo" defaultValue={cargoQ} placeholder="Cargo name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reports-from">From</Label>
          <Input id="reports-from" name="from" type="date" defaultValue={fromQ} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reports-to">To</Label>
          <Input id="reports-to" name="to" type="date" defaultValue={toQ} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reports-status">Status</Label>
          <select
            id="reports-status"
            name="status"
            defaultValue={statusQ}
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-base md:text-sm"
          >
            <option value="">All statuses</option>
            {ORDER_SUMMARY_FILTERS.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="dir" value={dir} />
        <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-3">
          <Button type="submit">Apply filters</Button>
          <Button asChild type="button" variant="ghost">
            <Link href="/agent/reports">Clear</Link>
          </Button>
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Product revenue (MMK)</CardTitle>
            <CardDescription>Product invoices you marked paid (this filter)</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {paidProductMmk.toLocaleString("en-US")} MMK
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orders</CardTitle>
            <CardDescription>Orders matching this filter</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{orders.length}</p>
            <Button asChild variant="ghost" className="px-0 mt-2 h-auto">
              <Link href="/agent/orders">View orders →</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Your profit on each item</CardTitle>
          <CardDescription>
            Customer price minus what you paid, times quantity. Only you can see this.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profitByItem.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No profit yet. Enter the THB you paid when you mark an item bought.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <SortHead
                      label="Date"
                      column="date"
                      sort={sort}
                      dir={dir}
                      hrefBase={filterParams}
                      align="left"
                    />
                    <th className="pb-2 pr-4">Order</th>
                    <th className="pb-2 pr-4">Item</th>
                    <SortHead
                      label="Actual price"
                      column="quoted"
                      sort={sort}
                      dir={dir}
                      hrefBase={filterParams}
                    />
                    <SortHead
                      label="Buy price"
                      column="paid"
                      sort={sort}
                      dir={dir}
                      hrefBase={filterParams}
                    />
                    <SortHead
                      label="Profit"
                      column="profit"
                      sort={sort}
                      dir={dir}
                      hrefBase={filterParams}
                    />
                  </tr>
                </thead>
                <tbody>
                  {profitByItem.slice(0, 50).map((row) => (
                    <tr key={row.itemId} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">{row.dateLabel}</td>
                      <td className="py-2 pr-4 font-medium">
                        <Link href={`/agent/orders/${row.orderId}`} className="text-primary hover:underline">
                          {row.orderCode}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 max-w-[220px] truncate">{row.title}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{fmtThb(row.quoted)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{fmtThb(row.paid)}</td>
                      <td
                        className={`py-2 text-right tabular-nums font-medium ${
                          row.profitThb >= 0 ? "text-emerald-600" : "text-destructive"
                        }`}
                      >
                        {fmtThb(row.profitThb)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function SortHead({
  label,
  column,
  sort,
  dir,
  hrefBase,
  align = "right",
}: {
  label: string;
  column: SortKey;
  sort: SortKey;
  dir: SortDir;
  hrefBase: Record<string, string>;
  align?: "left" | "right";
}) {
  const active = sort === column;
  const nextDir: SortDir = active && dir === "desc" ? "asc" : "desc";
  return (
    <th className={`pb-2 pr-4 last:pr-0 ${align === "right" ? "text-right" : "text-left"}`}>
      <Link
        href={reportsHref({ ...hrefBase, sort: column, dir: nextDir })}
        scroll={false}
        className={`inline-flex items-center gap-1 hover:text-foreground ${
          align === "right" ? "justify-end" : ""
        } ${active ? "text-foreground font-medium" : ""}`}
      >
        {label}
        <span className="text-[10px] tabular-nums" aria-hidden>
          {active ? (dir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </Link>
    </th>
  );
}
