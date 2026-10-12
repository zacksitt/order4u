import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import type { TimelineStep } from "@/lib/order-timeline";

type OrderTimelineProps = {
  steps: TimelineStep[];
};

export function OrderTimeline({ steps }: OrderTimelineProps) {
  return (
    <ol className="relative space-y-0 pl-1">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const done = step.state === 2;
        const current = step.state === 1;

        return (
          <li key={step.id} className="relative flex gap-4 pb-8 last:pb-0">
            {!isLast && (
              <span
                className={cn(
                  "absolute left-[15px] top-8 h-[calc(100%-1rem)] w-px",
                  done ? "bg-primary" : "border-l border-dashed border-muted-foreground/35",
                )}
                aria-hidden
              />
            )}
            <div
              className={cn(
                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold",
                done && "border-primary bg-primary text-primary-foreground",
                current && "border-primary bg-background text-primary ring-4 ring-primary/15",
                !done && !current && "border-muted-foreground/30 bg-muted text-muted-foreground",
              )}
            >
              {done ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-start justify-between gap-2">
                <p
                  className={cn(
                    "font-semibold text-sm",
                    current && "text-primary",
                    !done && !current && "text-muted-foreground",
                  )}
                >
                  {step.title}
                </p>
                {step.timeLabel && (
                  <span className="shrink-0 text-xs text-muted-foreground">{step.timeLabel}</span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground leading-snug">{step.description}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
