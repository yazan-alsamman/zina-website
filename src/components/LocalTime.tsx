"use client";

import { useSyncExternalStore } from "react";

const noSubscription = () => () => {};

/**
 * A timestamp in the viewer's own time zone. Dates are stored and sent as UTC; the server (which
 * cannot know the viewer's zone) renders UTC, marked as such, and the browser switches to local
 * time right after hydration. useSyncExternalStore makes that switch without a hydration
 * mismatch.
 */
export function LocalTime({
  value,
  locale = "en-GB",
  options = { dateStyle: "medium", timeStyle: "short" },
  className,
  utcLabel = true,
}: {
  /** ISO 8601 timestamp */
  value: string;
  locale?: string;
  options?: Intl.DateTimeFormatOptions;
  className?: string;
  /** Mark the server-rendered (pre-hydration) value as UTC; off for plain dates in lists. */
  utcLabel?: boolean;
}) {
  const text = useSyncExternalStore(
    noSubscription,
    () => format(value, locale, options),
    () => `${format(value, locale, { ...options, timeZone: "UTC" })}${utcLabel ? " UTC" : ""}`,
  );

  return (
    <time dateTime={value} className={className}>
      {text}
    </time>
  );
}

function format(value: string, locale: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale, options).format(new Date(value));
}
