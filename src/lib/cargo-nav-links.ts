import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Package, Tags } from "lucide-react";

export type CargoNavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const CARGO_NAV_LINKS: CargoNavLink[] = [
  { href: "/cargo/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cargo/orders", label: "Orders", icon: Package },
  { href: "/cargo/categories", label: "Categories", icon: Tags },
];

export function isCargoNavActive(pathname: string, href: string): boolean {
  if (href === "/cargo/dashboard") {
    return pathname === href || pathname === "/cargo";
  }
  if (href === "/cargo/orders") {
    return pathname === href || pathname.startsWith("/cargo/orders/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
