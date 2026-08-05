import { PendingButton } from "./PendingButton";

/** Success / error banner driven by the ?ok= and ?error= query params. */
export function Banner({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return (
    <p
      className={`mb-6 border px-4 py-3 text-sm font-medium ${
        error
          ? "border-exception bg-exception/5 text-exception"
          : "border-delivered bg-delivered/5 text-delivered"
      }`}
    >
      {error ?? ok}
    </p>
  );
}

export function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required = false,
  placeholder,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  type?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="label-caps mb-1 block text-[11px] text-ink-soft">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? undefined}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
        className="input"
      />
      {hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}

export function SelectField({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="label-caps mb-1 block text-[11px] text-ink-soft">{label}</span>
      <select name={name} defaultValue={defaultValue} className="input">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SubmitButton({
  children,
  pendingText,
}: {
  children: React.ReactNode;
  pendingText?: string;
}) {
  return (
    <PendingButton pendingText={pendingText} className="btn btn-primary px-4 py-2 text-xs">
      {children}
    </PendingButton>
  );
}

/**
 * Destructive action hidden behind a disclosure, so a delete always takes a
 * deliberate second click.
 */
export function DangerZone({
  summary,
  warning,
  children,
}: {
  summary: string;
  warning: string;
  children: React.ReactNode;
}) {
  return (
    <details className="border border-exception bg-sheet p-5">
      <summary className="label-caps cursor-pointer text-xs text-exception">{summary}</summary>
      <p className="mt-3 text-sm text-ink-soft">{warning}</p>
      <div className="mt-3">{children}</div>
    </details>
  );
}

export function DangerButton({ children }: { children: React.ReactNode }) {
  return (
    <PendingButton pendingText="Deleting…" className="btn btn-void px-4 py-2 text-xs">
      {children}
    </PendingButton>
  );
}

export function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="sheet p-5">
      <h2 className="label-caps border-b border-rule pb-2 text-xs text-ink">{title}</h2>
      {description && <p className="mt-2 text-sm text-ink-soft">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`bg-sheet px-3 py-2.5 ${className}`}>
      <dt className="label-caps text-[10px] text-ink-soft">{label}</dt>
      <dd className="mt-0.5 font-mono text-lg font-semibold leading-tight text-ink">{value}</dd>
    </div>
  );
}
