import { NewOrderForm } from "@/components/order4u/new-order-form";
import { PageHeader } from "@/components/order4u/page-header";
import { getTenantSettingsForCustomer } from "@/server/queries/tenant";

export default async function CustomerNewOrderPage() {
  const { profile, ...tenantDefaults } = await getTenantSettingsForCustomer();

  return (
    <>
      <PageHeader
        title="New order"
        description="Paste the product link, tap Get name & price, then place your order. Fields marked (required) must be filled."
      />
      <NewOrderForm tenantDefaults={tenantDefaults} mode="customer" initialCustomer={profile} />
    </>
  );
}
