---
name: Music Recommender
description: Five discovery structures in one icy acrylic and selective chrome world.
colors:
  canvas: "#edf5ff"
  surface: "#fcfdff"
  ink: "#173250"
  primary: "#153ea8"
  muted: "#465f7b"
  control: "#6b8099"
  rule: "#b9cbe1"
  tint: "#eaf1fc"
  white: "#fff"
  shell-body: "rgba(247,251,255,.94)"
  header: "rgba(251,254,255,.83)"
  notice-ink: "#735000"
  notice-surface: "#fff6db"
  problem-ink: "#9f2434"
  problem-surface: "#fff0f2"
  hero-v1: "#dcebfa"
  hero-v2: "#c9d5df"
  hero-v3: "#dde2f7"
  hero-v4: "#cadfe5"
  hero-v5: "#c7d7f3"
typography:
  display:
    fontFamily: "Manrope, sans-serif"
    fontSize: "46px"
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: "-.035em"
  headline:
    fontFamily: "Manrope, sans-serif"
    fontSize: "36px"
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: "-.035em"
  title:
    fontFamily: "Manrope, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "16px"
    lineHeight: 1.6
  label:
    fontFamily: "Manrope, sans-serif"
    fontSize: "14px"
    fontWeight: 500
  button:
    fontFamily: "Manrope, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  field: "14px"
  hero: "18px"
  contents: "20px"
  inner-mobile: "22px"
  display: "24px"
  inner: "26px"
  enclosure: "32px"
  pill: "999px"
spacing:
  lip-mobile: "4px"
  lip: "6px"
  tight: "8px"
  control-gap: "10px"
  small: "12px"
  compact: "16px"
  inset: "20px"
  standard: "24px"
  panel: "28px"
  wide: "32px"
  sequence: "40px"
  section: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "10px 24px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
  button-secondary-hover:
    backgroundColor: "{colors.tint}"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    typography: "{typography.button}"
    padding: "10px 0"
  input-search:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "13px 14px"
    width: "100%"
  navigation-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
  reading-panel:
    backgroundColor: "{colors.shell-body}"
    rounded: "{rounded.inner}"
    padding: "28px"
  evidence-disclosure:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "20px"
  demo-notice:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "12px 16px"
---

# Design System: Music Recommender

## Overview

**Creative North Star: "Icy acrylic and selective chrome"**

The approved Y2K Futurism / Soft Club world uses icy-blue acrylic enclosures, silver seams, pearl reading fields and cobalt controls. Material framing provides identity even with every hero empty. Conventional text and controls carry the task; the generated three-screen board is a critique reference, not interface artwork or a pixel-matching comp.

This records the implemented October 21 Stage 9 comparison, merging the prior provisional system. No final structure is selected. The shared material world supersedes Stage 4's separate typography/theme directions; those remain historical evidence. The user selects a structure before its Discover and About frontend is promoted. Stage 10 and deployment require separate authorization; retain v1–v5 and comparison history after selection.

The subsequent Disc Study exploration settles the aesthetic preference on incumbent v2 while leaving the final body structure open. Gatefold, Disc Tray and Liner Notes extend that same visual system for comparison.

**Key Characteristics:**
- Five distinct app structures with shared Manrope typography, content and behavior.
- Sculpted enclosure lips around near-opaque reading fields.
- Flat CSS hero reservations with no shipped images.
- Native controls, visible keyboard focus and task-first mobile flow.
- Persistent demonstration labels and an explicit real-data boundary.

## Colors

Cool pearl and ice-blue surfaces support dark blue reading text and cobalt actions. Frontmatter values come from implemented stylesheets; complete gradient and material recipes live in the sidecar.

### Primary
- **Cobalt:** headings, selected navigation, action text, primary buttons, caret and keyboard focus.

### Neutral
- **Ice canvas / Pearl surface:** ground token and solid controls or displays. The actual page ground is a cool three-stop gradient.
- **Deep blue ink / Secondary blue ink:** primary reading text and supporting metadata.
- **Field edge / Divider / Inset:** strong control boundaries, quiet separators and evidence or demonstration backgrounds.
- **Reading field / Header:** near-opaque enclosure interiors and selectively translucent product navigation.
- **Hero v1–v5:** flat reservations mapped in Layout.
- **Notice / Problem pairs:** limited-result and failure messages with explanatory text; color alone never carries state.

