"use client";

import { useFormStatus } from "react-dom";

/**
 * Submit button that shows a spinner and disables itself while the enclosing
 * form's server action is running. Must be rendered inside the <form>.
 */
export function PendingButton({
  children,
  pendingText,
  className,
  title,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  title?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      title={title}
      className={`inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60 ${className ?? ""}`}
    >
      {pending && (
        <svg className="size-3.5 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2z"
          />
        </svg>
      )}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
