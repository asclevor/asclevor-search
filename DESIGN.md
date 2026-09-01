# DESIGN.md — Asclevor Clinical Case Search

Recorded from the built world (ground truth over intention). Surface: `/`,
SvelteKit + Tailwind v4.

## Direction

Clinical decision-support utility. Operate mode: task density, scannability,
and provenance outrank expression. Replaced the incumbent brutalist
hero-and-teaser page; nothing from the old visual world survives.

## Palette

| Role                       | Token                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| Ground                     | `#FFFFFF`                                                                                      |
| Structure / rules          | `#E2E8F0` (slate-200), hover `slate-300`                                                       |
| Ink                        | `#0F172A` / `#1E293B` (slate-900/800); body text slate-600, muted slate-400/500                |
| Interactive accent         | `#2563EB` (blue-600), hover blue-700 — every control, link, focus ring                         |
| Similarity evidence        | emerald `#059669` (≥75%), blue-600 (55–74%), amber-500 (<55%)                                  |
| Patient demographics badge | blue-50 ground, blue-700 text, blue-100 border                                                 |
| JSON code surface          | slate-900 `#0F172A`; keys sky-300, strings emerald-300, numbers amber-300, literals violet-300 |
| Error                      | rose-200/50/700                                                                                |

Color strategy: Restrained (neutrals + blue accent + emerald evidence).

## Type

Inter (Google Fonts, 400–800) with SF Pro/system fallback; feature settings
cv02–cv04/cv11. Utility scale only — nothing above 24px: page intro 22–24px
bold, card titles 15px semibold, body 13px, controls 12px, labels 10–11px
uppercase semibold with 0.1–0.14em tracking, numerals tabular. Mono only for
code/PMID/IDs.

## Layout

- Max width 1440, page padding 16/24. Sticky top banner: brand row (real
  Asclevor logomark + wordmark, 52px) + persistent search row; thin blue
  progress bar rides its bottom edge while loading.
- Results: `lg:grid-cols-[minmax(0,1fr)_360px]` ≈ 70/30 split, gap 24;
  cards stack with 10px gaps (~153px each, 4 visible in a 900px viewport).
  Sidebar sticky at `top-[8.25rem]`. Below lg, sidebar stacks under the feed.
- Empty state: short utility intro + pill example queries; search lives only
  in the header banner.
- Footer: single low-profile row — copyright, Documentation, Terms,
  Privacy.

## Components

- **SearchBar** — white field, slate-300 border, subtle shadow, blue focus
  ring; magnifier, clear (×), divider, blue submit with arrow; `/` focuses.
- **ResultCard** — dense rounded-lg instrument (~155px): single inline
  metadata line (PMID link · source · year · blue demographics) above a
  1–2-line clamped title; top-right rail holds ghost icon actions (view /
  copy PMID / export citation, native tooltips, emerald check feedback)
  beside a 36px SimilarityRing. Below, a two-row key-value summary
  (Presentation · Key Finding/Outcome), each value hard-truncated with an
  inline "… See more" that unclamps and adds the Interventions row.
  Sections are heuristically derived from the abstract (labeled-section
  parse, then keyword-scored sentences); demographics/year/specialty are
  extracted, never invented.
- **SimilarityRing** — 36px SVG radial ring (46px optional), banded color,
  % in center.
- **Brand assets** — `src/lib/assets/logo.svg` is the real Asclevor logomark
  (open circle + chevron, black stroke), used verbatim in the header; the
  favicon renders the same mark at 80% on a white rounded square for
  dark-tab visibility.
- **ContextPanel** — segmented tabs: Clinical Summary (active query, limit
  3/5/10, latency tiles, extracted terminology pills, specialty/year/PMID
  filters) / Developer API (POST/status/latency chips, request body, dark
  JsonViewer with sticky line numbers, syntax colors, Copy JSON).
- **States** — skeleton pulse cards while loading; rose error card with
  retry; centered empty cards with recovery copy; removable blue filter chips
  in the results toolbar.

## Motion

One authored moment per state change: the header progress sweep
(`progress-slide` 1.1s). Everything else is 150ms color/shadow transitions;
status ping removed. `prefers-reduced-motion` disables both.

## Browser surfaces

Blue-tinted selection, themed thin scrollbars on the JSON surface, visible
blue focus-visible rings on every control, caret inherits Inter.
