# Zawadi v2 — Design System

**Document Version:** 3.0 (Rebuild)
**Date:** May 27, 2026
**Author:** Techsari Product Team
**Status:** Active — Spec-Driven Development

---

## 1. Brand Identity

### 1.1 Name
**Zawadi** — Swahili for "gift." Pronounced "za-WA-dee."

### 1.2 Tagline
"Your scholarship journey, from discovery to acceptance — all in one place."

### 1.3 Brand Personality
- **Trustworthy:** Students depend on us for accurate information
- **Empowering:** We give students tools they didn't have before
- **African:** Rooted in African identity, built for African students
- **Modern:** Clean, professional, AI-powered
- **Accessible:** Works on any device, any connection speed

---

## 2. Color System

### 2.1 Primary Palette (Green — Growth, Opportunity, Africa)

| Token | Hex | Usage |
|---|---|---|
| `--green-50` | `#f0fdf4` | Light backgrounds |
| `--green-100` | `#dcfce7` | Hover states, badges |
| `--green-200` | `#bbf7d0` | Selected states |
| `--green-500` | `#22c55e` | Success indicators |
| `--green-600` | `#16a34a` | Interactive elements |
| `--green-700` | `#15803d` | Primary CTAs, links |
| `--green-800` | `#0f6e56` | **Brand primary** — headers, logo |
| `--green-900` | `#14532d` | Dark backgrounds |

### 2.2 Neutral Palette

| Token | Hex | Usage |
|---|---|---|
| `--gray-50` | `#f8fafc` | Page background |
| `--gray-100` | `#f1f5f9` | Card backgrounds |
| `--gray-200` | `#e2e8f0` | Borders |
| `--gray-300` | `#cbd5e1` | Disabled states |
| `--gray-400` | `#94a3b8` | Placeholder text |
| `--gray-500` | `#64748b` | Secondary text |
| `--gray-700` | `#334155` | Body text |
| `--gray-800` | `#1e293b` | Headings |
| `--gray-900` | `#0f172a` | High-emphasis text |

### 2.3 Semantic Colors

| Token | Hex | Usage |
|---|---|---|
| `--red-500` | `#ef4444` | Errors, 🔴 urgent deadlines (<14d) |
| `--yellow-500` | `#eab308` | Warnings, 🟡 approaching deadlines (<30d) |
| `--green-500` | `#22c55e` | Success, 🟢 safe deadlines (90+d) |
| `--blue-500` | `#3b82f6` | Info, 🔵 rolling deadlines |
| `--orange-500` | `#f97316` | High priority indicators |

### 2.4 Gradients

```css
/* Header / Hero gradient */
background: linear-gradient(135deg, #0f6e56, #149d7a);

/* Card hover lift */
box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
```

---

## 3. Typography

### 3.1 Font Stack

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

Using system fonts for:
- Zero download time (critical for African bandwidth)
- Native rendering on all devices
- Excellent multilingual support

### 3.2 Type Scale

| Token | Size | Line Height | Usage |
|---|---|---|---|
| `text-xs` | 0.75rem (12px) | 1rem | Badges, meta |
| `text-sm` | 0.875rem (14px) | 1.25rem | Secondary text, labels |
| `text-base` | 1rem (16px) | 1.5rem | Body text |
| `text-lg` | 1.125rem (18px) | 1.75rem | Card titles |
| `text-xl` | 1.25rem (20px) | 1.75rem | Section headers |
| `text-2xl` | 1.5rem (24px) | 2rem | Page titles |
| `text-3xl` | 1.875rem (30px) | 2.25rem | Hero heading |
| `text-4xl` | 2.25rem (36px) | 2.5rem | Landing hero |

### 3.3 Font Weights

| Weight | Usage |
|---|---|
| 400 (Normal) | Body text |
| 500 (Medium) | Emphasis, buttons |
| 600 (Semibold) | Card titles, labels |
| 700 (Bold) | Headings, CTAs |
| 800 (Extrabold) | Hero headlines |

---

## 4. Spacing System (Tailwind Scale)

| Token | Value | Usage |
|---|---|---|
| `p-2` / `gap-2` | 0.5rem (8px) | Tight spacing |
| `p-4` / `gap-4` | 1rem (16px) | Card padding, section gaps |
| `p-6` / `gap-6` | 1.5rem (24px) | Section padding |
| `p-8` / `gap-8` | 2rem (32px) | Page sections |
| `p-12` | 3rem (48px) | Landing page sections |

---

## 5. Component Patterns

### 5.1 Buttons

```css
/* Primary CTA */
.btn-primary {
  background: linear-gradient(135deg, #0f6e56, #149d7a);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  transition: all 0.2s;
}
.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(15, 110, 86, 0.3);
}

/* Secondary */
.btn-secondary {
  background: white;
  color: #0f6e56;
  border: 2px solid #0f6e56;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
}

/* Ghost / Text */
.btn-ghost {
  background: transparent;
  color: #0f6e56;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
}
.btn-ghost:hover {
  background: #f0fdf4;
}
```

### 5.2 Cards

```css
.card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1.5rem;
  transition: box-shadow 0.2s;
}
.card:hover {
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}
```

### 5.3 Inputs

