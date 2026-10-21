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
  button-text:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "10px 14px"
  button-choice:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "16px 14px"
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

This records the implemented October 21 Stage 9 comparison, merging the prior provisional system. Disc Tray is the selected body; final hero artwork remains unselected. The shared material world supersedes Stage 4's separate typography/theme directions; those remain historical evidence. Body selection does not authorize production promotion, Stage 10 or deployment; retain v1–v5 and comparison history after selection.

The subsequent Disc Study exploration settles the aesthetic preference on incumbent v2 and the body choice on Disc Tray. Gatefold, Disc Tray and Liner Notes remain available for comparison. The four-option artwork comparison lives only in working Disc Tray demos at `/prototypes/disc-tray/artwork/{slug}`; the picker changes artwork while preserving discovery state. The user subsequently authorized a larger interactive 3D Orbital Disc exploration, replacing only that option's circular raster enclosure. The other three options retain their generated originals, and the original five previews and three body-comparison routes retain flat placeholders. The latest user adjustment vertically centers the model in the upper tray and removes its Pause/Resume control; rotation, tilt and shine now respond only during mouse hover, with a still idle pose. This hero iteration remains reviewable exploration, not final artwork acceptance.

**Key Characteristics:**
- Five distinct app structures with shared Manrope typography, content and behavior.
- Sculpted enclosure lips around near-opaque reading fields.
- Liquid-metal button rims and static conic highlights around glossy opaque icy or cobalt faces, with bounded pointer motion.
- Flat CSS heroes in original comparisons; three local raster artwork options and one locally authored 3D Orbital Disc with a transparent static fallback in the authorized Disc Tray demos.
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

Reservations are noninteractive and hidden from assistive technology. Preserve aspect without minimum-height cropping. On mobile, task and choices precede each reservation. Heroes disappear during search/results; working screens reserve no blank media. Future-fit values do not authorize adding images to these original comparison routes; the separate Disc Tray artwork demos below are the scoped exception, including the explicitly authorized interactive Orbital Disc.

About preserves the same source-grounded copy, catalog limits and frozen evaluation values: v1 intro rail/body; v2 sequential native disclosures; v3 contents index/methodology; v4 broad intro/two-column sections; v5 reading panel/contents rail. It remains a Read surface, resolving into readable mobile columns.

### Disc Study body layouts

The three routes under `/prototypes/disc-study/` reuse v2's material, typography and shared state layer in a 1160px maximum-width body. Original v1–v5 routes and their hero mappings remain available.

| Route suffix / name | Body structure | About treatment |
|---|---|---|
| gatefold — Gatefold | Joined cover/search and starter/result leaves. | Left-aligned intro in a 1080px reading width. |
| disc-tray — Disc Tray | Upper command enclosure and separate compact track drawer; desktop title/artist columns. | Broad intro and compact disclosures in a 1080px reading width. |
| liner-notes — Liner Notes | Asymmetric heading/search above the enclosure; spacious rows and prominent ranks. | Left-aligned intro and spacious disclosures in a 960px reading width. |

Each original body-comparison entry retains v2's flat circular 1:1 reservation using hero-v2, with layout-specific responsive sizes. At 767px and below, bodies become one column and task/starting choices precede the disc. Search/results states omit the hero. Each `/about` route retains native disclosures and source-grounded copy. Disc Tray is selected; these retained comparisons add no imagery, backend behavior or production promotion. Final hero choice, Stage 10 and deployment remain separately gated.

### Disc Tray artwork demos

Only `/prototypes/disc-tray/artwork/{slug}` and its optional `/about` use the four-option artwork picker below. Discover entry alone displays the artwork; search/results and About omit it. Picker changes preserve the current query, seed, recommendations and data context through the shared discovery state.

| Picker option | Route slug |
|---|---|
| Orbital Disc | orbital-disc |
| Glass Current | glass-current |
| Aero Player | aero-player |
| Liquid Star | liquid-star |

The four existing Higgsfield originals remain local PNGs at `public/artwork/disc-tray/{slug}.png`; verified 2048×2048 dimensions, immutable origins, job IDs and hashes are recorded in `docs/art-direction/disc-tray-artwork-assets.json`. Glass Current, Aero Player and Liquid Star continue to use Next.js Image in the existing centered circular 1:1 inset, with empty alternative text inside an `aria-hidden` reservation and no hero interaction or animation. Orbital Disc now uses the authored scene below instead of its original raster. These are narrow demo exceptions, not a new visual system or production promotion.

### Orbital Disc geometry and placement

Only `/prototypes/disc-tray/artwork/orbital-disc` replaces the circular enclosure with free-standing transparent 3D artwork. The 590×472px desktop figure has no background, border, radius or enclosure shadow. It is vertically centered in the upper command enclosure using `top:50%;transform:translateY(-50%);right:-70px`, leaving heading/search clear while crossing the right lip. The opening state retains 48px top margin and a 43% right column. From 768px through 1359px it uses `width:calc(40% + 80px);right:-8px`, retaining the vertical centering with less side overlap. At 767px and below it returns to document flow with no transform, at `width:min(100%,520px)` and 1.25 aspect ratio; existing layout order places it visually after the starter drawer. The figure is purely decorative and adds no keyboard stop. Search/results and About omit the entire hero.

