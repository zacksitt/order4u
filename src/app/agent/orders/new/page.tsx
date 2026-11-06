import { NewOrderForm } from "@/components/order4u/new-order-form";
import { PageHeader } from "@/components/order4u/page-header";
import { getTenantSettingsForAgent } from "@/server/queries/tenant";

export default async function NewOrderPage() {
  const tenantDefaults = await getTenantSettingsForAgent();

  return (
    <>
      <PageHeader
        title="New order"
        description="Fill in the fields marked (required). The invoice is created with the order."
      />
      <NewOrderForm tenantDefaults={tenantDefaults} />
    </>
  );
}
