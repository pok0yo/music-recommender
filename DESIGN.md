---
name: Music Recommender
description: Five discovery structures in one icy acrylic and selective chrome world.
colors:
  canvas: "#edf5ff"
  surface: "#fcfdff"
  ink: "#173250"
  primary: "#153ea8"
  muted: "#465f7b"
  orbital-muted: "#28435f"
  atmosphere-glass: "#f1f8ffbd"
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
  orbital-display:
    fontFamily: "Michroma, sans-serif"
    fontSize: "40px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-.025em"
  orbital-brand:
    fontFamily: "Michroma, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    letterSpacing: ".015em"
  orbital-about:
    fontFamily: "Michroma, sans-serif"
    fontSize: "clamp(28px,3.5vw,44px)"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "-.025em"
  orbital-section:
    fontFamily: "Michroma, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    letterSpacing: "-.015em"
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
  orbital-reading-panel:
    backgroundColor: "{colors.atmosphere-glass}"
    textColor: "{colors.ink}"
    rounded: "{rounded.inner}"
    padding: "28px"
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

The subsequent Disc Study exploration settles the aesthetic preference on incumbent v2 and the body choice on Disc Tray. Gatefold, Disc Tray and Liner Notes remain available for comparison. The four-option artwork comparison lives only in working Disc Tray demos at `/prototypes/disc-tray/artwork/{slug}`; the picker changes artwork while preserving discovery state. The user subsequently authorized a larger interactive 3D Orbital Disc exploration, replacing only that option's circular raster enclosure. The other three options retain their generated originals, and the original five previews and three body-comparison routes retain flat placeholders. The latest user adjustment vertically centers the model in the upper tray and removes its Pause/Resume control; rotation, tilt and shine now respond only during mouse hover, with a still idle pose. The earlier approved atmosphere refinement introduced one Higgsfield environment and locally served Michroma display lettering only to the selected Orbital Disc Discover/working/About route. The approved shared liquid-glass extension applies reflective controls and frosted enclosures throughout existing routes while preserving palette, typography, layouts, scoped atmosphere and the centered hover-only disc. The subsequent chrome-field checkpoint added three original local static sculptures, hollow enclosure rims and more translucent reading faces only to the selected Orbital route. The current approved icy-water replacement removes those scattered background layers and the earlier environment from the selected route, using one original built-in image_gen raster with responsive crops: left-weighted blue-metal ribbon and folded fin, reflective water, faint curved lines, blue haze and print grain. It preserves the hollow rims, frosted faces, type, model geometry and placement, shared-glass baseline elsewhere and all stage gates. This remains a reviewable Stage 9 iteration, not final artwork acceptance or production promotion.

**Key Characteristics:**
- Five distinct app structures with shared Manrope base typography, content and behavior; the selected Orbital demo alone adds Michroma short display lettering.
- Sculpted enclosure lips around pale reading fields; the selected Orbital route uses hollow rims and approximately 74% frosted faces.
- Shared translucent liquid-glass controls, cobalt primary faces and pale frosted reading planes; pointer-lit decoration remains behind labels.
- Flat CSS heroes in original comparisons; three local raster artwork options and one locally authored 3D Orbital Disc with a transparent static fallback in the authorized Disc Tray demos.
- One original icy-water raster and its responsive crops compose the selected Orbital background; blue-metal sculpture, water, curved lines, haze and grain are baked into that image, while protected frosted reading planes preserve the task.
- Native controls, visible keyboard focus and task-first mobile flow.
- Persistent demonstration labels and an explicit real-data boundary.

## Colors

Cool pearl and ice-blue surfaces support dark blue reading text and cobalt actions. Frontmatter values come from implemented stylesheets; complete gradient and material recipes live in the sidecar.

### Primary
- **Cobalt:** headings, selected navigation, action text, primary buttons, caret and keyboard focus.

### Neutral
- **Ice canvas / Pearl surface:** ground token and solid controls or displays. The baseline page ground is a cool three-stop gradient; only the selected Orbital demo adds the scoped environment treatment below.
- **Deep blue ink / Secondary blue ink:** primary reading text and supporting metadata. The scoped orbital-muted token darkens secondary text only in the selected Orbital demo.
- **Field edge / Divider / Inset:** strong control boundaries, quiet separators and evidence or demonstration backgrounds.
- **Reading field / Header:** pale near-opaque shared enclosure interiors and translucent product navigation. Only the selected Orbital demo uses atmosphere-glass for approximately 74% frosted faces; reduced transparency restores opaque surfaces.
- **Hero v1–v5:** flat reservations mapped in Layout.
- **Notice / Problem pairs:** limited-result and failure messages with explanatory text; color alone never carries state.