**The Reading Field Rule.** Keep reading regions near-opaque; text must never depend on artwork for contrast.

## Typography

**Display and Body Font:** Manrope with sans-serif fallback. The application loads Latin weights 500 and 600; unsupported Unicode uses the platform fallback. System typography belongs to the external comparison harness. The removed display-font packages are not active dependencies.

- **Display:** opening heading reduces from the frontmatter role to 40px at tablet and 32px at mobile.
- **Headline:** compact v3–v5 command headings. v1/v2 working headings use 30px; the shared working-heading selector also includes 28px/1.2/600 where applicable.
- **Title:** recommendation section headings. Selected-track names use 24px at their inherited track-title weight (500), reducing to 22px on mobile.
- **Body:** task explanations use 16px/1.6 and a 38ch measure; About uses 1.8 line-height and up to 70ch.
- **Label / Button:** 14px metadata and actions; artist metadata is normally 15px. Result names use 18px, while the ledger uses 16px titles.
- **Native inputs/selects:** at least 16px.

**The Shared Voice Rule.** Keep Manrope and its loaded 500/600 weights across all five structures; structural differences must carry the comparison.

## Layout

The frame caps at 1320px with 32px desktop side gutters, 24px at 1023px and 16px at 767px. At 389px, search controls and starter choices become single-column where needed. Long Unicode recording metadata wraps without truncating identity. Use the shared spacing steps with the variant-specific density already present in source.

| Route / name | App structure | Working-state consequence |
|---|---|---|
| /variants/v1 — Blue Horizon | Split console | Left search/seed rail; right ranked-results display. |
| /variants/v2 — Disc Study | Centered guided sequence | State-driven choose/explore progress; seed and list in one reading flow. |
| /variants/v3 — Pearl Orbit | Persistent catalog workbench | Search and four starters remain beside the active result list. |
| /variants/v4 — Capsule Current | Full-width track ledger | Top command band; title/artist columns and compact disclosure rows. |
| /variants/v5 — Cobalt Signal | List and separate inspector | Details selects neighboring evidence with focus movement and return. |

All five preserve seed data, ordering, support evidence, error states, search, reseeding and browser history. Names preserve routes; they do not identify separate themes.

| Version | Flat fill token | Aspect | Location / reserved future fit |
|---|---|---|---|
| v1 | hero-v1 | 4:3 | Right console display; cover at 60% 50%. |
| v2 | hero-v2 | 1:1 | Circular inset below search beside starters; contain at 50% 50%. |
| v3 | hero-v3 | 5:4 | Main display beside catalog; cover at 35% 55%. |
| v4 | hero-v4 | 16:9 | Wide inset beside starter rail below command band; cover at 60% 50%. |
| v5 | hero-v5 | 3:1 | Panorama below command band; cover at 50% 55%. |

Reservations are noninteractive and hidden from assistive technology. Preserve aspect without minimum-height cropping. On mobile, task and choices precede each reservation. Heroes disappear during search/results; working screens reserve no blank media. Future-fit values do not authorize adding images.

About preserves the same source-grounded copy, catalog limits and frozen evaluation values: v1 intro rail/body; v2 sequential native disclosures; v3 contents index/methodology; v4 broad intro/two-column sections; v5 reading panel/contents rail. It remains a Read surface, resolving into readable mobile columns.

### Disc Study body layouts

The three routes under `/prototypes/disc-study/` reuse v2's material, typography and shared state layer in a 1160px maximum-width body. Original v1–v5 routes and their hero mappings remain available.

| Route suffix / name | Body structure | About treatment |
|---|---|---|
| gatefold — Gatefold | Joined cover/search and starter/result leaves. | Left-aligned intro in a 1080px reading width. |
| disc-tray — Disc Tray | Upper command enclosure and separate compact track drawer; desktop title/artist columns. | Broad intro and compact disclosures in a 1080px reading width. |
| liner-notes — Liner Notes | Asymmetric heading/search above the enclosure; spacious rows and prominent ranks. | Left-aligned intro and spacious disclosures in a 960px reading width. |

Each entry retains v2's flat circular 1:1 reservation using hero-v2, with layout-specific responsive sizes. At 767px and below, bodies become one column and task/starting choices precede the disc. Search/results states omit the hero. Each `/about` route retains native disclosures and source-grounded copy. These layouts add no imagery, backend behavior or production promotion; the final body choice, Stage 10 and deployment remain separately gated.

