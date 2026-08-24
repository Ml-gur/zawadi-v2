import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Drawer({ open, onClose, title, children }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-off-black-ink/65 backdrop-blur-sm animate-sweep"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute right-0 top-0 h-full w-full max-w-md bg-pure-white border-l border-ash overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-pure-white border-b border-ash px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-ed-sub font-medium text-off-black-ink tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="icon-btn inline-flex items-center justify-center rounded-full text-graphite hover:text-off-black-ink transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