**The Reading Field Rule.** Keep shared reading regions pale and near-opaque; only the selected Orbital route uses the atmosphere-glass face with darker orbital-muted supporting text. Text must never depend on artwork or distorted decoration for contrast, and opaque preference fallbacks remain available.

## Typography

**Base Display and Body Font:** Manrope with sans-serif fallback. The application loads Latin weights 500 and 600; unsupported Unicode uses the platform fallback. System typography belongs to the external comparison harness. The selected Orbital demo additionally loads Michroma Latin 400 from local `@fontsource/michroma` 5.3.0; retain its SIL OFL 1.1 notice at `public/third-party/michroma/OFL.txt`.

- **Display:** opening heading reduces from the frontmatter role to 40px at tablet and 32px at mobile.
- **Headline:** compact v3–v5 command headings. v1/v2 working headings use 30px; the shared working-heading selector also includes 28px/1.2/600 where applicable.
- **Title:** recommendation section headings. Selected-track names use 24px at their inherited track-title weight (500), reducing to 22px on mobile.
- **Body:** task explanations use 16px/1.6 and a 38ch measure; About uses 1.8 line-height and up to 70ch.
- **Label / Button:** 14px metadata and actions; artist metadata is normally 15px. Result names use 18px, while the ledger uses 16px titles.
- **Native inputs/selects:** at least 16px.

### Selected Orbital display exception

Only `[data-artwork=orbital-disc]` uses the four `orbital-*` frontmatter roles. Branding and its mark use 13px Michroma; opening headings use 40px/1.2, uppercase and `font-style:oblique 10deg`, with a 13ch maximum. At 1023px they reduce to 32px; mobile uses `clamp(25px,5.8vw,36px)`. Working headings use 28px with a 26ch maximum before the narrower mobile rule. About headings use the recorded clamp, a 22ch maximum and 26px on mobile. Result-section headings use 14px Michroma. Keep controls, explanatory copy, song identities, evidence and metadata in Manrope; unsupported glyphs and font failures retain readable sans-serif fallback.

**The Shared Voice Rule.** Keep Manrope and its loaded 500/600 weights as the base across all five structures. Only the selected Orbital demo may use locally served Michroma 400 for branding and short display headings; other comparisons retain their existing typography.

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

Only `/prototypes/disc-tray/artwork/{slug}` and its optional `/about` use the four-option artwork picker below. Discover entry alone displays the hero artwork; search/results and About omit the hero. The selected Orbital demo's separately approved static environment persists behind working states and About. Picker changes preserve the current query, seed, recommendations and data context through the shared discovery state.

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

### Selected Orbital atmosphere

Only the selected `[data-artwork=orbital-disc]` Discover, working/results and About surfaces use `v2/atmosphere.css`. One built-in image_gen original supplies the current icy-water environment. Its retained, unchanged PNG is native 1672×941, not 2K or an upscaled 2K asset; the interface loads only the three optimized WebP derivatives. The 1672×941 wide derivative (196,460 bytes) uses `cover` at `left top` on an ice fallback (`#daeaf5`). At 767px and below the page switches to a 528×940 west crop (86,990 bytes); About uses a 640×640 west crop (68,870 bytes) at right center in the right 32% of its introduction and removes the detail on mobile. These are three derivatives of one generated image, not independent artworks. The prompt's requested 2K label does not change the actual native resolution. The request and rationale live in `docs/art-direction/icy-water-request.json`; actual dimensions, bytes, hashes and crop roles live in `docs/art-direction/icy-water-assets.json`, with the crop recipe in `scripts/prepare-disc-tray-environment.mjs`.

