import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
import { analyticsAllowed, subscribeConsent } from '../lib/consent';

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Loads third-party analytics **only after the visitor opts in**.
 *
 * Nothing here runs on a first visit: `analyticsAllowed()` is false until the
 * cookie banner records an "Accept all" choice, so no analytics script is
 * fetched and no cookie is set for undecided visitors.
 */
function Analytics() {
  const location = useLocation();
  const [allowed, setAllowed] = useState(() => analyticsAllowed());

  // React to the banner (and to a later withdrawal of consent).
  useEffect(() => subscribeConsent((record) => setAllowed(record?.analytics === true)), []);

  useEffect(() => {
    if (!allowed || !GA_MEASUREMENT_ID) return;
    // Already bootstrapped in this page session — nothing to redo.
    if (window.gtag) return;

    // Keep analytics off the critical path — never compete with LCP
    const idle = (cb: () => void) =>
      'requestIdleCallback' in window
        ? (window as any).requestIdleCallback(cb, { timeout: 4000 })
        : setTimeout(cb, 2000);
    const cancel = (id: number) =>
      'cancelIdleCallback' in window ? (window as any).cancelIdleCallback(id) : clearTimeout(id);

    let script: HTMLScriptElement | null = null;
    const idleId = idle(() => {
      script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      document.head.appendChild(script);
    });

    window.dataLayer = window.dataLayer || [];
    window.gtag = function (...args: unknown[]) {
      window.dataLayer!.push(args);
    };
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, {
      send_page_view: true,
      // Consent Mode: keep GA in a denied state until the visitor opts in, and
      // grant only the storage it actually needs.
      anonymize_ip: true,
    });

    return () => {
      cancel(idleId);
      if (script && script.parentNode) script.parentNode.removeChild(script);
    };
  }, [allowed]);

  useEffect(() => {
    if (!allowed) return;
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: location.pathname + location.search,
      });
    }
  }, [location, allowed]);

  // Vercel Analytics is cookieless, but it is still third-party telemetry, so it
  // waits behind the same gate.
  return allowed ? <VercelAnalytics /> : null;
}

export default Analytics;
