import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicOrderForm } from "@/components/order4u/public-order-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCustomerByPortalToken } from "@/server/queries/customer-portal";
import { getTenantBySlug } from "@/server/queries/tenant-messenger";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ c?: string }>;
};

export default async function PublicOrderFormPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { c } = await searchParams;

  const tenant = await getTenantBySlug(slug);
  if (!tenant || !tenant.publicOrderFormEnabled) notFound();

  const portalToken = c?.trim();
  if (!portalToken) {
    return (
      <main className="mx-auto min-h-screen max-w-lg bg-background px-4 py-6">
        <div className="rounded-xl bg-gradient-to-b from-primary/15 to-transparent px-2 pt-4 pb-6">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-primary">{tenant.name}</p>
          <h1 className="mt-2 text-center text-2xl font-bold">Place order</h1>
        </div>
        <Card className="mt-4">
          <CardContent className="p-4 text-sm text-muted-foreground space-y-3">
            <p>In Messenger, tap the menu → <strong>Place order</strong> (or send <strong>hi</strong>).</p>
            <p>The bot will send an <strong>Open order form</strong> button with your personal link — use that to see the form.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const customer = await getCustomerByPortalToken(portalToken);
  if (!customer || customer.tenantId !== tenant.id) notFound();

  return (
    <main className="mx-auto min-h-screen max-w-lg bg-background px-4 py-6 pb-12">
      <div className="rounded-xl bg-gradient-to-b from-primary/15 to-transparent px-2 pt-4 pb-6">
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-primary">{tenant.name}</p>
        <h1 className="mt-2 text-center text-2xl font-bold">Place order</h1>
        <p className="text-center text-sm text-muted-foreground mt-1">Ordering as {customer.name}</p>
      </div>

      <PublicOrderForm
        shopSlug={tenant.slug}
        portalToken={portalToken}
        initialName={customer.name}
        initialPhone={customer.phone}
        thbMmkRate={Number(tenant.defaultThbMmkRate)}
        serviceFeePercent={Number(tenant.defaultServiceFeePercent)}
        paymentInstructions={tenant.paymentInstructions ?? ""}
      />

      {customer.portalAccessToken && (
        <Button asChild variant="ghost" className="mt-4 w-full" size="sm">
          <Link href={`/my?c=${encodeURIComponent(customer.portalAccessToken)}`}>← My orders</Link>
        </Button>
      )}
    </main>
  );
}
