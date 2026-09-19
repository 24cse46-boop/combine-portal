import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

export function cn(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  const base =
    "inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-teal text-paper hover:bg-teal-dark",
    secondary: "border border-hairline text-ink hover:border-teal hover:text-teal",
    ghost: "text-ink-muted hover:text-ink",
  };
  return <button className={cn(base, variants[variant], className)} {...props} />;
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "border border-hairline bg-panel px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-teal",
        props.className
      )}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "border border-hairline bg-panel px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-teal",
        props.className
      )}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "border border-hairline bg-panel px-3.5 py-2.5 text-sm text-ink focus:border-teal",
        props.className
      )}
    />
  );
}

export function Checkbox({
  label,
  name,
  defaultChecked,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 border border-hairline accent-teal"
      />
      {label}
    </label>
  );
}

export function ErrorNote({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="border border-danger bg-danger-bg px-4 py-2.5 text-sm text-danger mb-6">
      {message}
    </p>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("border border-hairline bg-panel", className)}>{children}</div>
  );
}

export function StatusPill({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "danger" | "amber";
  children: ReactNode;
}) {
  const tones = {
    neutral: "text-ink-muted border-hairline",
    success: "text-success border-success bg-success-bg",
    danger: "text-danger border-danger bg-danger-bg",
    amber: "text-amber-dark border-amber",
  };
  return (
    <span className={cn("status-pill", tones[tone])}>{children}</span>
  );
}
