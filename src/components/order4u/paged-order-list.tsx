"use client";

import { Children, useState } from "react";

import { CURRENT_ORDER_PAGE_SIZE } from "@/lib/agent-orders-href";
import { cn } from "@/lib/utils";

export function PagedOrderList({
  children,
  className,
  empty,
}: {
  children: React.ReactNode;
  className?: string;
  empty?: React.ReactNode;
}) {
  const items = Children.toArray(children);
  const [shown, setShown] = useState(CURRENT_ORDER_PAGE_SIZE);
  const visible = items.slice(0, shown);

  if (items.length === 0) return empty ?? null;

  return (
    <>
      <div className={className}>{visible}</div>
      {items.length > visible.length && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setShown((count) => count + CURRENT_ORDER_PAGE_SIZE)}
            className={cn(
              "inline-flex min-h-10 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium",
            )}
          >
            Load more ({visible.length} of {items.length})
          </button>
        </div>
      )}
    </>
  );
}