```css
.input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  font-size: 1rem;
  color: #1e293b;
  background: white;
  transition: border-color 0.2s;
}
.input:focus {
  outline: none;
  border-color: #0f6e56;
  box-shadow: 0 0 0 3px rgba(15, 110, 86, 0.1);
}
.input::placeholder {
  color: #94a3b8;
}
```

### 5.4 Badges

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}
.badge-urgent { background: #fef2f2; color: #dc2626; }     /* 🔴 <14 days */
.badge-warning { background: #fefce8; color: #ca8a04; }    /* 🟡 <30 days */
.badge-safe { background: #f0fdf4; color: #16a34a; }       /* 🟢 90+ days */
.badge-rolling { background: #eff6ff; color: #2563eb; }    /* 🔵 Rolling */
.badge-plan { background: #f0fdf4; color: #0f6e56; }       /* Plan indicator */
```

---

## 6. Layout Patterns

### 6.1 Landing Page

```
┌─────────────────────────────────────────┐
│                 Header                   │
│  Logo    Features Pricing FAQ   Sign In  │
├─────────────────────────────────────────┤
│                                         │
│              Hero Section               │
│     Mission + "Get Started" CTA         │
│                                         │
├─────────────────────────────────────────┤
│          Feature Highlights (4)          │
│   Discovery | Matching | Essays | Track  │
├─────────────────────────────────────────┤
│          Pricing Comparison              │
│   4-tier cards, monthly/annual toggle    │
├─────────────────────────────────────────┤
│     Competitive Comparison Matrix        │
├─────────────────────────────────────────┤
│          Testimonials (future)           │
├─────────────────────────────────────────┤
│                 Footer                   │
│   Privacy | Terms | FAQ | About | Contact│
└─────────────────────────────────────────┘
```

### 6.2 Authenticated Dashboard

```
┌──────┬──────────────────────────────────┐
│ Side │  Stats Bar                        │
│ bar  │  Total | Applied | Drafting | ... │
│      ├──────────────────────────────────┤
│ Nav  │                                  │
│      │     Scholarship Grid / Content    │
│      │                                  │
│      │                                  │
└──────┴──────────────────────────────────┘
```

---

## 7. Responsive Breakpoints

| Breakpoint | Width | Target |
|---|---|---|
| Mobile | 320px – 639px | Single column, stacked layout |
| Tablet | 640px – 1023px | 2-column grid |
| Desktop | 1024px+ | Sidebar + content, multi-column |

### 7.1 Mobile Patterns
- Sidebar collapses to hamburger menu
- Cards stack vertically
- Tables become cards
- Font sizes scale down slightly
- Touch targets ≥ 44px

---

## 8. Icon System

Use **Lucide React** for all icons. Consistent sizing:

| Size | Usage |
|---|---|
| 16px | Inline with text, badges |
| 20px | Buttons, form fields |
| 24px | Navigation, section headers |
| 32px | Feature highlights, empty states |

---

## 9. State Patterns

### 9.1 Loading States
```jsx
// Skeleton loader (preferred over spinners)
<div className="animate-pulse">
  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
</div>
```

### 9.2 Empty States
```jsx
// Illustrated empty state with CTA
<div className="text-center py-12">
  <Icon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
  <h3 className="text-lg font-semibold text-gray-700">No scholarships yet</h3>
  <p className="text-gray-500 mt-2">Complete your profile to get personalized matches</p>
  <Button className="mt-4">Complete Profile</Button>
</div>
```

### 9.3 Error States
```jsx
// Friendly error with retry
<div className="text-center py-8">
  <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
  <p className="text-gray-700">Couldn't load scholarships</p>
  <p className="text-sm text-gray-500 mt-1">Check your connection and try again</p>
  <Button className="mt-4" onClick={retry}>Try Again</Button>
</div>
```

### 9.4 Success States
```jsx
// Toast notification
<div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg">
  <CheckCircle className="inline w-5 h-5 mr-2" />
  Application saved!
</div>
```

---

## 10. Accessibility Requirements

- **Color contrast:** All text ≥ 4.5:1 ratio (WCAG AA)
- **Focus indicators:** Visible focus ring on all interactive elements
- **Keyboard navigation:** Tab through all controls; Enter/Space to activate
- **Screen readers:** ARIA labels on all interactive elements without visible text
- **Alt text:** All images and icons have descriptive alt text
- **Form labels:** All inputs have associated `<label>` elements
- **Error messages:** Associated with inputs via `aria-describedby`
- **Skip to content:** Link at top of page for keyboard users

---

## 11. Performance Guidelines

- **System fonts only** — zero font downloads
- **No hero images over 100KB** — use CSS gradients instead
- **Lazy-load below-fold images** — `loading="lazy"`
- **Code-split** — lazy-load admin, essays, auto-apply
- **Main bundle** <300KB gzipped
- **Minimal dependencies** — prefer native APIs over libraries
- **No animations over 200ms** — respect `prefers-reduced-motion`

---

## 12. Motion & Animation

- **Keep it subtle:** 150-200ms transitions
- **Purposeful:** Only animate to provide feedback (hover, click, page transitions)
- **Respect preferences:** Honor `prefers-reduced-motion: reduce`
- **No autoplay:** No autoplaying videos, carousels, or animations

---

## 13. Tailwind Configuration

```js
// tailwind.config.js
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          700: '#15803d',
          800: '#0f6e56',  // primary
          900: '#14532d',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      }
    }
  }
};
```

---

*Design system reviewed by: _____________________ Date: _____________________*
