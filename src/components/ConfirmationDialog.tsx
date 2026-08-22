import React from 'react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  type = "danger",
  onConfirm,
  onCancel
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  const getColorTheme = () => {
    switch (type) {
      case 'danger':
        return {
          bg: 'bg-error-container/15',
          text: 'text-error',
          border: 'border-error/20',
          accent: 'bg-status-urgent/15 hover:bg-status-urgent/25 text-status-urgent border border-status-urgent/40 focus:ring-status-urgent/50',
          icon: 'error'
        };
      case 'warning':
        return {
          bg: 'bg-status-warning/15',
          text: 'text-status-warning',
          border: 'border-status-warning/20',
          accent: 'bg-status-warning/15 hover:bg-status-warning/25 text-status-warning border border-status-warning/40 focus:ring-status-warning/50',
          icon: 'warning'
        };
      case 'info':
      default:
        return {
          bg: 'bg-primary/5',
          text: 'text-primary',
          border: 'border-primary/20',
          accent: 'bg-accent-green/15 hover:bg-accent-green/25 text-accent-green border border-accent-green/40 focus:ring-accent-green/50',
          icon: 'info'
        };
    }
  };

  const theme = getColorTheme();

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Backdrop with elegant blur */}
      <div 
        className="fixed inset-0 bg-primary/25 backdrop-blur-xs transition-opacity"
        onClick={onCancel}
      ></div>

      {/* Dialog box Panel */}
      <div className="relative w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 animate-sweep overflow-hidden z-10">
        
        {/* Top-Decoration Border row */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 ${type === 'danger' ? 'bg-error' : type === 'warning' ? 'bg-secondary' : 'bg-primary'}`}></div>
        
        <div className="flex gap-4 items-start mt-2">
          {/* Warning Icon Container */}
          <div className={`p-3 rounded-xl shrink-0 ${theme.bg} ${theme.border} border`}>
            <span className={`material-symbols-outlined text-2xl ${theme.text}`}>
              {theme.icon}
            </span>
          </div>

          <div className="flex-1 space-y-2">
            <h3 className="font-display font-black text-primary text-lg">
              {title}
            </h3>
            <p className="text-xs leading-relaxed text-on-surface-variant">
              {message}
            </p>
          </div>
        </div>

        {/* Buttons Action bar */}
        <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-outline-variant/30">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-outline-variant/70 hover:bg-surface-container hover:text-on-surface text-on-surface-variant font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          
          <button
            onClick={onConfirm}
            className={`px-5 py-2 font-bold text-xs rounded-full transition-all active:scale-[0.98] cursor-pointer min-h-[44px] ${theme.accent}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
