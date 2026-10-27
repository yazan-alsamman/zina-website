"use client";

import { useState } from "react";
import { buttonClass } from "@/components/admin/ui";

export function CopyLinkButton({
  link,
  label = "Copy WhatsApp link",
  variant = "primary",
}: {
  link: string;
  label?: string;
  variant?: "primary" | "quiet";
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={buttonClass[variant]}
      onClick={async () => {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      <span aria-live="polite">{copied ? "Link copied" : label}</span>
    </button>
  );
}
