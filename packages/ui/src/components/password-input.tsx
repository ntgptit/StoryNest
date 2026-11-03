"use client";

import { Eye, EyeOff } from "lucide-react";
import * as React from "react";

import { cn } from "../lib/utils.ts";
import { Button } from "./button.tsx";
import { Input } from "./input.tsx";

/** Password field with a show/hide toggle. The labels are supplied by the caller (translated). */
function PasswordInput({
  className,
  showLabel = "Show password",
  hideLabel = "Hide password",
  ...props
}: Omit<React.ComponentProps<"input">, "type"> & { showLabel?: string; hideLabel?: string }) {
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="relative">
      <Input type={visible ? "text" : "password"} className={cn("pr-11", className)} {...props} />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute inset-y-0 right-0 text-muted-foreground"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? hideLabel : showLabel}
        aria-pressed={visible}
        disabled={props.disabled}
      >
        {visible ? <EyeOff /> : <Eye />}
      </Button>
    </div>
  );
}

export { PasswordInput };
