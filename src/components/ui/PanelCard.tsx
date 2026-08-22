import type { ReactNode } from 'react';

interface PanelCardProps {
  padded?: boolean;
  interactive?: boolean;
  className?: string;
  children: ReactNode;
}

/** Dark nested panel: off-black surface or hairline outline, 8px radius, zero shadow. */
export function PanelCard({ padded = true, interactive = false, className = '', children }: PanelCardProps) {
  const base = 'bg-off-black rounded-lg border border-hairline/60';
  const pad = padded ? 'p-6' : '';
  const inter = interactive
    ? 'transition-colors duration-200 hover:border-hairline cursor-pointer'
    : '';
  return <div className={`${base} ${pad} ${inter} ${className}`}>{children}</div>;
}
