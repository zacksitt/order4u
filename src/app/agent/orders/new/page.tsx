import { NewOrderForm } from "@/components/order4u/new-order-form";
import { PageHeader } from "@/components/order4u/page-header";
import { getTenantSettingsForAgent } from "@/server/queries/tenant";

export default async function NewOrderPage() {
  const tenantDefaults = await getTenantSettingsForAgent();

  return (
    <>
      <PageHeader
        title="New order"
        description="Search catalog or paste product links. Customer invoice shows quoted THB; set actual pay per item after you purchase."
      />
      <NewOrderForm tenantDefaults={tenantDefaults} />
    </>
  );
}