The local Three.js 0.186.1 scene uses actual annular front/back faces, a thin outer edge, an open center and hub, two chrome torus orbits and a mirrored sphere. Procedural spectrum and thin-film maps supply broad rainbow bands; authored cool sky/area panels illuminate the disc and RoomEnvironment supplies studio reflections for chrome. No remote model, image or environment map is fetched. A transparent 2000×1600 PNG exported directly from the same renderer is the canonical static fallback; its source hashes, asset hash and provenance are in `docs/art-direction/orbital-disc-model.json`. Preserve this same-scene fallback rather than reverting to the earlier generated image.

**The Task Before Hero Rule.** Put search and starting choices before decorative media on narrow screens; remove the reservation from working states. Keep Orbital Disc decorative so it adds no keyboard stop.

## Elevation & Depth

Narrow silver-blue gradient lips, inset highlights and diffuse shadows frame near-opaque reading interiors. The product header uses 14px backdrop blur. The chrome lip is 6px desktop/4px mobile. Gradients belong to the page ground, enclosure edges and product button material; original comparison hero fills remain flat, with the scoped raster and authored 3D artwork-demo exceptions above. Button faces remain opaque above the metallic rim and optional shader; static gloss bands and a stationary conic edge highlight enrich idle controls without animation.

### Shadow Vocabulary
- **Enclosure:** `0 16px 38px #28476724,inset 0 1px 1px #fff`.
- **Reading field:** `inset 0 1px 0 #fff,inset 0 -1px 0 #d3e2f3`.
- **Header:** `inset 0 1px 0 #fff,0 8px 24px #29486b14`.
- **Orbital sculpture:** `filter:drop-shadow(0 22px 15px #28476726)` on the transparent stage, not an enclosure; forced colors remove the filter.
- **Button material:** `inset 0 1px 0 #fff,0 3px 8px #29486b14`; opaque gloss-banded inset face at 3px, or 2px for starter and match frames. Icy faces add `inset 0 -5px 8px #7899bc26`; cobalt faces use `inset 0 1px 0 #ffffff80,inset 0 -5px 8px #061d5433`.

The dark translucent picker is external comparison chrome in document flow. Reduced transparency solidifies header, reading field and contents index; forced colors replace material fills with system canvas and borders.

**The Selective Chrome Rule.** Use reflective seams at enclosure and button boundaries while keeping reading faces, fields and result lists calm.

## Shapes

Nest smaller reading surfaces inside rounded enclosures: desktop enclosure/inner radii, then 26px/22px outer/inner on mobile. Fields and disclosures share the field radius; navigation and action buttons use pills. Original hero reservations use the hero/display radius; v2 and the three retained Disc Tray raster demos use circular insets. The explicitly authorized Orbital Disc has no enclosing circle or clipped container; only its physical disc and orbit geometry are circular. Strokes are 1px. Keyboard focus uses a 3px outline and 3px offset with supporting canvas rings on buttons, summaries and links; contents links use a zero outline offset.

## Components

### Buttons and fields

All product native buttons share the liquid-metal material: a responsive silver-blue rim, stationary conic edge highlight, opaque gloss-banded icy face and existing semantic labels. Primary actions use an opaque gloss-banded cobalt gradient with white text; secondary/reseed actions retain cobalt text. Text actions are material pills with horizontal inset padding, without underlines. Starter and search-match choices use the same material as full-width frames at the field radius, with 14px horizontal padding and 5px block margins. Frontmatter button colors describe base roles; full gradient and state recipes live in the sidecar. Preserve native search inputs, selects, labels and helper text; controls maintain specified 44px targets and search has a 50px minimum height. Fine-pointer hover moves the conic highlight across the button width and rotates it 270 degrees over 650ms with exponential ease-out; the reading face stays opaque. Pointer presses scale enabled buttons to .98 outside keyboard focus; disabled buttons use divider/inset fills, muted text and no shadow.

Button transforms transition for 150ms. A pointer click produces one contained 550ms radial ripple at its click position. The optional Paper liquid-metal shader loads lazily for fine-pointer mouse hover or a bounded pointer-click ripple, fades in over 240ms once ready, then fades out over 180ms after interaction before disposal. Its canvas stays mounted through the exit; rapid re-entry cancels disposal and reuses the context. The shader runs only during hover, the bounded ripple or its short exit; static idle gloss and conic highlights have no loop. Keyboard activation remains static. Reduced motion removes transitions, shader animation and ripples; reduced transparency suppresses shader/ripple/shimmer and removes the outer material shadow; forced colors replace the material with system button colors and a visible border. Failed WebGL or an unavailable shader chunk retains the complete CSS/native button. The sidecar previews the glossy CSS material and bounded conic sweep without requiring the React shader runtime.

