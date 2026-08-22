import type { ReactNode } from 'react';

interface SectionShellProps {
  eyebrow?: string;
  title?: ReactNode;
  lead?: ReactNode;
  divider?: boolean;
  id?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Standard section container: 1280px max-width, curly-bracket eyebrow,
 * optional title/lead stack, hairline divider rhythm, responsive padding.
 */
export function SectionShell({ eyebrow, title, lead, divider = false, id, className = '', children }: SectionShellProps) {
  return (
    <section id={id} className={`${divider ? 'hairline' : ''} ${className}`}>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-16 md:py-20">
        {eyebrow && (
          <p className="text-base md:text-lg text-cream font-normal mb-4">
            {'{'} {eyebrow} {'}'}
          </p>
        )}
        {title && (
          <h2 className="text-subheading md:text-heading font-semibold text-cream tracking-tight max-w-[20ch]">
            {title}
          </h2>
        )}
        {lead && <p className="text-body-lg text-muted mt-4 max-w-[60ch]">{lead}</p>}
        <div className="mt-8 md:mt-12">{children}</div>
      </div>
    </section>
  );
}
