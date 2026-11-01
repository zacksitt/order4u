import { CargoNav } from "@/components/order4u/cargo-nav";
import { listNotificationFeed } from "@/server/queries/notifications";

export default async function CargoLayout({ children }: LayoutProps<"/cargo">) {
  const feed = await listNotificationFeed();

  return (
    <div className="min-h-screen bg-muted/30">
      <CargoNav notifications={feed} />
      <div className="mx-auto max-w-[820px] px-4 py-6 md:px-8">{children}</div>
    </div>
  );
}
