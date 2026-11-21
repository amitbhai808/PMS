import type { ComponentType, ReactNode } from "react";

type Icon = ComponentType<{ className?: string; size?: number }>;

export function OperatorPageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: Icon;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-ops-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <span className="mb-2 inline-flex items-center gap-2 rounded-full bg-pine-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-pine-600">
          <Icon size={13} /> {eyebrow}
        </span>
        <h1 className="m-0 text-2xl font-bold tracking-[-0.03em] text-ops-ink">{title}</h1>
        <p className="mt-1 text-sm text-ops-muted">{description}</p>
      </div>
      {action}
    </header>
  );
}

export function OperatorCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-ops-border bg-ops-surface p-5 shadow-[0_10px_30px_rgba(22,59,50,0.05)] md:p-6 ${className}`}>{children}</section>;
}

export function FormError({ children }: { children: ReactNode }) {
  return <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-status-danger/30 bg-status-danger-soft p-3 text-xs text-status-danger"><span className="mt-0.5 size-2 shrink-0 rounded-full bg-status-danger" />{children}</div>;
}
