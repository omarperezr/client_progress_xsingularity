const INPUT =
  "w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500";

/** Success / error banner driven by the ?ok= and ?error= query params. */
export function Banner({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return (
    <p
      className={`mb-6 rounded-md px-4 py-3 text-sm ${
        error ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"
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
      <span className="mb-1 block text-sm font-medium text-zinc-300">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? undefined}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
        className={INPUT}
      />
      {hint && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
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
      <span className="mb-1 block text-sm font-medium text-zinc-300">{label}</span>
      <select name={name} defaultValue={defaultValue} className={INPUT}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
    >
      {children}
    </button>
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
    <details className="rounded-xl border border-red-900/60 bg-red-500/5 p-5">
      <summary className="cursor-pointer text-sm font-medium text-red-400">{summary}</summary>
      <p className="mt-3 text-sm text-zinc-400">{warning}</p>
      <div className="mt-3">{children}</div>
    </details>
  );
}

export function DangerButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500"
    >
      {children}
    </button>
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
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-400">{title}</h2>
      {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-1 text-xl font-semibold text-white">{value}</dd>
    </div>
  );
}
