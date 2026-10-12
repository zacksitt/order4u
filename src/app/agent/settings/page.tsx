import { SettingsForm } from "@/components/order4u/settings-form";
import { PageHeader } from "@/components/order4u/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTenantSettingsForAgent } from "@/server/queries/tenant";

export default async function AgentSettingsPage() {
  const settings = await getTenantSettingsForAgent();

  return (
    <>
      <PageHeader
        title="Settings"
        description="Default FX and agent fee % lock onto each invoice; you can still edit fee on the order before sending."
      />

      <Card>
        {/* <CardHeader>
          <CardTitle className="text-base">FX & agent fee</CardTitle>
          <CardDescription>
            Fee is calculated as a percent of THB total (items + TH shipping), then converted to MMK at the locked
            rate.
          </CardDescription>
        </CardHeader> */}
        <CardContent>
          <SettingsForm initial={settings} />
        </CardContent>
      </Card>
    </>
  );
}
