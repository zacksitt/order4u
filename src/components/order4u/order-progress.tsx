"use client";

import { Check } from "lucide-react";
import { useState } from "react";

import { buildCustomerTimeline } from "@/lib/order-timeline";
import { allItemsArrived, isHandedToCargo } from "@/lib/order-rules";
import { isProductPaid } from "@/lib/payment-status";
import type { Order } from "@/lib/types";
import { cn } from "@/lib/utils";

const STEPS = ["Paid", "Buying", "Arrived", "At cargo", "Delivered"] as const;

function progressIndex(order: Order): number {
  if (!isProductPaid(order.productPaymentStatus)) return 0;
  if (!allItemsArrived(order.items)) return 1;
  if (!isHandedToCargo(order.fulfillment)) return 2;
  if (order.fulfillment === "delivered") return 4;
  return 3;
}

export function OrderProgress({ order }: { order: Order }) {
  const [preview, setPreview] = useState(false);
  const paid = isProductPaid(order.productPaymentStatus);
  const current = progressIndex(order);
  const timeline = buildCustomerTimeline(order).map((step) => (paid ? step : { ...step, state: 0 as const }));

  return (
    <section
      aria-label="Order progress"
      className="flex flex-col gap-3 rounded-[14px] border border-border bg-card px-5 pb-3.5 pt-[18px]"
    >
      <ol className="grid grid-cols-5">
        {STEPS.map((label, index) => {
          const done = index < current;
          const now = index === current;
          return (
            <li
              key={label}
              className="relative flex flex-col items-center gap-2"
              aria-current={now ? "step" : undefined}
            >
              {index > 0 && (
                <span
                  className={cn(
                    "absolute top-[15px] h-[3px] left-[calc(-50%+20px)] right-[calc(50%+20px)]",
                    index <= current ? "bg-teal-600" : "bg-slate-200",
                  )}
                />
              )}
              <span
                className={cn(
                  "relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold",
                  done && "bg-teal-600 text-white",
                  now && "border-[3px] border-teal-600 bg-white text-teal-800 shadow-[0_0_0_4px_#CCFBF1]",
                  !done && !now && "border-2 border-slate-300 bg-white text-slate-500",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={3.5} /> : index + 1}
              </span>
              <span
                className={cn(
                  "text-center text-[13px]",
                  now ? "font-bold text-foreground" : done ? "font-medium text-slate-700" : "font-medium text-slate-500",
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="flex justify-center">
        <button
          type="button"
          className="min-h-9 text-[13px] font-semibold text-teal-800"
          aria-expanded={preview}
          onClick={() => setPreview((open) => !open)}
        >
          {preview ? "Hide customer view" : "Preview what the customer sees"}
        </button>
      </div>
      {preview && (
        <ol className="flex flex-col gap-2.5 border-t border-slate-100 pt-3">
          {timeline.map((step) => (
            <li key={step.id} className="flex items-baseline gap-2.5 text-[13px]">
              <span
                className={cn(
                  "h-2.5 w-2.5 shrink-0 rounded-full",
                  step.state === 2 && "bg-teal-600",
                  step.state === 1 && "border-[3px] border-teal-600 bg-white",
                  step.state === 0 && "bg-slate-200",
                )}
              />
              <span className={cn(step.state === 0 ? "text-slate-500" : "text-foreground", step.state === 1 && "font-bold")}>
                {step.title}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
