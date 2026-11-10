import { cn } from "@/lib/utils";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <img
      src="/brand/order4u-logo.png"
      alt="Order4U"
      width={570}
      height={636}
      className={cn("h-12 w-auto", className)}
    />
  );
}
