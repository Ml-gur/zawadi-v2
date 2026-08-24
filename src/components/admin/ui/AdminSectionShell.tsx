import type { ReactNode } from 'react';

interface AdminSectionShellProps {
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function AdminSectionShell({ title, description, actions, children }: AdminSectionShellProps) {
  return (
    <section className="animate-sweep">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
        <div>
          <h2 className="text-ed-h2 font-medium text-off-black-ink tracking-tight">{title}</h2>
          <p className="mt-1 text-ed-body-sm text-graphite max-w-[60ch]">{description}</p>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
