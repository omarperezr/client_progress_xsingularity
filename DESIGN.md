---
name: Client Progress
description: A client's commissioned project read as a tracked freight consignment — waybill sheets, route lines, rubber stamps, night-dispatch dark.
colors:
  paper: "#131110"
  sheet: "#1d1b17"
  sheet-dim: "#26231d"
  ink: "#ece8dd"
  ink-soft: "#b3ac9c"
  ink-faint: "#7d776a"
  rule: "#34312a"
  rule-mid: "#56514a"
  cargo: "#f0561a"
  cargo-deep: "#c74310"
  transit: "#6f9fd8"
  delivered: "#55b183"
  exception: "#d4574c"
  exception-deep: "#b23c31"
  hold: "#d9a021"
  hold-bg: "#f5d54a"
typography:
  headline:
    fontFamily: "Barlow Condensed, Barlow, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    letterSpacing: "0.08em"
    lineHeight: 1.2
  title:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.375
  body:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Barlow Condensed, Barlow, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 600
    letterSpacing: "0.08em"
    lineHeight: 1.3
  label-lg:
    fontFamily: "Barlow Condensed, Barlow, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "0.08em"
    lineHeight: 1.3
  meta:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
  data:
    fontFamily: "Overpass Mono, monospace"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  none: "0px"
spacing:
  field-x: "12px"
  field-y: "8px"
  card: "20px"
  card-gap: "20px"
  page-x: "16px"
  page-y: "32px"
components:
  button-secondary:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.45rem 0.9rem"
  button-secondary-hover:
    backgroundColor: "{colors.sheet-dim}"
  button-primary:
    backgroundColor: "{colors.cargo}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.45rem 0.9rem"
  button-primary-hover:
    backgroundColor: "{colors.cargo-deep}"
  button-void:
    backgroundColor: "{colors.exception}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.45rem 0.9rem"
  button-void-hover:
    backgroundColor: "{colors.exception-deep}"
  input:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0.5rem 0.75rem"
  sheet-card:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "{spacing.card}"
  field-box:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "{spacing.field-x} {spacing.field-y}"
---

# Design System: Client Progress

## Overview

**Creative North Star: "Night Dispatch"**

A commissioned project is a tracked consignment. Every screen is a dispatch
desk at night: a near-black desk with faint horizontal ledger ruling, dark
waybill sheets laid on top of it, and light paper-ink lettering ruled into
field boxes. Status is not a badge — it is a rubber stamp, tilted two degrees,
with the ghost ring of a double strike. Progress is not a bar — it is a route
line from kickoff to ETA with checkpoint dots and an orange position diamond.
The system deliberately refuses the dark-zinc SaaS card dashboard its category
ships by default: no rounded cards, no glyph icon rows, no gradient accents.

The world is dark-only by user-pinned commitment: `color-scheme: dark` and no
`prefers-color-scheme` branches anywhere. Density is ledger-like — small caps
labels over mono values, hairline rules, tabular numerals — but the sheets
breathe with 20px internal padding and a strict 1px light-ink border that
makes each surface read as a physical document.