Native disclosure summaries retain underlines; navigation links and comparison harness retain their existing treatment. Native disclosures and variant replacement are immediate; only the external picker highlight transitions for 250ms. Page entrances and page parallax remain absent. The explicitly authorized Orbital Disc motion below is the only animated hero exception.

### Orbital Disc motion and fallback

The opening-state sculpture stays still at idle. Only mouse hover enables disc rotation at .065 radians per second and .035-unit vertical drift at `sin(elapsed * .32)`. Mouse movement during hover eases sculpture tilt toward ±.2 radians vertically and ±.28 horizontally, and shifts the rim light; pointer leave stops the loop. Easing uses `1 - exp(-dt * 7)` with frame delta capped at .05 seconds. Touch and reduced-motion users retain a still scene. Keep the canvas and fallback hidden from assistive technology; the user removed the Pause/Resume button, and this decorative hero has no control or focus target.

Rendering suspends when the host is offscreen or the document is hidden. DPR is capped at 1.5; ResizeObserver updates the renderer. An unavailable scene import, WebGL failure or lost context reveals the transparent same-scene fallback. Working-state transition or unmount cancels the animation, disconnects observers/listeners and disposes scene resources. These are implemented lifecycle rules, not measured battery or frame-rate guarantees.

Orbital geometry tests cover widths 320, 390, 550, 569, 768, 1024, 1253 and 1440px; the current assertions check vertical centering and control clearance instead of the superseded high placement. The centered capture set covers entry, tilt, fallback, results and About at desktop 1440×900, mobile 390×844, user 550×766, live 569×792, medium 1253×705 and live-wide 1305×792. All 30 current capture hashes are verified against `docs/evidence/stage-9-orbital-centered-captures.json`. The 1305px set records the wider in-app browser used during live verification; it adds rendered overflow/review evidence, not another geometry-test width. The earlier raised model and Pause/Resume iteration remains historical evidence in the 36-capture `docs/evidence/stage-9-orbital-hero-captures.json`; it does not describe the current layout or motion behavior.

### Reading panels and track evidence

Near-opaque panels contain ruled lists, tabular ranks and native disclosures with inset evidence fills. v4 uses denser title/artist columns. v5 puts evidence in a separate inspector: Details focuses its heading; return uses a connected originating trigger or the first current Details button. Counts do not imply enjoyment probability.

### Navigation and data state

Discover/About use pill selection and `aria-current`; mobile stacks the header. Preserve conventional About anchors, the skip link and visible focus. The comparison picker stays outside product navigation and in document flow so it cannot cover controls. Demo/scenario selectors are preview tools.

Demonstration mode keeps its notice and illustrative-ordering language. Real failures never load fixtures. Loading, limited lists, omitted metadata, empty connections, unavailable links and retry states remain explicit across all structures.

## Do's and Don'ts

### Do:
- **Do** retain all five structures, routes and comparison history until and after the user's structure selection.
- **Do** keep shared Manrope typography, near-opaque reading fields, cobalt actions and selective enclosure chrome.
- **Do** reuse the shared glossy liquid-metal button material with opaque reading faces, static idle highlights, bounded pointer feedback and static keyboard/fallback behavior.
- **Do** preserve original comparison flat fills and mappings, and the three retained raster demos' circular 1:1 slot. Give only Orbital Disc its approved vertically centered right-side overlap, same-scene transparent fallback, hover-only motion and task-first mobile order.
- **Do** preserve native controls, visible focus, reduced-motion, reduced-transparency and forced-color treatments.
- **Do** label demonstration fixtures persistently and keep real failures separate from demo data.
- **Do** treat review/capture evidence as scoped evidence, not deployment, user research or full accessibility conformance. Current centered Orbital evidence contains five states at six viewport sets (30 verified captures), including the 1305×792 wider in-app browser; preserve the distinction from the eight geometry-test widths and earlier 36-capture iteration.

### Don't:
- **Don't** extend the Orbital Disc 3D/motion exception to other routes or add unrelated artwork, reference pixels, remote models/images or decorative playback controls. Keep original comparison routes artwork-free; Orbital Disc stays still except during mouse hover and has no Pause/Resume control.
- **Don't** replace structural differences with typography/theme swaps or reserve blank hero space in working screens.
- **Don't** turn approved glass/chrome into a generic ban or extend translucency into low-contrast reading regions.
- **Don't** treat Disc Tray body selection or the artwork demos as authorization for production promotion, Stage 10 or deployment; final hero artwork remains unselected.
- **Don't** inflate catalog, link, model-quality or personalisation claims beyond PRODUCT.md and frozen evidence.

Not canonized: dark system-font picker styling is comparison tooling, not product identity; unverified hardware, screen-reader and deployed-performance behavior is not a system guarantee. The launcher/Impeccable engine were unavailable; this normalization used the documented direct-source fallback without global tooling installation. No additional defects were repaired by documentation.
