# Stylized water — local implementation checkpoint

Prepared 2026-11-01 against `605ccc7`. This changes the selected Orbital record desk locally. The public release remains unchanged; activation is a separate authorized checkpoint.

## Reference and adaptation

[Stylized Components by Christian Ortiz (Cortiz)](https://github.com/cortiz2894/stylized-components), pinned at `1cece0a296b29299d1380c34feb5c158b2f04500`, supplies the layered F1/smooth-F1 Voronoi approach. Its water and seabed shader sources were inspected as text. The repository was not installed or executed. Credit and the full MIT license are retained in [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).

The adaptation lives in `components/stylized-water.ts`, called only by the selected scene in `components/rack-study-scene.ts`. It uses the existing Three.js renderer and live reflector, with no additional dependency, image, video, simulation buffer or render pass. The legacy `components/water-scene.ts` background is outside this checkpoint.

## Result

- Displaced geometry supplies broad swells and matching analytical normals. Detail is concentrated around the player, retaining the original 2,000-unit water extent. The quiet patch beneath the stand limits intersections with its feet.
- Warped, world-anchored cells drift at different surface/subsurface rates. A view-dependent offset separates the lower layer, while broken contour highlights and small normal ripples soften the cellular appearance. Distance and pixel-footprint fades reduce distant shimmer.
- The existing live scene reflection follows wave distortion. Icy blue shading, lilac/pink light, horizon haze and the sun remain controlled by the existing environment sliders; their defaults are unchanged.
- Water has its own accumulated clock. Pause, reduced motion and water speed zero freeze the current phase rather than snapping it back to its initial pose. Existing disc, sleeve, camera, discovery and loading behavior remain intact.

## Cost and limits

The mesh has 25,921 vertices on desktop, 12,769 on narrow layouts and 4,225 with software graphics. The existing reflection textures remain 1,024 / 512 / 256 pixels respectively. Desktop/narrow hardware uses two merged nine-neighbor cell passes; software graphics substitutes cheaper irregular noise contours while retaining displacement, reflections and the palette. Frame updates write uniforms outside React.

The reflector is planar with small-wave distortion, not a physically exact reflected view from every displaced point. Large storm waves would require another reflection approach. This remains stylized calm water, with no fluid collision simulation. Safari, physical phones and low-end physical GPU performance were not checked. Desktop animation timing does not establish mobile performance or GPU completion time.

The production build and TypeScript checks pass. Thirteen focused Chrome checks pass with hardware graphics, covering water behavior, the existing record-desk journeys and the startup loader; six water/loader checks also pass with software graphics. Desktop and 390x844 captures were reviewed. The three-second desktop browser-cadence sample measured a 13.3 ms median and 13.5 ms p95 interval; the CPU-only sample measured a 266.7 ms median and 333.3 ms p95 interval. Software rendering is functional but slow, even with cheaper water detail; no comparison against a software-rendered baseline was measured.

The preceding loader commit's full GitHub run [41358814287](https://github.com/pok0yo/music-recommender/actions/runs/41358814287) failed three checks: a retired-artwork redirect assertion, the record-desk pending-fixture search timeout, and startup-loader visibility. Those failures predate this water change. The focused local passes above do not establish a green full GitHub suite; broader startup/redirect investigation remains separate from this visual checkpoint.

Validation results, source hashes and measurement method are recorded in [stylized-water-checks.json](evidence/stylized-water-checks.json). Local review uses `http://127.0.0.1:3000/?mode=demo`; `&dev=1` exposes the existing environment controls. Demonstration results remain labeled and synthetic. These visual checks do not measure recommendation accuracy or hosted API latency.

## Rollback

Before public activation, the deployed site needs no rollback because it has not changed. To undo this checkpoint in source, revert its scoped commit; the prior water implementation is in `605ccc7:components/rack-study-scene.ts`. The loader, catalog, model, links, database and deployment configuration are independent of this change.
