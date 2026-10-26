"use client";

import { useState } from "react";
import { buttonClass } from "@/components/admin/ui";

export function CopyLinkButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={buttonClass.primary}
      onClick={async () => {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      <span aria-live="polite">{copied ? "Link copied" : "Copy WhatsApp link"}</span>
    </button>
  );
}
