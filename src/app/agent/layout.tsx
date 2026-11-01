import { AgentBottomNav } from "@/components/order4u/agent-bottom-nav";
import { AgentSidebar } from "@/components/order4u/agent-sidebar";
import { NotificationBell } from "@/components/order4u/notification-bell";
import { ShareAppButton } from "@/components/order4u/share-app-button";
import { absolutePublicUrl } from "@/lib/app-url";
import { listNotificationFeed } from "@/server/queries/notifications";
import { getTenantSettingsForAgent } from "@/server/queries/tenant";

export default async function AgentLayout({ children }: LayoutProps<"/agent">) {
  const [{ shopName }, feed] = await Promise.all([
    getTenantSettingsForAgent(),
    listNotificationFeed(),
  ]);

  const appUrl = absolutePublicUrl("/login");

  return (
    <div className="md:flex min-h-screen w-full">
      <AgentSidebar shopName={shopName} notifications={feed} appUrl={appUrl} />
      <div className="flex min-h-screen flex-1 flex-col pb-24 md:pb-0">
        <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Order4U Agent</p>
            <p className="text-sm text-muted-foreground">{shopName}</p>
          </div>
          <div className="flex items-center gap-1">
            <ShareAppButton url={appUrl} className="px-2" />
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
