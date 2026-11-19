import { BrandLogo } from "@/components/order4u/brand-logo";
import { CargoBottomNav } from "@/components/order4u/cargo-bottom-nav";
import { CargoShopSelect } from "@/components/order4u/cargo-shop-select";
import { CargoSidebar } from "@/components/order4u/cargo-sidebar";
import { InstallAppButton } from "@/components/order4u/install-app-button";
import { NotificationBell } from "@/components/order4u/notification-bell";
import { requireCargo } from "@/server/auth/session";
import { listNotificationFeed } from "@/server/queries/notifications";
import { listCargoShops } from "@/server/queries/users";

export default async function CargoLayout({ children }: LayoutProps<"/cargo">) {
  const [session, feed, shops] = await Promise.all([
    requireCargo(),
    listNotificationFeed(),
    listCargoShops(),
  ]);

  return (
    <div className="md:flex min-h-screen w-full">
      <CargoSidebar shops={shops} currentTenantId={session.tenantId} notifications={feed} />
      <div className="flex min-h-screen flex-1 flex-col pb-24 md:pb-0">
        <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <BrandLogo className="h-10" />
            <CargoShopSelect shops={shops} currentTenantId={session.tenantId} className="min-w-0 max-w-[10.5rem]" />
          </div>
          <div className="flex items-center gap-1">
            <InstallAppButton className="px-2" />
            <NotificationBell items={feed.items} unreadCount={feed.unreadCount} />
          </div>
        </div>
        <div className="mx-auto w-full max-w-lg flex-1 px-4 py-6 md:max-w-4xl md:px-8 lg:max-w-5xl">
          {children}
        </div>
        <CargoBottomNav />
      </div>
    </div>
  );
}
