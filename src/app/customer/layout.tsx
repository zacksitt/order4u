import { CustomerNav } from "@/components/order4u/customer-nav";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <CustomerNav />
      <div className="mx-auto max-w-[820px] px-4 py-6 md:px-8">{children}</div>
    </div>
  );
}
