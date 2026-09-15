/**
 * Cookie consent store.
 *
 * Defaults to *denied*: no analytics script may load until the visitor
 * actively opts in. That is the safer default for our audience — Kenya's Data
 * Protection Act 2019 and the EU GDPR both require prior consent for
 * non-essential cookies, and the site sets nothing but strictly-essential
 * cookies (session/auth) until a decision is recorded.
 *
 * The decision lives in localStorage under `techsari.consent.v1`. Bumping the
 * version key invalidates every stored decision, which is what you want when
 * the list of cookies or purposes changes.
 */

export type ConsentDecision = 'all' | 'essential';

export interface ConsentRecord {
  /** May we load analytics (Google Analytics, Vercel Analytics)? */
  analytics: boolean;
  /** Which affordance produced this record. */
  decision: ConsentDecision;
  /** ISO timestamp of the visitor's decision. */
  decidedAt: string;
}

const STORAGE_KEY = 'techsari.consent.v1';
const CHANGE_EVENT = 'techsari:consent-change';
const OPEN_SETTINGS_EVENT = 'techsari:open-cookie-settings';

function isConsentRecord(value: unknown): value is ConsentRecord {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ConsentRecord>;
  return typeof candidate.analytics === 'boolean' && typeof candidate.decidedAt === 'string';
}

/** The stored decision, or null when the visitor has not decided yet. */
export function readConsent(): ConsentRecord | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isConsentRecord(parsed) ? parsed : null;
  } catch {
    // Private mode, disabled storage, or malformed JSON — behave as undecided.
    return null;
  }
}

function writeConsent(record: ConsentRecord): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage unavailable: the choice still applies to this page session.
  }
  window.dispatchEvent(new CustomEvent<ConsentRecord>(CHANGE_EVENT, { detail: record }));
}

/** Record the visitor's choice and notify subscribers. */
export function saveConsent(decision: ConsentDecision): ConsentRecord {
  const record: ConsentRecord = {
    analytics: decision === 'all',
    decision,
    decidedAt: new Date().toISOString(),
  };
  writeConsent(record);
  return record;
}

/** Forget the decision so the banner is shown again. */
export function clearConsent(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing else we can do */
  }
  window.dispatchEvent(new CustomEvent<ConsentRecord | null>(CHANGE_EVENT, { detail: null }));
}

/** True only when the visitor has explicitly allowed analytics. */
export function analyticsAllowed(): boolean {
  return readConsent()?.analytics === true;
}

/** Subscribe to consent changes. Returns an unsubscribe function. */
export function subscribeConsent(listener: (record: ConsentRecord | null) => void): () => void {
  const handler = (event: Event) => {
    listener((event as CustomEvent<ConsentRecord | null>).detail ?? readConsent());
  };
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}

/** Re-open the banner (for a "Cookie settings" link in the footer). */
export function openCookieSettings(): void {
  window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT));
}

/** Listen for requests to re-open the banner. Returns an unsubscribe function. */
export function onOpenCookieSettings(listener: () => void): () => void {
  window.addEventListener(OPEN_SETTINGS_EVENT, listener);
  return () => window.removeEventListener(OPEN_SETTINGS_EVENT, listener);
}
