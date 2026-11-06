# Firdavs Tours — design system

Documented from the built site (`src/styles/global.css`, `src/pages/index.astro`). The world: **Samarkand tilework at night.**

## Principle
The site and the planner are one product. Tokens are taken from the planner's own theme, and both follow the OS colour scheme: dark is the signature (lapis night), light mirrors the planner's cream.

## Colour (`:root`, overridden under `prefers-color-scheme: light`)
| Token | Dark | Light | Role |
|---|---|---|---|
| `--bg` | `#0d162b` | `#fbf9f4` | Page ground; equals the planner canvas |
| `--bg-deep` | `#091022` | `#f3eee3` | Alternate bands (How it works, footer) |
| `--surface` / `--surface-2` | `#142039` / `#1a2847` | `#fffdf8` / `#f6f1e6` | Cards, panels |
| `--line` / `--line-soft` | `#2c3a58` / `#1f2c49` | `#ded6c6` / `#ebe5d8` | Hairlines and borders |
| `--text` / `--muted` | `#f3ede0` / `#b0bacb` | `#16213b` / `#46536d` | Ink |
| `--turq` | `#3cc6c0` | `#3cc6c0` | Primary action fill (on `--on-turq` ink) |
| `--turq-ink` | `#79d6cc` | `#0f6f6b` | Turquoise as text (routes, links) |
| `--gold` / `--gold-ink` | `#d9b46a` / `#e2c486` | `#b98a2e` / `#7d5b17` | Grout lines, step numerals, totals, focus ring |

Chart colours (validated for both surfaces): dark `#249e99` / `#b08a3a`, light `#0a948d` / `#b98a2e`; the regression bar also carries a hatch texture.

## Type
- Display: **Cormorant Garamond** 500/600 (Latin, Latin Ext, Cyrillic), the planner's heading face. h1 `clamp(2.9rem, 7.4vw, 5.6rem)`, h2 `clamp(2.15rem, 4.6vw, 3.4rem)`, tight leading (0.98–1.04), balanced wrapping.
- Body: **Source Sans 3** variable, 17px / 1.65, tabular lining numerals for prices (`.num`).

## Shape & depth
Radii 14px (chips), 16px, 24px (cards, panels), 999px (pills, arch tops). Shadow `--shadow`: a soft offset blur, never a hard offset. One arch-framed photograph in the hero (desktop only) echoes the iwan portal.

## Motifs
- **Tile field:** an authored khatam (eight-pointed star) lattice in turquoise lines with gold grout crosses (`TileField.astro`), masked radially so it falls away behind content.
- **Brand mark:** a khatam star in a rounded teal tile with a gold centre.
- Bullets are small gold diamonds; lists are divided by hairlines rather than boxed.

## Components
Header (sticky, blurred ground, `details` menu under 760px) · planner panel (textarea + send + six starter chips, the same voice as the planner) · tour cards (photo, days pill, serif name, turquoise route, gold-diamond highlights, "from" price; the first card spans 2×2 on desktop) · "More journeys" ruled list · numbered steps with a gold connector · example quote card · ruled "Why" list · snap-scroll destination strip · `details` FAQ with a rotating plus · photo closing band · footer with the fhsystems badge.

## Motion
One authored moment: the tile field reveals from the planner panel on load (masked radius, 2.4s exponential ease-out), plus a cross-document view transition that morphs the panel into `/plan`. Hover lifts are 1–3px. Everything collapses under `prefers-reduced-motion`.

## Accessibility
Focus ring is 2px gold with a 3px offset; there's a skip link; every interactive target is at least 40px; contrast is AA in both schemes; the /about chart has a table view.
