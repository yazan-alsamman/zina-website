"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/cn";
import { buttonClass } from "./ui";

export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  variant = "primary",
  className,
  name,
  value,
  disabled,
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: keyof typeof buttonClass;
  className?: string;
  name?: string;
  value?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending || disabled}
      aria-busy={pending}
      className={cn(buttonClass[variant], className)}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
