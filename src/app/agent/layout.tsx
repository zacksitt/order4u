import { AgentBottomNav } from "@/components/order4u/agent-bottom-nav";
import { AgentSidebar } from "@/components/order4u/agent-sidebar";
import { getTenantSettingsForAgent } from "@/server/queries/tenant";

export default async function AgentLayout({ children }: LayoutProps<"/agent">) {
  const { shopName } = await getTenantSettingsForAgent();

  return (
    <div className="md:flex min-h-screen w-full">
      <AgentSidebar shopName={shopName} />
      <div className="flex min-h-screen flex-1 flex-col pb-24 md:pb-0">
        <div className="sticky top-0 z-40 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Order4U Agent</p>
          <p className="text-sm text-muted-foreground">{shopName}</p>
        </div>
        <div className="mx-auto w-full max-w-lg flex-1 px-4 py-6 md:max-w-4xl md:px-8 lg:max-w-5xl">
          {children}
        </div>
        <AgentBottomNav />
      </div>
    </div>
  );
}
