#!/usr/bin/env node
/**
 * Generates the Open Graph / Twitter social cards.
 *
 * Why this exists (and why the filenames changed):
 *   The previous cards were built on the retired navy/mint palette (#001736 /
 *   #6cf8bb) from before the editorial rebrand, so a shared link previewed as a
 *   picture of an older site. The cards are now derived from the same tokens as
 *   src/index.css.
 *
 *   Social crawlers (WhatsApp, Facebook, X) cache a card by its *URL*, so
 *   replacing the bytes behind an unchanged URL changes nothing for them. Every
 *   card is therefore written to a versioned filename (`og-home-v2.png`). When
 *   the art changes again, bump VERSION and update the `-vN` references in
 *   index.html / src/components/SEO.tsx / the per-page <SEO image=...> props.
 *
 * Usage: npm run generate:og
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

// Bump to invalidate social caches. References use `og-<name>-v${VERSION}.png`.
const VERSION = 2;

const OUT_DIR = 'public';
const WIDTH = 1200;
const HEIGHT = 630;

// ── Brand tokens — keep in sync with src/index.css ──────────────────
const C = {
  ink: '#14140f',
  parchment: '#f5f5eb',
  lime: '#beff50',
  ash: '#d2d2c8',
  graphite: '#6e6e64',
  stone: '#919183',
};

const FONT = "Inter Tight, Arial, Helvetica, sans-serif";

// ── Per-card copy ───────────────────────────────────────────────────
const CARDS = {
  home: {
    tag: 'Scholarships for African students',
    title: 'Find scholarships you actually qualify for.',
    subtitle:
      'Eligibility-first matching across 54 African countries, with no-IELTS options included.',
  },
  scholarships: {
    tag: 'Verified listings',
    title: 'Scholarships open to African students',
    subtitle:
      'Every listing is checked for real eligibility and an active deadline before it appears.',
  },
  about: {
    tag: 'About Techsari',
    title: 'Built for African students',
    subtitle:
      "We read each listing's actual requirements and match them to your profile. We never sell student data.",
  },
  faq: {
    tag: 'Frequently asked',
    title: 'Scholarship questions, answered',
    subtitle:
      'IELTS alternatives, eligibility rules, deadlines and how the matching engine decides.',
  },
  'how-it-works': {
    tag: 'How it works',
    title: 'From profile to submitted application',
    subtitle:
      'Match, prepare and apply with AI drafting plus human mentor review at every stage.',
  },
  image: {
    tag: 'Techsari',
    title: 'Scholarship matching for African students',
    subtitle: 'Discover funding you qualify for, track deadlines, and apply with confidence.',
  },
};

// ── Helpers ─────────────────────────────────────────────────────────
function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Naive greedy wrap. SVG has no text wrapping, so we measure with an average
 * glyph-width ratio per weight and break on word boundaries.
 */