The blue-metal ribbon and folded fin, reflective water, faint curving perspective lines, blue haze, bloom and fine print grain belong to that single raster. They are not separate transparent objects, SVG grain, CSS animation or another renderer. The left edge carries the dense sculpted metal and reflection; the central/right atmosphere stays calm behind the interface and free-standing disc. Reference images guide the original material and atmosphere; no reference pixels are shipped. The former `chrome-orbit`, `liquid-comma` and `aero-spine` assets and earlier Higgsfield environment remain retained historical sources, with provenance in `docs/art-direction/chrome-accents.json` and `docs/art-direction/disc-tray-environment-assets.json`; they are absent from the current selected-route CSS and are not guidance for new background layers. No new dependency, decorative DOM, runtime scene or background animation accompanies this replacement.

The selected opening upper panel does not repeat the environment or carry an opaque gradient backing. The global field remains visible through atmosphere-glass reading faces, with orbital-muted supporting text; the selected face filter is 8px blur/125% saturation. Header, reading shells, contents index, demo notice, release context, About boundary and footer share that face. About keeps its 34% text reservation beside the detail. At mobile widths the opening command has its own frosted face, while the opening wrapper and upper panel retain display:contents and no enclosing rim around the free-standing hero. This background replacement preserves the existing glass tokens, isolated hollow-rim stacking, all type and component sizes, and model geometry/placement.

