import { NewOrderForm } from "@/components/order4u/new-order-form";
import { PageHeader } from "@/components/order4u/page-header";
import { getTenantSettingsForAgent } from "@/server/queries/tenant";

export default async function NewOrderPage() {
  const tenantDefaults = await getTenantSettingsForAgent();

  return (
    <>
      <PageHeader
        title="New order"
        description="Please filed the required fields with *"
      />
      <NewOrderForm tenantDefaults={tenantDefaults} />
    </>
  );
}
