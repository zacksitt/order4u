import Link from "next/link";

import { PageHeader } from "@/components/order4u/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listAgentOrders } from "@/server/queries/orders";
import { fmtThb } from "@/lib/format-money";
import { isProductPaid } from "@/lib/payment-status";

export default async function AgentReportsPage() {
  const orders = await listAgentOrders();

  const withMargin = orders.flatMap((order) =>
    order.items
      .filter((i) => i.actualPrice !== undefined)
      .map((i) => ({
        orderCode: order.code,
        title: i.title,
        quoted: i.price,
        actual: i.actualPrice!,
        marginThb: (i.price - i.actualPrice!) * i.qty,
      })),
  );

  const paidProductMmk = orders
    .filter((o) => isProductPaid(o.productPaymentStatus) && o.productInvoice)
    .reduce((s, o) => s + (o.productInvoice?.mmkTotal ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Reports"
        description="Shop-level summaries for your assigned orders."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Product revenue (MMK)</CardTitle>
            <CardDescription>Orders with product invoice marked paid</CardDescription>
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
            <CardDescription>Total in your list</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{orders.length}</p>
            <Button asChild variant="ghost" className="px-0 mt-2 h-auto">
              <Link href="/agent/orders">Go to orders</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Margin preview (quoted vs actual THB)</CardTitle>
          <CardDescription>
            Lines where actual pay is recorded — agent-only; CSV export can be added next.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {withMargin.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No lines with actual pay yet. Update item statuses on order detail after buying.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4">Order</th>
                    <th className="pb-2 pr-4">Item</th>
                    <th className="pb-2 pr-4 text-right">Quoted</th>
                    <th className="pb-2 pr-4 text-right">Actual</th>
                    <th className="pb-2 text-right">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {withMargin.slice(0, 50).map((row, i) => (
                    <tr key={`${row.orderCode}-${i}`} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-4 font-medium">{row.orderCode}</td>
                      <td className="py-2 pr-4 max-w-[200px] truncate">{row.title}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{fmtThb(row.quoted)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{fmtThb(row.actual)}</td>
                      <td
                        className={`py-2 text-right tabular-nums font-medium ${
                          row.marginThb >= 0 ? "text-emerald-600" : "text-destructive"
                        }`}
                      >
                        {fmtThb(row.marginThb)}
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