function wrap(text, maxWidthPx, fontSize, weight) {
  const charWidth = fontSize * (weight >= 600 ? 0.545 : 0.5);
  const maxChars = Math.max(8, Math.floor(maxWidthPx / charWidth));
  const lines = [];
  let current = '';

  for (const word of String(text).split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function renderSvg({ tag, title, subtitle }) {
  const pad = 80;
  const contentWidth = WIDTH - pad * 2;

  const titleSize = 66;
  const titleLineHeight = titleSize * 1.14;
  const titleLines = wrap(title, contentWidth, titleSize, 600);

  const subSize = 27;
  const subLineHeight = subSize * 1.45;
  const subLines = wrap(subtitle, contentWidth - 40, subSize, 400);

  // Vertical rhythm: logo → tag chip → headline → rule → subtitle.
  const logoY = 74;
  const tagY = logoY + 46 + 74;
  const titleTop = tagY + 66;
  const ruleY = titleTop + titleLines.length * titleLineHeight + 12;
  const subTop = ruleY + 48;

  const titleTspans = titleLines
    .map(
      (line, i) =>
        `<tspan x="${pad}" y="${titleTop + i * titleLineHeight}">${escapeXml(line)}</tspan>`,
    )
    .join('');

  const subTspans = subLines
    .map(
      (line, i) =>
        `<tspan x="${pad}" y="${subTop + i * subLineHeight}">${escapeXml(line)}</tspan>`,
    )
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <radialGradient id="glow" cx="88%" cy="8%" r="72%">
      <stop offset="0%" stop-color="${C.lime}" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="${C.lime}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="mark" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${C.lime}"/>
      <stop offset="100%" stop-color="#aef53d"/>
    </linearGradient>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="${C.ink}"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>

  <!-- Hairline frame -->
  <rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${HEIGHT - 1}"
        fill="none" stroke="${C.parchment}" stroke-opacity="0.10"/>

  <!-- Logo lockup -->
  <g transform="translate(${pad}, ${logoY})">
    <rect width="46" height="46" rx="13" fill="url(#mark)"/>
    <text x="23" y="32" font-family="${FONT}" font-size="26" font-weight="700"
          fill="${C.ink}" text-anchor="middle">T</text>
    <text x="62" y="31" font-family="${FONT}" font-size="27" font-weight="600"
          fill="${C.parchment}" letter-spacing="-0.5">Techsari</text>
  </g>

  <!-- Category chip -->
  <g transform="translate(${pad}, ${tagY})">
    <rect width="${Math.round(tag.length * 8.4) + 40}" height="38" rx="19"
          fill="${C.lime}" fill-opacity="0.12" stroke="${C.lime}" stroke-opacity="0.32"/>
    <circle cx="21" cy="19" r="4" fill="${C.lime}"/>
    <text x="38" y="25" font-family="${FONT}" font-size="16" font-weight="500"
          fill="${C.lime}">${escapeXml(tag)}</text>
  </g>

  <!-- Headline -->
  <text font-family="${FONT}" font-size="${titleSize}" font-weight="600"
        fill="${C.parchment}" letter-spacing="-1.6">${titleTspans}</text>

  <!-- Accent rule -->
  <rect x="${pad}" y="${ruleY}" width="88" height="5" rx="2.5" fill="${C.lime}"/>

  <!-- Subtitle -->
  <text font-family="${FONT}" font-size="${subSize}" font-weight="400"
        fill="${C.parchment}" fill-opacity="0.62">${subTspans}</text>

  <!-- Footer -->
  <text x="${pad}" y="${HEIGHT - 52}" font-family="${FONT}" font-size="21" font-weight="500"
        fill="${C.lime}">www.techsari.online</text>
  <text x="${WIDTH - pad}" y="${HEIGHT - 52}" font-family="${FONT}" font-size="18"
        fill="${C.parchment}" fill-opacity="0.38" text-anchor="end">Eligibility-checked. Never sold.</text>
</svg>
`;
}

// ── Build ───────────────────────────────────────────────────────────
fs.mkdirSync(OUT_DIR, { recursive: true });

let failures = 0;

for (const [name, content] of Object.entries(CARDS)) {
  const svg = renderSvg(content);
  const svgPath = path.join(OUT_DIR, `og-${name}-v${VERSION}.svg`);
  const pngPath = path.join(OUT_DIR, `og-${name}-v${VERSION}.png`);

  fs.writeFileSync(svgPath, svg);

  const png = await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9 })
    .toBuffer();

  // Guard against a silent font-less render: a card with no legible text
  // compresses to almost nothing and has a near-uniform colour histogram.
  const stats = await sharp(png).stats();
  const variance = Math.max(...stats.channels.map((c) => c.stdev));
  if (variance < 5) {
    failures += 1;
    console.error(
      `FAIL ${pngPath} — image looks blank (stdev=${variance.toFixed(2)}). Are fonts available?`,
    );
    continue;
  }

  fs.writeFileSync(pngPath, png);
  const meta = await sharp(png).metadata();
  console.log(
    `OK   ${pngPath}  ${meta.width}x${meta.height}  ${(png.length / 1024).toFixed(1)}kB  stdev=${variance.toFixed(1)}`,
  );
}

if (failures) {
  console.error(`\n${failures} card(s) failed to render.`);
  process.exit(1);
}
console.log('\nAll social cards regenerated.');
