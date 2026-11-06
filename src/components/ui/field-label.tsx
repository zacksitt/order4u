"use client";

import * as React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldLabelProps = React.ComponentPropsWithoutRef<typeof Label> & {
  required?: boolean;
};

export function FieldLabel({ required, className, children, ...props }: FieldLabelProps) {
  return (
    <Label
      className={cn("inline-flex max-w-full flex-wrap items-baseline gap-x-1.5 gap-y-0.5", className)}
      {...props}
    >
      <span className="min-w-0 break-words">{children}</span>
      {required ? <span className="shrink-0 text-xs font-normal text-muted-foreground">(required)</span> : null}
    </Label>
  );
}
