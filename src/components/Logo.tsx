/**
 * Zawadi brand mark — "gift in a vault".
 *
 * Construction: a rounded-square vault frame; the Z is cut so its
 * final stroke reads as a forward arrow (progress toward funding);
 * the accent dot at the arrow's tip is the gift — the one green
 * signal in an otherwise cream-on-dark system.
 */
export function Logo({ size = 36, withGlow = false }: { size?: number; withGlow?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Zawadi logo"
      style={withGlow ? { filter: 'drop-shadow(0 0 0 rgba(10,228,72,0))' } : undefined}
    >
      <rect x="4" y="4" width="56" height="56" rx="16" fill="none" stroke="#fffce1" strokeWidth={3} />
      <path d="M20 20 H44 L24 40 H46" fill="none" stroke="#fffce1" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="47" cy="47" r={5} fill="#0ae448" />
    </svg>
  );
}
