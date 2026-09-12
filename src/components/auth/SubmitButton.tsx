"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

/** The single filled action on an auth screen. */
export function SubmitButton({
  pending,
  label,
  pendingLabel,
  /** Unavailable for a reason other than an in-flight submit (e.g. a cooldown). */
  disabled = false,
  className,
}: {
  pending: boolean;
  label: string;
  pendingLabel: string;
  disabled?: boolean;
  className?: string;
}) {
  const inert = pending || disabled;

  return (
    <button
      type="submit"
      disabled={inert}
      className={cn(
        "inline-flex h-14 items-center justify-center gap-2 rounded-full bg-ink text-xs font-semibold uppercase tracking-[0.2em] text-cream transition-transform",
        inert ? "opacity-70" : "hover:scale-[1.01] active:scale-[0.99]",
        className,
      )}
    >
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {pending ? pendingLabel : label}
    </button>
  );
}
