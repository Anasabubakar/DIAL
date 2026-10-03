# Dial brand implementation

Source of truth: Figma file **"Dial — Brand Identity"** (`mq85LGsGioyiVTlV5fzYls`), frames 01–06 (node `10:2`) and the
supplied concept reference (`16:2`). Inspected 2026-10-03 through the Figma MCP.

## Artwork (exported unchanged from Figma, `apps/web/public/brand/`)

| File | Figma node | Use |
|---|---|---|
| `symbol-primary.svg` (150×125) | 10:28 Symbol / ink + citron | Default symbol on Paper and white |
| `symbol-reversed.svg` (138×115) | 10:34 Symbol / reversed | Symbol on Ink |
| `app-icon-mark.svg` (82×72) | 10:41 App icon mark | Inside the app icon / favicon |
| `app-icon.svg`, `src/app/icon.svg` | 10:40 + 10:41 | Ink tile (radius 34/140) wrapping the exported mark, laid out as in Figma |
| `symbol-clearspace.svg`, `symbol-callscreen.svg`, `hero-abstract.svg` | 10:49, 10:112, 10:137 | Kept for reference, same artwork at other sizes |

Rules followed (from the file): two folded forms, ink above, citron below. Never skewed, outlined, recoloured or given effects.
Symbol is rendered at its native 6:5 proportion, 24 px minimum on screen, one mark-height of clear space around the lockup.

## Wordmark

The identity file sets "Dial" as live text in **Manrope ExtraBold** next to the symbol (68 px type, 150×125 symbol, 27 px gap). The
`Wordmark` component reproduces that lockup (symbol height 1.84 × type size, gap 0.4 × type size). The concept board shows a
custom-drawn wordmark, but no vector wordmark asset exists in the Figma file, so Manrope ExtraBold is the closest approved option.
**Limitation:** if a custom wordmark vector is supplied later, swap it into `components/dial-mark.tsx`.

## Tokens (`apps/web/src/app/globals.css`)

| Token | Value | Role |
|---|---|---|
| `ink` | `#29232E` | Wordmark, headings, primary buttons, dark surfaces |
| `citron` | `#DDED9C` | Accent only: fills, progress, active/good state. Never text on Paper |
| `paper` | `#F6F3EB` | Canvas |
| `stone` | `#817B83` | Borders, icons, placeholders |
| `muted` | `#615C63` | Secondary text (used in the Figma touchpoints) |
| `track` | `#ECEAE4` | Progress track |
| `end` | `#CC403D` | End-call red, destructive actions |

**Deliberate deviation:** the Figma eyebrow labels are Stone `#817B83` on Paper, about 3.6:1, which fails WCAG AA for small text.
All body-size text uses `muted` (about 6:1) instead. Stone is reserved for non-text UI.

Type: Manrope 400–800 via `next/font`. Scale from the file: Heading 42/50 SemiBold, Body 18/26, Label 14 Bold. Radii: cards 22, inner
cards 18, call/CTA pills fully round. Components consume semantic aliases (`accent`, `canvas`, `danger`) that point at these tokens.

## Voice

Brand line "Call, get shit done." (verbatim, as specified), positioning "Your computer is one phone call away.", CTA "Meet Dial →",
"I'm on it." for in-progress states, plain words and one idea per sentence. Copy never claims an action succeeded before the
backend confirms it.

## Removed

The earlier dial/rotary imagery, serif display font, green palette and the React Bits split-flap board were removed, because they
competed with the supplied mark.