**Key Characteristics:**
- Dark-only night-dispatch ground (#131110) with document-like sheets (#1d1b17)
- Light "paper ink" does the structural work: borders, headings, meters
- International orange is the only action color; status colors are stamp inks
- Zero border-radius on every rectangle; circles exist only as route posts/dots
- Condensed caps labels + mono data + regular Barlow prose, everywhere
- Motion is rationed to two authored moments: stamp-land and route-grow

## Colors

An achromatic paper-and-ink base with five saturated "stamp ink" signals, each
carrying one logistics meaning.

### Primary
- **Cargo Orange** (#f0561a): international orange. Commits actions — primary
  buttons, the route line's current-position diamond, text selection, input
  caret, chart projection marks. Its pressed/hover partner is **Cargo Deep**
  (#c74310). It appears on at most one control per view region.

### Secondary (status stamp inks)
- **Transit Blue** (#6f9fd8): "in transit" — active/projected status, links, in-progress chart series.
- **Delivered Green** (#55b183): "delivered" — completed status, success banners, done chart series.
- **Hold Amber** (#d9a021): "on hold" — stalled work, inspection text.
- **Exception Red** (#d4574c): errors, void/destructive actions, exception stamps. Its pressed/hover partner is **Exception Deep** (#b23c31), mirroring cargo/cargo-deep.
- **Hazard Yellow** (#f5d54a): hazard-band fill only (impersonation banner), always paired with black-on-yellow diagonal striping (#e3c33e alternate stripe).

### Neutral
- **Desk** (#131110): page ground; carries a faint 32px repeating horizontal ruling at 3% ink opacity.
- **Sheet** (#1d1b17): the waybill surface — cards, inputs, buttons at rest.
- **Sheet Dim** (#26231d): recessed panels, hover fill, shimmer base.
- **Ink** (#ece8dd): primary text, sheet borders, filled route legs, meters, focus outlines.
- **Ink Soft** (#b3ac9c): secondary text, field labels, placeholders.
- **Ink Faint** (#7d776a): tertiary/axis text.
- **Rule** (#34312a): hairline table rules, chart gridlines.
- **Rule Mid** (#56514a): input borders, unfilled route track, scrollbar thumb, chart axes.

### Named Rules
**The Stamp Ink Rule.** Each signal color carries exactly one logistics
meaning — orange commits, blue transits, green delivers, amber holds, red
excepts, yellow inspects. Never repurpose a signal for decoration.

**The Ink Does the Work Rule.** Structure (borders, headings, progress fill,
focus rings) is drawn in light ink (#ece8dd), not in accent colors. Signals
appear only where a status or action genuinely exists.

## Typography

**Display/Label Font:** Barlow Condensed (weights 500/600/700)
**Body Font:** Barlow (weights 400/500/600/700, system-ui fallback)
**Data Font:** Overpass Mono (weights 400/600)

**Character:** An industrial forms pairing — condensed caps do the shouting a
freight label does, mono carries every number and identifier like a printed
manifest, and Barlow keeps prose plain and legible.

### Hierarchy
- **Headline** (Barlow Condensed 600, 24px, uppercase, 0.08em tracking): page
  headings ("Project manifest"), always set via `.label-caps`, usually over a
  2px ink bottom border.
- **Title** (Barlow 600, 18px): card/project names; also the header wordmark
  size in condensed caps.
- **Body** (Barlow 400, 14px): prose, descriptions, form hints. 12px (`text-xs`) for meta prose.
- **Label** (Barlow Condensed 600, 10–12px, uppercase, 0.08em): field-box
  labels, table headers, section titles — the single most-used style in the
  build. Two steps: 10px (`label`) on field boxes and chart-adjacent captions,
  11px (`label-lg`) on input labels, stamps (at 700), and small buttons.
- **Meta** (Barlow 400, 12px): hints, footnotes, file-input button text.
- **Data** (Overpass Mono 600, 10–18px): consignment numbers, percentages,
  counts, dates, stats. Tabular numerals are forced on `table`, `dd`, and `.tabular`.

### Named Rules
**The Mono Data Rule.** Every identifier, number, date, and percentage is set
in Overpass Mono. If it could appear on a printed waybill as a value, it is mono.

**The Caps Label Rule.** Labels are Barlow Condensed, uppercase, 0.08em
tracked (`.label-caps`); stamps push to 700 weight and 0.1em. Prose is never
uppercased.

## Layout

Single centered column: `max-w-5xl` for client pages (`max-w-6xl` for admin
and the hazard band), 16px horizontal padding, 32px vertical page padding.
Waybill cards sit in a responsive grid (`sm:grid-cols-2`, 20px gap). Page
headings sit on a 2px ink bottom border with a mono count aligned to the
baseline opposite them.

The signature spatial device is the **field grid**: a `dl` of field boxes with
collapsed 1px ink borders, built as `grid gap-px border border-ink bg-ink`
with sheet-colored cells — the borders are literally the ink background
showing through. Field boxes pack a 10px caps label over a mono value at
12x8px padding.

Rhythm follows the Tailwind 4px scale; the recurring steps are 4/8/12/16/20px
with 20px as the standard card padding and card gap.

## Elevation & Depth

Depth is documentary, not floaty: sheets sit on the desk with a tight paper
shadow, and the only elevation change in the system is a card lifting slightly
on hover. Recessed areas use the darker `sheet-dim` tone rather than inset
shadows.

### Shadow Vocabulary
- **sheet** (`box-shadow: 0 1px 2px rgb(0 0 0 / 0.3), 0 6px 16px -6px rgb(0 0 0 / 0.5)`): every `.sheet` at rest.
- **sheet-raised** (`box-shadow: 0 2px 4px rgb(0 0 0 / 0.35), 0 12px 28px -8px rgb(0 0 0 / 0.6)`): hover state on linked waybill cards only.

### Named Rules
**The Two Shadows Rule.** The system owns exactly two shadows — sheet at rest,
sheet-raised on hover. No glows, no colored shadows, no hard offsets.

## Shapes

Zero border-radius on every rectangle: sheets, buttons, inputs, stamps,
banners, meters are all square-cornered documents. The only circles in the
system are the route line's departure/destination posts and checkpoint dots;
the current-position marker is a 45-degree-rotated square (a diamond) filled
cargo orange. Borders are load-bearing: 1px solid ink around sheets and
buttons, 1.5px `currentColor` around stamps with a 35%-opacity outer ghost
ring (the double-strike), 1px rule-mid around inputs, 2px ink under headers
and page headings. The brand mark is a bare inline-SVG barcode strip in
`currentColor` — the system's only pictorial element.

**The Square Corner Rule.** Nothing gets a border-radius. Roundness is
reserved for route posts and checkpoint dots.

## Components

### Buttons
- **Shape:** square-cornered (0px radius), condensed caps label type (600, uppercase, 0.08em), 1px border.
- **Secondary (default `.btn`):** sheet background, ink text/border, 0.45rem x 0.9rem padding; hover fills sheet-dim; active nudges down 1px (`translateY(1px)`); disabled at 55% opacity.
- **Primary (`.btn-primary`):** cargo orange fill and border, desk-black (#131110) text; hover deepens to cargo-deep.
- **Void (`.btn-void`):** exception red fill, desk-black text; used for destructive confirms inside a DangerZone disclosure (delete always takes a deliberate second click).
- **Pending state:** all submit buttons swap to pending text while the form is in flight (PendingButton).

### Cards / Containers
- **Corner Style:** square.
- **Background:** sheet (#1d1b17) with a 1px solid ink border (`.sheet`).
- **Shadow Strategy:** sheet shadow at rest; sheet-raised on hover only when the whole card is a link.
- **Internal Padding:** 20px (`p-5`); admin cards open with a caps title over a 1px rule bottom border.
- **Card head:** mono consignment number left, caps "via {provider}" right, over a 1px rule.

### Inputs / Fields
- **Style:** sheet background, 1px rule-mid border, 8x12px padding, 14px text, square corners (`.input`); selects share the same class.
- **Focus:** border shifts to ink; global `:focus-visible` elsewhere is a 2px ink outline offset 2px. Caret is cargo orange.
- **Labels:** caps label (11px, ink-soft) above the control; hints in 12px ink-soft below.
- **File inputs:** the native selector button is restyled as a small secondary button.
- **Banners:** 1px status-color border with a 5%-opacity fill of the same color (delivered for success, exception for error).

### Navigation
- **Header plate:** sheet background with a 2px ink bottom border; barcode mark + condensed-caps wordmark left, mono company name + secondary Sign out button right.
- **Hazard band (inspection mode):** fixed yellow/black — repeating -45° stripes of hold-bg (#f5d54a) and #e3c33e, black caps text, black-filled button with hazard-yellow text. Its colors never theme; hazard tape is physically yellow and black.

### Stamp (signature)
Rubber status stamp: condensed caps 700 at 11px, 0.1em tracking, 1.5px
`currentColor` border plus a 1px outer ghost outline at 35% opacity, rotated
-2°, colored purely by a text-color tone (delivered/transit/pending/hold/exception).
On first load it may play the single authored `stamp-land` animation (0.4s
overshoot scale from 1.6 to 1, settling at -2°).

### RouteLine (signature)
The journey from kickoff to ETA: ink departure post (filled dot), rule-mid
track, ink-filled traveled leg (optionally animated in with `route-grow`,
0.7s scaleX from the left), checkpoint dots at 25/50/75 (inked when passed,
hollow paper-filled when ahead), a cargo-orange diamond at current position,
and a hollow ink destination post. Mono 10px labels sit under each end with
the bold percent centered.

### ProgressBar / Charts
Graduated meter: 12px tall, 1px ink border, sheet-dim track, ink fill, with
paper-colored graduation ticks every 10% printed over the fill. Charts are
hand-drawn SVG using the same palette constants (ink lines, rule gridlines,
rule-mid axes, mono axis text, delivered/transit series, cargo projection
marks) — no chart library, no extra colors.

### Skeletons
Loading states use `.shimmer`: a sliding sheet-dim/sheet gradient with a 1px
rule border, matching the layout it replaces. All animation (shimmer,
stamp-land, route-grow) is disabled under `prefers-reduced-motion`.

## Do's and Don'ts

### Do:
- **Do** keep the world dark-only: `color-scheme: dark`, no `prefers-color-scheme` branches, no light theme (user-pinned commitment).
- **Do** draw structure in ink (#ece8dd) — 1px sheet borders, 2px heading rules — and reserve signal colors for real status and actions.
- **Do** set every number, date, and identifier in Overpass Mono with tabular numerals; every label in Barlow Condensed caps at 0.08em.
- **Do** build multi-value readouts as FieldGrids: gap-px grids on an ink background so 1px collapsed borders emerge.
- **Do** carry the world into browser surfaces: orange selection and caret, thin rule-mid scrollbars, ink focus-visible outline.
- **Do** ration motion to the authored moments (stamp-land, route-grow, shimmer) and honor reduced-motion.

### Don't:
- **Don't** round a corner on any rectangle — circles belong to route posts and dots only.
- **Don't** introduce glyph/icon sets; the barcode strip is the only pictorial mark.
- **Don't** use gradients except the three functional ones: desk ruling, hazard striping, shimmer.
- **Don't** theme the hazard band; inspection yellow/black is fixed in any light.
- **Don't** add shadows beyond sheet and sheet-raised, or use shadows to signal status.
- **Don't** put cargo orange on more than the single committing element of a region; status text stays in its stamp ink.
