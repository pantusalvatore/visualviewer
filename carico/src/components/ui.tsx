import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { Icon, type IconName } from "./icon";

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger" | "inverse";
type Size = "md" | "lg" | "sm";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:brightness-110 active:brightness-95",
  secondary: "bg-surface text-ink border border-line hover:bg-surface-2",
  ghost: "text-ink hover:bg-surface-2",
  danger: "bg-danger-soft text-danger hover:brightness-95",
  /** Per superfici scure (card "inchiostro"). */
  inverse: "border border-bg/25 text-bg hover:bg-bg/10",
};
const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5 rounded-lg",
  md: "h-11 px-4 text-[0.95rem] gap-2 rounded-xl",
  lg: "h-14 px-6 text-base gap-2.5 rounded-2xl",
};

export function buttonClass(variant: Variant = "secondary", size: Size = "md", extra?: string) {
  return cx(
    "inline-flex items-center justify-center font-semibold select-none transition disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
    VARIANTS[variant],
    SIZES[size],
    extra,
  );
}

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; icon?: IconName }) {
  return (
    <button type="button" className={buttonClass(variant, size, className)} {...props}>
      {icon && <Icon name={icon} size={size === "sm" ? 18 : 20} />}
      {children}
    </button>
  );
}

export function LinkButton({
  variant = "secondary",
  size = "md",
  icon,
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; icon?: IconName }) {
  return (
    <Link className={buttonClass(variant, size, className)} {...props}>
      {icon && <Icon name={icon} size={size === "sm" ? 18 : 20} />}
      {children}
    </Link>
  );
}

/** Bottone solo icona: richiede sempre un'etichetta accessibile. */
export function IconButton({
  icon,
  label,
  className,
  active,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-xl transition hover:bg-surface-2 disabled:opacity-40",
        active && "text-accent",
        className,
      )}
      {...props}
    >
      <Icon name={icon} filled={active && icon === "star"} />
    </button>
  );
}

export function Card({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div className={cx("rounded-2xl border border-line bg-surface", className)} {...props}>
      {children}
    </div>
  );
}

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "accent" | "ok"; className?: string }) {
  const tones = {
    neutral: "bg-surface-2 text-muted",
    accent: "bg-accent-soft text-accent",
    ok: "bg-ok-soft text-ok",
  };
  return (
    <span className={cx("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold", tones[tone], className)}>
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  eyebrow,
  back,
  actions,
  children,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-col gap-3">
      {back && (
        <Link href={back.href} className="-ml-1 inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
          <Icon name="back" size={18} />
          {back.label}
        </Link>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
          <h1 className="text-[1.75rem] leading-tight font-extrabold tracking-tight text-balance md:text-4xl">{title}</h1>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
      {children}
    </header>
  );
}

export function EmptyState({ icon, title, children, action }: { icon: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-surface-2 text-muted">
        <Icon name={icon} size={28} />
      </span>
      <h2 className="text-lg font-bold">{title}</h2>
      {children && <div className="max-w-sm text-sm text-muted">{children}</div>}
      {action}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="eyebrow">{children}</h2>
      {action}
    </div>
  );
}

const fieldBase =
  "w-full rounded-xl border border-line bg-surface px-3.5 text-base text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none aria-[invalid=true]:border-danger";

export const inputClass = cx(fieldBase, "h-12");
export const textareaClass = cx(fieldBase, "py-3 min-h-24");
export const selectClass = cx(fieldBase, "h-12 appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9");

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}

/** Gruppo di "pillole" selezionabili (radio o checkbox), grandi e facili da toccare. */
export function ChoiceChips<T extends string>({
  name,
  options,
  value,
  onChange,
  multiple,
  legend,
  error,
}: {
  name: string;
  legend: string;
  options: { value: T; label: string }[];
  value: T | T[];
  onChange: (value: T) => void;
  multiple?: boolean;
  error?: string;
}) {
  const selected = Array.isArray(value) ? value : [value];
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-sm font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const checked = selected.includes(o.value);
          return (
            <label
              key={o.value}
              className={cx(
                "inline-flex h-11 cursor-pointer items-center rounded-xl border px-4 text-sm font-semibold transition has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent",
                checked ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface hover:bg-surface-2",
              )}
            >
              <input
                type={multiple ? "checkbox" : "radio"}
                name={name}
                value={o.value}
                checked={checked}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              {o.label}
            </label>
          );
        })}
      </div>
      {error && (
        <p className="text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className={cx("relative", className)}>
      <select className={selectClass} {...props}>
        {children}
      </select>
      <Icon
        name="chevron"
        size={18}
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rotate-90 text-muted"
      />
    </div>
  );
}
