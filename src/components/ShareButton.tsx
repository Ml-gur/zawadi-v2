import { useState, useCallback, type MouseEvent as ReactMouseEvent } from 'react';
import { Share2, Check } from 'lucide-react';

interface ShareButtonProps {
  url: string;
  title?: string;
  className?: string;
  iconOnly?: boolean;
  size?: 'sm' | 'md';
  /** 'dark' suits dark surfaces, 'light' suits white/parchment cards */
  tone?: 'dark' | 'light';
}

export default function ShareButton({ url, title, className = '', iconOnly, size = 'sm', tone = 'dark' }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async (e: ReactMouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const shareUrl = url.startsWith('http') ? url : `https://www.techsari.online${url}`;
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

  const sizeClasses = size === 'md' ? 'w-11 h-11 rounded-lg' : 'w-10 h-10 rounded-lg';

  const toneClasses = tone === 'light'
    ? `${copied ? 'bg-mist text-ed-error' : 'bg-pure-white border border-ash text-graphite hover:border-off-black-ink hover:text-off-black-ink'}`
    : `${copied ? 'bg-success/15 text-success' : 'bg-off-black text-muted/60 hover:bg-primary/10 hover:text-primary'}`;

  return (
    <button
      onClick={handleShare}
      className={`inline-flex items-center justify-center transition-all cursor-pointer select-none
        ${iconOnly ? `${sizeClasses} ${toneClasses}` : `gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg ${toneClasses}`}
        active:scale-95 ${className}`}
      title={copied ? 'Link copied!' : `Share ${title || 'this scholarship'}`}
      aria-label={copied ? 'Link copied!' : `Share ${title || 'this scholarship'}`}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
      {!iconOnly && <span>{copied ? 'Copied' : 'Share'}</span>}
    </button>
  );
}