The earlier near-white opening mask, near-opaque selected planes, scattered chrome field and prior environment describe superseded checkpoints. Their retained evidence remains historical. The current icy-water capture manifest is `docs/evidence/stage-9-icy-water-captures.json`: 24 final captures cover ten states each at desktop 1440px and mobile 390px, plus 1908px entry, model hover, results and About. Six initial timing captures were replaced to show the actual zero, error and long-metadata states. Fresh visual/source review validated all 24 final captures and identified the documentation drift addressed by this merge. Parent-recorded verification reports production build/typecheck passing, 39/39 local Chrome tests with zero failed/skipped/flaky in `test-results/frontend-results.json`, and zero model/rim differential across 418 opaque model pixels. The subsequent scored verdict resolves the documentation finding (ship at that fix's scope); neither these checks nor that verdict establishes final artwork acceptance. Hash verification alone is not rendered visual review; do not reuse earlier 38-test, 24-capture chrome-field or eight-capture layering results as current icy-water evidence.

Images are decorative local CSS backgrounds: no fixed attachment, added animation, remote runtime image request, control or factual content. Forced colors replaces the page, upper-panel and About-intro imagery with `Canvas`; missing images leave pale fallback surfaces. Preserve the centered hover-only 3D disc as a separate authored scene and keep the other three artwork routes and original comparisons unchanged.

**The Task Before Hero Rule.** Put search and starting choices before decorative media on narrow screens; remove the reservation from working states. Keep Orbital Disc decorative so it adds no keyboard stop.

## Elevation & Depth

Narrow silver-blue gradient lips, inset highlights and diffuse shadows frame pale frosted reading interiors. The shared glass override uses `#f3f9ffe6` with 14px blur/130% saturation for headers, reading shells and contents indexes; ordinary controls use 10px blur/140% saturation. The chrome lip remains 6px desktop/4px mobile. Only the selected Orbital route removes the frame backing and draws that lip as a hollow masked pseudo-element, allowing its atmosphere-glass face and 8px blur/125% saturation to reveal the background. Each selected glass shell uses `isolation:isolate`, and its decorative `::after` rim uses `z-index:-1` behind the content, so the nested backdrop-filter context cannot paint the rim over the disc or its orbit. Preserve the model and static fallback geometry, position and size; correct the rim layer rather than moving the artwork. The mobile opening display:contents wrapper still disables that pseudo-element so no rim surrounds the free-standing hero. Original comparison hero fills remain flat, with the scoped raster and authored 3D artwork-demo exceptions above. Translucent icy button faces and strongly tinted cobalt primaries now supersede the original opaque button recipe; static gloss and conic highlights remain still at idle.

### Shadow Vocabulary
- **Enclosure:** `0 16px 38px #28476724,inset 0 1px 1px #fff`.
- **Reading field:** `inset 0 1px 0 #fff,inset 0 -1px 0 #d3e2f3`.
- **Header:** `inset 0 1px 0 #fff,0 8px 24px #29486b14`.
- **Orbital sculpture:** `filter:drop-shadow(0 22px 15px #28476726)` on the transparent stage, not an enclosure; forced colors remove the filter.
- **Button material:** retained base shadow `inset 0 1px 0 #fff,0 3px 8px #29486b14`; its old opaque face recipe is historical/base CSS now overridden by shared translucent glass. Existing inset geometry and face highlights remain.
- **Native glass controls:** `inset 0 1px 0 #fff,inset 0 -1px 0 #88b0d94d,0 4px 12px #28476714`.

The external comparison picker remains in document flow and now shares the frosted material (`#d5e5f3c7`, 12px blur); the preview bar uses `#eff7ffcc` with 14px blur. Reduced transparency removes glass backgrounds/blur and restores opaque surface/cobalt states. Forced colors uses system canvas, text and visible borders. Comparison tooling remains outside product identity even though it shares this material.

**The Selective Chrome Rule.** Use reflective seams at enclosure and button boundaries while keeping reading faces, fields and result lists calm.

The preceding narrow hero-layering correction follows the user's circled occlusion screenshot. The source-recorded screenshot differential found a maximum RGB-channel change of 102 before the correction when the rim was hidden, and 0 after it across 418 fully opaque model pixels crossing the rim at 1920px. This is a browser-paint regression for that intersection, not a model-position change or a general rendering guarantee. That checkpoint's capture manifest is `docs/evidence/stage-9-hero-layering-captures.json`, scoped to eight captures: 1440px entry/results/About/opaque, 390px entry/About and the supplied 1908px viewport entry/model hover. Its local Chrome suite passed all 39 tests, and its fresh visual/source review returned ship. Those eight captures, and the preceding 24 chrome-field captures and 38-test result, remain separate historical evidence; the current icy-water scope is recorded in Layout above.

## Shapes

Nest smaller reading surfaces inside rounded enclosures: desktop enclosure/inner radii, then 26px/22px outer/inner on mobile. Fields and disclosures share the field radius; navigation and action buttons use pills. Original hero reservations use the hero/display radius; v2 and the three retained Disc Tray raster demos use circular insets. The explicitly authorized Orbital Disc has no enclosing circle or clipped container; only its physical disc and orbit geometry are circular. Strokes are 1px. Keyboard focus uses a 3px outline and 3px offset with supporting canvas rings on buttons, summaries and links; contents links use a zero outline offset.

## Components

### Buttons and fields

Native product buttons retain the shared liquid-metal structure, semantics, dimensions, silver-blue rim and stationary conic highlight. The final `components/ui/liquid-glass.css` override makes icy faces translucent: outer `linear-gradient(125deg,#ffffffaa,#adcee480 45%,#fff9)` and inset `linear-gradient(180deg,#ffffff9c,#f0f8ffc9 42%,#dceafa80 49%,#edf5fdb3)`. Primary faces retain white text over `linear-gradient(180deg,#315dc5f5,#153ea8f5 49%,#12358ef5)`. The original opaque recipe remains as base CSS, not a mandate for new action surfaces. Frontmatter colors remain semantic/base roles; the sidecar distinguishes retained base previews from the current shared-glass preview.

Text actions remain pills; starter and match frames retain the field radius, 14px horizontal padding and 5px block margins. Native controls retain their labels, helper text and focus: 44px targets, with 50px search minimum. Search fields, native selects, native summaries and header/footer/contents links gain a translucent pale tint, fine border and static radial highlight; active navigation stays cobalt. Summaries/footer/contents links use a 12px radius and 10px 12px padding; the brand uses a 16px radius and 6px 10px padding. Fine-pointer button shimmer still sweeps over 650ms, while pointer presses scale enabled buttons to .98 outside keyboard focus. Disabled controls keep native disabled behavior and muted divider/inset fills.

Button transforms transition for 150ms. A pointer click produces one contained 550ms radial ripple at its click position. The optional Paper liquid-metal shader loads lazily for fine-pointer mouse hover or a bounded pointer-click ripple, fades in over 240ms once ready, then fades out over 180ms after interaction before disposal. Its canvas stays mounted through the exit; rapid re-entry cancels disposal and reuses the context. The shader runs only during hover, the bounded ripple or its short exit; static idle gloss and conic highlights have no loop. Keyboard activation remains static. Reduced motion removes transitions, shader animation and ripples; reduced transparency suppresses shader/ripple/shimmer and removes the outer material shadow; forced colors replace the material with system button colors and a visible border. Failed WebGL or an unavailable shader chunk retains the complete CSS/native button. The sidecar retains the original base recipes as labeled historical/base previews and adds a current static shared-glass preview; runtime shader and delegated pointer tracking are not required by that preview.

Native disclosure summaries retain their semantics and underlines with the shared glass skin; navigation and comparison controls retain their destinations/state. Native disclosure opening and route replacement remain immediate. The external picker highlight retains its 250ms transition. Page entrances and page parallax remain absent; Orbital Disc remains the sole animated hero.

### Shared liquid-glass interaction

All existing `.app-surface` routes share this material: product buttons, links/navigation, search inputs, native selectors and summaries, plus prototype pickers and reading enclosures. Existing layout structures, palette, typography scope, source-grounded copy and recommendation behavior remain. Browser-owned native popup option menus keep their native rendering.

Each shared button includes three decorative layers (`glass-distortion`, `glass-tint`, `glass-shine`) inside an `aria-hidden`, noninteractive `GlassEffect`. One hidden global SVG filter provides a 16px displacement only on the active decorative layer; labels and content are never filtered. CSS tint, backdrop blur and fine specular rims remain usable when filtering is unsupported. No pasted dock, image button, unrelated destination, demo wallpaper, perpetual background animation or new graphics dependency is part of this system.

One delegated, cleaned-up pointer handler targets native `button`, `a`, `input`, `select` and `summary` elements. Only mouse movement writes local `--glass-x`/`--glass-y` coordinates and `data-glass-active`; requestAnimationFrame coalesces updates without an idle loop. Target change, pointer exit, lost window focus, document visibility change, preference changes and unmount clear pending work/state. Disabled controls are excluded. Decoration and hover state do not change control padding, bounds or native action.

Glass shine transitions opacity for 220ms with `cubic-bezier(.16,1,.3,1)`; native field/link/summary background and shadow feedback uses 180ms ease-out. Reduced motion stops pointer tracking and SVG distortion; reduced transparency and forced colors stop tracking, hide decorative layers, remove backdrop filters and provide static readable native controls. Preserve native focus, disabled state, links, search submission and keyboard disclosures. The existing bounded button shader/shimmer/ripple remains separate from the new delegated glass tracking.

Shared-glass checkpoint evidence is retained in `docs/evidence/stage-9-site-liquid-glass-captures.json`: 24 files with verified hashes. It covers selected-demo desktop/mobile entry, hover, focus, results, About, disabled and opaque preference states; desktop/mobile v1/v3/v4/v5 result comparisons; and 550px/1305px entry checks. Earlier atmosphere, centered-only and raised-hero capture manifests remain historical checkpoints. Browser screenshots and hash checks do not establish physical-device, Safari, screen-reader or measured-performance guarantees.

### Orbital Disc motion and fallback

The opening-state sculpture stays still at idle. Only mouse hover enables disc rotation at .065 radians per second and .035-unit vertical drift at `sin(elapsed * .32)`. Mouse movement during hover eases sculpture tilt toward ±.2 radians vertically and ±.28 horizontally, and shifts the rim light; pointer leave stops the loop. Easing uses `1 - exp(-dt * 7)` with frame delta capped at .05 seconds. Touch and reduced-motion users retain a still scene. Keep the canvas and fallback hidden from assistive technology; the user removed the Pause/Resume button, and this decorative hero has no control or focus target.

Rendering suspends when the host is offscreen or the document is hidden. DPR is capped at 1.5; ResizeObserver updates the renderer. An unavailable scene import, WebGL failure or lost context reveals the transparent same-scene fallback. Working-state transition or unmount cancels the animation, disconnects observers/listeners and disposes scene resources. These are implemented lifecycle rules, not measured battery or frame-rate guarantees.

Orbital geometry tests cover widths 320, 390, 550, 569, 768, 1024, 1253 and 1440px; the current assertions check vertical centering and control clearance instead of the superseded high placement. The centered capture set covers entry, tilt, fallback, results and About at desktop 1440×900, mobile 390×844, user 550×766, live 569×792, medium 1253×705 and live-wide 1305×792. The prior atmosphere checkpoint has 30 verified capture hashes in `docs/evidence/stage-9-disc-tray-atmosphere-captures.json`; the newer shared-glass evidence above records the current control material. The earlier centered-only 30 captures remain historical checkpoint evidence in `docs/evidence/stage-9-orbital-centered-captures.json`. The 1305px set records the wider in-app browser used during live verification; it adds rendered overflow/review evidence, not another geometry-test width. The earlier raised model and Pause/Resume iteration remains historical evidence in the 36-capture `docs/evidence/stage-9-orbital-hero-captures.json`; it does not describe the current layout or motion behavior.

### Reading panels and track evidence

Pale frosted panels contain ruled lists, tabular ranks and native disclosures with inset evidence fills. Shared routes retain near-opaque glass; the selected Orbital route uses the scoped atmosphere-glass face, darker supporting text and hollow rim described above. v4 uses denser title/artist columns. v5 puts evidence in a separate inspector: Details focuses its heading; return uses a connected originating trigger or the first current Details button. Counts do not imply enjoyment probability.

### Navigation and data state

Discover/About use pill selection and `aria-current`; mobile stacks the header. Preserve conventional About anchors, the skip link and visible focus. The comparison picker stays outside product navigation and in document flow so it cannot cover controls. Demo/scenario selectors are preview tools.

Demonstration mode keeps its notice and illustrative-ordering language. Real failures never load fixtures. Loading, limited lists, omitted metadata, empty connections, unavailable links and retry states remain explicit across all structures.

## Do's and Don'ts

### Do:
- **Do** retain all five structures, routes and comparison history until and after the user's structure selection.
- **Do** keep Manrope base typography, protected pale reading fields, cobalt actions and selective enclosure chrome; scope Michroma 400, the single icy-water raster environment, atmosphere-glass faces and darker orbital-muted text to the selected Orbital demo.
- **Do** apply shared liquid glass across native interactive surfaces, preserving labels and actions, stable hover bounds, calm frosted reading planes, static idle highlights and readable preference/failure fallbacks.
- **Do** preserve original comparison flat fills and mappings, and the three retained raster demos' circular 1:1 slot. Give only Orbital Disc its approved vertically centered right-side overlap, same-scene transparent fallback, hover-only motion and task-first mobile order.
- **Do** preserve native controls, visible focus, reduced-motion, reduced-transparency and forced-color treatments. Keep the selected mobile opening display:contents wrapper rim-free so the hero remains free-standing.
- **Do** label demonstration fixtures persistently and keep real failures separate from demo data.
- **Do** treat review/capture evidence as scoped evidence, not deployment, user research or full accessibility conformance. Retain the earlier shared-glass 24-capture, chrome-field 24-capture/38-test and hero-layering eight-capture/39-test checkpoints as separate historical evidence. Current icy-water evidence is the 24 final captures in docs/evidence/stage-9-icy-water-captures.json and the 39/39 local Chrome result in test-results/frontend-results.json, together with the parent-recorded build/typecheck and 418-pixel rim regression checks. The fresh review found documentation drift, subsequently corrected and scored resolved (ship for that finding only) in docs/evidence/stage-9-icy-water-review.md.

### Don't:
- **Don't** extend Orbital's 3D, icy-water environment, translucent face or display-font exceptions to other routes, copy reference pixels, add remote runtime models/images or invent playback controls. Keep original comparisons artwork-free and body/control typography in Manrope; Orbital stays still except during mouse hover and has no Pause/Resume control.
- **Don't** replace structural differences with typography/theme swaps, reserve blank hero space in working screens or describe responsive environment crops as independent generated artworks.
- **Don't** turn approved glass/chrome into a generic ban, distort labels/content, replace native actions with decorative divs or extend translucency into low-contrast reading regions.
- **Don't** treat Disc Tray body selection or the artwork demos as authorization for production promotion, Stage 10 or deployment; final hero artwork remains unselected.
- **Don't** inflate catalog, link, model-quality or personalisation claims beyond PRODUCT.md and frozen evidence.

Not canonized: the earlier scattered chrome accents and Higgsfield environment are historical assets, not the current background recipe; baked raster grain/haze/lines do not authorize SVG noise, extra objects or another renderer. Comparison-picker typography remains tooling, not product identity. No detector ran because the launcher/Impeccable engine was unavailable; this merge uses the documented direct-source fallback without global tooling installation. Remote CI, Safari, physical-device, screen-reader and measured-performance behavior remain unverified. The subsequent scored review resolves documentation drift only, with ship recorded at that fix's scope in stage-9-icy-water-review.md.
