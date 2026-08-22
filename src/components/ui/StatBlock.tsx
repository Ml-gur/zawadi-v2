import type { ReactNode } from 'react';
import type { CategoryDomain } from './CategoryLabel';
import { domainClasses } from './categoryColors';

interface StatBlockProps {
  value: ReactNode;
  label: string;
  tone?: CategoryDomain;
  className?: string;
}

/** Display stat with tabular mono numerals and a muted label. */
export function StatBlock({ value, label, tone = 'brand', className = '' }: StatBlockProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className={`font-mono text-3xl md:text-4xl font-medium tracking-tight tabular-nums ${domainClasses[tone]}`}>
        {value}
      </span>
      <span className="text-sm text-muted">{label}</span>
    </div>
  );
}