**The Task Before Hero Rule.** Put search and starting choices before decorative media on narrow screens; remove the reservation from working states.

## Elevation & Depth

Narrow silver-blue gradient lips, inset highlights and diffuse shadows frame near-opaque reading interiors. The product header uses 14px backdrop blur. The chrome lip is 6px desktop/4px mobile. Gradients belong to the page ground and enclosure edges, including v2's circular lip; hero fills remain flat.

### Shadow Vocabulary
- **Enclosure:** `0 16px 38px #28476724,inset 0 1px 1px #fff`.
- **Reading field:** `inset 0 1px 0 #fff,inset 0 -1px 0 #d3e2f3`.
- **Header:** `inset 0 1px 0 #fff,0 8px 24px #29486b14`.

The dark translucent picker is external comparison chrome in document flow. Reduced transparency solidifies header, reading field and contents index; forced colors replace material fills with system canvas and borders.

**The Selective Chrome Rule.** Use reflective seams at enclosure boundaries while keeping text, fields and result lists calm.

## Shapes

Nest smaller reading surfaces inside rounded enclosures: desktop enclosure/inner radii, then 26px/22px outer/inner on mobile. Fields and disclosures share the field radius; navigation and action buttons use pills. Hero corners use the hero/display radius; v2 alone is circular. Strokes are 1px. Keyboard focus uses a 3px outline and 3px offset with supporting canvas rings on buttons, summaries and links; contents links use a zero outline offset.

## Components

### Buttons and fields

Primary actions are cobalt pills; secondary/reseed actions use pearl, cobalt text and field-edge strokes. Text actions are underlined. Preserve native search inputs, selects, labels and helper text; controls maintain specified 44px targets and search has a 50px minimum height. Fine-pointer hover uses primary `brightness(.92)`, inset fills on secondary/starter/match controls and thicker underlines. Pointer presses scale pills to .98 outside keyboard focus.

Product transitions last 150ms. Keyboard actions, native disclosures and variant replacement are immediate; only the external picker highlight transitions for 250ms. Reduced motion removes transitions and animations. No animated chrome, autoplay, page entrances or parallax is implemented.

### Reading panels and track evidence

Near-opaque panels contain ruled lists, tabular ranks and native disclosures with inset evidence fills. v4 uses denser title/artist columns. v5 puts evidence in a separate inspector: Details focuses its heading; return uses a connected originating trigger or the first current Details button. Counts do not imply enjoyment probability.

### Navigation and data state

Discover/About use pill selection and `aria-current`; mobile stacks the header. Preserve conventional About anchors, the skip link and visible focus. The comparison picker stays outside product navigation and in document flow so it cannot cover controls. Demo/scenario selectors are preview tools.

Demonstration mode keeps its notice and illustrative-ordering language. Real failures never load fixtures. Loading, limited lists, omitted metadata, empty connections, unavailable links and retry states remain explicit across all structures.

## Do's and Don'ts

### Do:
- **Do** retain all five structures, routes and comparison history until and after the user's structure selection.
- **Do** keep shared Manrope typography, near-opaque reading fields, cobalt actions and selective enclosure chrome.
- **Do** preserve each flat hero's fill, aspect, location and future fit mapping, with task-first mobile order.
- **Do** preserve native controls, visible focus, reduced-motion, reduced-transparency and forced-color treatments.
- **Do** label demonstration fixtures persistently and keep real failures separate from demo data.
- **Do** treat review/capture evidence as scoped evidence, not deployment, user research or full accessibility conformance.

### Don't:
- **Don't** add generated artwork, reference screenshots, remote images, illustrated hero substitutes or interactive hero controls.
- **Don't** replace structural differences with typography/theme swaps or reserve blank hero space in working screens.
- **Don't** turn approved glass/chrome into a generic ban or extend translucency into low-contrast reading regions.
- **Don't** promote a final structure, Stage 10 or deployment without the separate user gate.
- **Don't** inflate catalog, link, model-quality or personalisation claims beyond PRODUCT.md and frozen evidence.

Not canonized: dark system-font picker styling is comparison tooling, not product identity; unverified hardware, screen-reader and deployed-performance behavior is not a system guarantee. The launcher/Impeccable engine were unavailable; this normalization used the documented direct-source fallback without global tooling installation. No additional defects were repaired by documentation.
