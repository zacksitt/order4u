import { CargoNav } from "@/components/order4u/cargo-nav";

export default function CargoLayout({ children }: LayoutProps<"/cargo">) {
  return (
    <div className="min-h-screen bg-muted/30">
      <CargoNav />
      <div className="mx-auto max-w-3xl px-4 py-6">{children}</div>
    </div>
  );
}
