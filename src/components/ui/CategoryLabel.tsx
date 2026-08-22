import type { ReactNode } from 'react';
import type { CategoryDomain } from './categoryColors';
import { domainClasses } from './categoryColors';

export type { CategoryDomain } from './categoryColors';

interface CategoryLabelProps {
  domain: CategoryDomain;
  children: ReactNode;
  className?: string;
}

/** Single-word section anchor rendered in its locked domain hue. */
export function CategoryLabel({ domain, children, className = '' }: CategoryLabelProps) {
  return (
    <span className={`font-semibold ${domainClasses[domain]} ${className}`}>
      {children}
    </span>
  );
}
