import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'outline' | 'gradient';
type Size = 'sm' | 'md' | 'lg';

export interface GhostPillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  children: ReactNode;
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm min-h-[40px]',
  md: 'px-6 py-2.5 text-lg min-h-[48px]',
  lg: 'px-8 py-3 text-xl min-h-[52px]',
};

export const GhostPillButton = forwardRef<HTMLButtonElement, GhostPillButtonProps>(
  ({ variant = 'outline', size = 'md', fullWidth = false, className = '', children, ...rest }, ref) => {
    const base =
      'inline-flex items-center justify-center gap-2 rounded-full font-semibold leading-[1.05] cursor-pointer select-none '
      + 'transition-all duration-200 ease-out active:scale-[0.98] active:translate-y-px '
      + 'disabled:opacity-40 disabled:pointer-events-none '
      + 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ';
    const variantClasses =
      variant === 'gradient'
        ? 'btn-gradient-stroke text-cream hover:brightness-110'
        : 'bg-transparent border border-cream/60 text-cream hover:border-cream hover:bg-cream/[0.04]';
    const widthClass = fullWidth ? 'w-full' : '';
    return (
      <button
        ref={ref}
        className={`${base} ${variantClasses} ${sizeClasses[size]} ${widthClass} ${className}`}
        {...rest}
      >
        {children}
      </button>
    );
  }
);

GhostPillButton.displayName = 'GhostPillButton';
