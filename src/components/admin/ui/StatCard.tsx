import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  hint?: string;
  icon?: LucideIcon;
  onClick?: () => void;
}

export function StatCard({ label, value, delta, deltaLabel, hint, icon: Icon, onClick }: StatCardProps) {
  const interactive = Boolean(onClick);
  const showDelta = typeof delta === 'number' && Number.isFinite(delta);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      className={`w-full text-left bg-pure-white border border-ash rounded-ed p-5 transition-colors ${
        interactive ? 'cursor-pointer hover:border-graphite' : 'cursor-default'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-ed-eyebrow uppercase text-graphite">{label}</span>
        {Icon && (
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-parchment shrink-0" aria-hidden>
            <Icon className="w-4 h-4 text-off-black-ink" strokeWidth={1.5} />
          </span>
        )}
      </div>
      <p className="mt-3 text-ed-h2 font-medium text-off-black-ink tabular-nums tracking-tight">{value}</p>
      <div className="mt-1 flex items-center gap-2 text-ed-caption tracking-normal">
        {showDelta && (
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded-full font-medium ${
              delta >= 0 ? 'bg-electric-lime text-off-black-ink' : 'bg-error/10 text-error'
            }`}
          >
            {delta >= 0 ? '+' : ''}{delta}
          </span>
        )}
        <span className="text-graphite">{deltaLabel || hint}</span>
      </div>
    </button>
  );
}
