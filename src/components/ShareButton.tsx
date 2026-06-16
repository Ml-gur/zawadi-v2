import { useState, useCallback } from 'react';
import { Share2, Check } from 'lucide-react';

interface ShareButtonProps {
  url: string;
  title?: string;
  className?: string;
  iconOnly?: boolean;
  size?: 'sm' | 'md';
}

export default function ShareButton({ url, title, className = '', iconOnly, size = 'sm' }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const shareUrl = url.startsWith('http') ? url : `https://techsari.online${url}`;
    if (navigator.share && window.innerWidth < 768) {
      try { await navigator.share({ url: shareUrl, title }); return; }
      catch { /* fall through to clipboard */ }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [url, title]);

  const sizeClasses = size === 'md' ? 'w-8 h-8 rounded-xl' : 'w-7 h-7 rounded-lg';

  return (
    <button
      onClick={handleShare}
      className={`inline-flex items-center justify-center transition-all cursor-pointer select-none
        ${iconOnly
          ? `${sizeClasses} ${copied ? 'bg-success/15 text-success' : 'bg-surface-container-high text-on-surface-variant/60 hover:bg-primary/10 hover:text-primary'}`
          : `gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl ${copied ? 'bg-success/15 text-success' : 'bg-surface-container-high text-on-surface-variant/60 hover:bg-primary/10 hover:text-primary'}`
        }
        active:scale-95 ${className}`}
      title={copied ? 'Link copied!' : `Share ${title || 'this scholarship'}`}
      aria-label={copied ? 'Link copied!' : `Share ${title || 'this scholarship'}`}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
      {!iconOnly && <span>{copied ? 'Copied' : 'Share'}</span>}
    </button>
  );
}
