"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { renderReview } from "@/lib/review-markup";
import { inputClass } from "./ui";

type ReviewEditorProps = {
  id: string;
  name: string;
  defaultValue?: string;
  dir?: "ltr" | "rtl";
  lang?: string;
  invalid?: boolean;
};

type ToolKind = "bold" | "bullets" | "numbers";

const TOOLS: ReadonlyArray<{ kind: ToolKind; label: string; short: string }> = [
  { kind: "bold", label: "Bold", short: "B" },
  { kind: "bullets", label: "Bulleted list", short: "• List" },
  { kind: "numbers", label: "Numbered list", short: "1. List" },
];

function formatSelection(kind: ToolKind, selected: string): string {
  if (kind === "bold") return `**${selected || "bold text"}**`;
  return (selected || "Item")
    .split("\n")
    .map((line, i) => {
      const text = line.replace(/^\s*(?:[-*]|\d+[.)])\s+/, "");
      return kind === "bullets" ? `- ${text}` : `${i + 1}. ${text}`;
    })
    .join("\n");
}

/**
 * Plain textarea with a light Markdown toolbar (bold, bulleted and numbered lists) and a live
 * preview. The preview uses the same escaping renderer as the server, so it is safe to inject.
 */
export function ReviewEditor({
  id,
  name,
  defaultValue = "",
  dir = "ltr",
  lang,
  invalid,
}: ReviewEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [preview, setPreview] = useState(false);

  // Event handler only: reads the textarea selection when a toolbar button is clicked.
  function applyTool(kind: ToolKind) {
    const area = ref.current;
    if (!area) return;
    const { selectionStart: start, selectionEnd: end } = area;
    const replacement = formatSelection(kind, value.slice(start, end));
    setValue(value.slice(0, start) + replacement + value.slice(end));
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(start, start + replacement.length);
    });
  }

  return (
    <div className="flex flex-col border border-sand-200 bg-white focus-within:border-mocha">
      <div
        className="flex items-center justify-between gap-2 border-b border-sand-200 px-2 py-1.5"
        dir="ltr"
      >
        <div className="flex gap-1" role="toolbar" aria-label="Formatting">
          {TOOLS.map((tool) => (
            <button
              key={tool.label}
              type="button"
              aria-label={tool.label}
              title={tool.label}
              disabled={preview}
              onClick={() => applyTool(tool.kind)}
              className={cn(
                "px-2.5 py-1 text-xs text-mocha transition-colors hover:bg-sand-100 disabled:opacity-40",
                tool.short === "B" && "font-bold",
              )}
            >
              {tool.short}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPreview((p) => !p)}
          aria-pressed={preview}
          className="px-2.5 py-1 text-xs text-sand-700 hover:text-mocha"
        >
          {preview ? "Edit" : "Preview"}
        </button>
      </div>
      <textarea
        ref={ref}
        id={id}
        name={name}
        dir={dir}
        lang={lang}
        rows={7}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-invalid={invalid || undefined}
        className={cn(inputClass, "resize-y border-0", preview && "sr-only")}
      />
      {preview ? (
        <div
          dir={dir}
          lang={lang}
          className="prose-review min-h-40 px-3.5 py-2.5 text-[0.95rem] text-mocha"
          // Safe: renderReview escapes all text and emits only p/br/strong/ul/ol/li.
          dangerouslySetInnerHTML={{
            __html: renderReview(value) || "<p>Nothing to preview yet.</p>",
          }}
        />
      ) : null}
    </div>
  );
}
