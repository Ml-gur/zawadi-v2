import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X } from 'lucide-react';
import {
  clearConsent,
  onOpenCookieSettings,
  readConsent,
  saveConsent,
  type ConsentDecision,
  type ConsentRecord,
} from '../lib/consent';

/**
 * Cookie consent banner.
 *
 * Shows once, on first visit, and again whenever the visitor asks for it via a
 * "Cookie settings" link (see LandingFooter) — which is what makes the choice
 * genuinely withdrawable rather than one-shot.
 *
 * Analytics stays off until "Accept all" is chosen, so the banner is a real
 * gate, not a notice.
 */
export default function CookieConsent() {
  const [record, setRecord] = useState<ConsentRecord | null>(() => readConsent());
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const acceptRef = useRef<HTMLButtonElement>(null);

  // Undecided visitors get the banner immediately; everyone else only sees it
  // again when they request the settings.
  useEffect(() => {
    if (record === null) setIsOpen(true);
  }, [record]);

  useEffect(
    () =>
      onOpenCookieSettings(() => {
        setIsOpen(true);
      }),
    [],
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    // Only steal focus when re-opened deliberately; on first load the banner
    // should not interrupt someone already reading the page.
    if (record !== null) acceptRef.current?.focus();
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, record]);

  const decide = useCallback((decision: ConsentDecision) => {
    setRecord(saveConsent(decision));
    setIsOpen(false);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-3 sm:px-4 sm:pb-4"
    >
      <div className="mx-auto max-w-[1200px] rounded-ed border border-ash bg-off-black-ink text-pure-white shadow-[0_-8px_40px_rgba(20,20,15,0.28)]">
        <div className="flex flex-col gap-5 p-5 sm:p-6 md:flex-row md:items-center md:justify-between md:gap-8">
          <div className="flex items-start gap-4">
            <span
              className="hidden sm:inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-electric-lime"
              aria-hidden
            >
              <Cookie className="h-5 w-5 text-off-black-ink" strokeWidth={1.75} />
            </span>
            <div className="max-w-[62ch]">
              <h2 className="text-ed-body font-medium tracking-tight text-pure-white">
                Cookies on Techsari
              </h2>
              <p className="mt-1.5 text-ed-body-sm text-smoke">
                We use essential cookies to keep you signed in and to secure the site. With your
                permission we also use analytics cookies to see which scholarships people find
                useful. We never sell your data.{' '}
                <Link
                  to="/privacy"
                  className="text-electric-lime underline decoration-electric-lime/40 underline-offset-4 hover:decoration-electric-lime"
                >
                  Privacy Policy
                </Link>
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-2.5 sm:flex-row sm:items-center">
            {record !== null && (
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close cookie settings"
                className="order-first self-end rounded-full p-2 text-smoke transition-colors hover:text-pure-white sm:order-none sm:self-auto"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
            <button
              type="button"
              onClick={() => decide('essential')}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-smoke/60 px-6 text-ed-body-sm font-medium text-pure-white transition-colors hover:border-pure-white hover:bg-pure-white/10 cursor-pointer"
            >
              Essential only
            </button>
            <button
              ref={acceptRef}
              type="button"
              onClick={() => decide('all')}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-electric-lime px-6 text-ed-body-sm font-medium text-off-black-ink transition-colors hover:bg-lime-hover active:scale-[0.98] cursor-pointer"
            >
              Accept all
            </button>
          </div>
        </div>

        {record !== null && (
          <div className="border-t border-white/10 px-5 py-3 sm:px-6">
            <p className="text-ed-caption text-stone">
              Current choice:{' '}
              <span className="font-medium text-pure-white">
                {record.analytics ? 'Essential + analytics' : 'Essential only'}
              </span>
              {record.decidedAt ? ` · set ${new Date(record.decidedAt).toLocaleDateString()}` : ''}
              {' · '}
              <button
                type="button"
                onClick={() => {
                  clearConsent();
                  setIsOpen(false);
                }}
                className="underline decoration-stone/50 underline-offset-4 hover:text-pure-white cursor-pointer"
              >
                Withdraw my choice
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
