"use client";

import * as React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldLabelProps = React.ComponentPropsWithoutRef<typeof Label> & {
  required?: boolean;
};

export function FieldLabel({ required, className, children, ...props }: FieldLabelProps) {
  return (
    <Label className={cn(className)} {...props}>
      {children}
      {required ? (
        <span className="ml-1 text-xs font-normal text-muted-foreground">(required)</span>
      ) : null}
    </Label>
  );
}
