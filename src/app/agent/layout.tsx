import { AgentBottomNav } from "@/components/order4u/agent-bottom-nav";
import { BrandLogo } from "@/components/order4u/brand-logo";
import { AgentSidebar } from "@/components/order4u/agent-sidebar";
import { NotificationBell } from "@/components/order4u/notification-bell";
import { InstallAppButton } from "@/components/order4u/install-app-button";
import { listNotificationFeed } from "@/server/queries/notifications";
import { getTenantSettingsForAgent } from "@/server/queries/tenant";

export default async function AgentLayout({ children }: LayoutProps<"/agent">) {
  const [{ shopName }, feed] = await Promise.all([
    getTenantSettingsForAgent(),
    listNotificationFeed(),
  ]);

  return (
    <div className="md:flex min-h-screen w-full">
      <AgentSidebar shopName={shopName} notifications={feed} />
      <div className="flex min-h-screen flex-1 flex-col pb-24 md:pb-0">
        <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <BrandLogo className="h-10" />
            <p className="truncate text-sm text-muted-foreground">{shopName}</p>
          </div>
          <div className="flex items-center gap-1">
            <InstallAppButton className="px-2" />
            <NotificationBell items={feed.items} unreadCount={feed.unreadCount} />
          </div>
        </div>
        <div className="mx-auto w-full max-w-lg flex-1 px-4 py-6 md:max-w-4xl md:px-8 lg:max-w-5xl">
          {children}
        </div>
        <AgentBottomNav />
      </div>
    </div>
  );
}
