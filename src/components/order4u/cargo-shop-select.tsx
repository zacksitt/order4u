"use client";

import { usePathname } from "next/navigation";

import { switchCargoShop } from "@/server/actions/cargo-shop";
import { cn } from "@/lib/utils";

export function CargoShopSelect({
  shops,
  currentTenantId,
  className,
}: {
  shops: { id: string; name: string }[];
  currentTenantId: string;
  className?: string;
}) {
  const pathname = usePathname();
  const current = shops.find((shop) => shop.id === currentTenantId);
  if (pathname.startsWith("/cargo/change-password")) {
    return <p className={cn("truncate text-sm font-medium", className)}>Cargo</p>;
  }
  if (shops.length <= 1) {
    return (
      <p className={cn("truncate text-sm font-medium", className)}>{current?.name ?? "Cargo"}</p>
    );
  }

  return (
    <form action={switchCargoShop} className={cn("min-w-0", className)}>
      <label className="sr-only" htmlFor="cargo-shop">
        Shop
      </label>
      <select
        id="cargo-shop"
        name="tenantId"
        key={currentTenantId}
        defaultValue={currentTenantId}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="h-9 w-full max-w-full truncate rounded-md border border-input bg-background px-2 text-sm font-medium text-foreground"
      >
        {shops.map((shop) => (
          <option key={shop.id} value={shop.id}>
            {shop.name}
          </option>
        ))}
      </select>
    </form>
  );
}
