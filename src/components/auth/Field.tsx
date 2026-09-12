"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

/** Styling shared by every input on an auth screen. */
const INPUT =
  "h-14 w-full rounded-md border border-border bg-card text-base text-ink outline-none transition-colors focus:border-tan-deep focus:ring-2 focus:ring-ring/25";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  /** Validation message from the server action, shown under the input. */
  error?: string;
};

export function Field({ label, error, ...input }: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-faint">
        {label}
      </span>
      <input
        {...input}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={`mt-2 px-5 ${INPUT}`}
      />
      {error && (
        <span id={errorId} className="mt-1.5 block text-sm text-ink-soft">
          {error}
        </span>
      )}
    </label>
  );
}

/**
 * A password input with a reveal toggle.
 *
 * The toggle is `type="button"` on purpose: inside a form, a button with no type
 * submits, so leaving it off would send the form every time someone tried to
 * check what they had typed.
 */
export function PasswordField({ label, error, ...input }: FieldProps) {
  const { t } = useI18n();
  const [revealed, setRevealed] = useState(false);
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-faint">
        {label}
      </span>
      <span className="relative mt-2 block">
        <input
          {...input}
          id={id}
          type={revealed ? "text" : "password"}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`pl-5 pr-14 ${INPUT}`}
        />
        <button
          type="button"
          onClick={() => setRevealed((shown) => !shown)}
          aria-label={revealed ? t.auth.hidePassword : t.auth.showPassword}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-faint transition-colors hover:text-ink"
        >
          {revealed ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </span>
      {error && (
        <span id={errorId} className="mt-1.5 block text-sm text-ink-soft">
          {error}
        </span>
      )}
    </label>
  );
}
