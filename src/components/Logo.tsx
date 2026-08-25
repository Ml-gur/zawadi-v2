/**
 * Techsari brand mark — "gift in a vault".
 *
 * Construction: a rounded-square vault frame; the Z is cut so its
 * final stroke reads as a forward arrow (progress toward funding);
 * the accent dot at the arrow's tip is the gift — the one lime
 * signal in an otherwise ink-on-paper system.
 */

const TONES = {
  light: '#fffce1',
  dark: '#14140f',
} as const;

export function Logo({ size = 36, withGlow = false, tone = 'light' }: { size?: number; withGlow?: boolean; tone?: keyof typeof TONES }) {
  const stroke = TONES[tone];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Techsari logo"
      style={withGlow ? { filter: 'drop-shadow(0 0 0 rgba(10,228,72,0))' } : undefined}
    >
      <rect x="4" y="4" width="56" height="56" rx="16" fill="none" stroke={stroke} strokeWidth={3} />
      <path d="M20 20 H44 L24 40 H46" fill="none" stroke={stroke} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="47" cy="47" r={5} fill="#beff50" />
    </svg>
  );
}
