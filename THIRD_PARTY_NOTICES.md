# Third-party notices

## Stylized Components — Christian Ortiz (Cortiz)

The layered Voronoi / smooth-F1 water approach and GLSL helpers in `components/stylized-water.ts` are adapted from [cortiz2894/stylized-components](https://github.com/cortiz2894/stylized-components), commit `1cece0a296b29299d1380c34feb5c158b2f04500`.

Reference files: `src/components/waterFloor/shaders/fragment.ts` and `src/components/waterFloor/components/SeabedFloor/shaders/fragment.ts`. This adaptation merges distance passes, adds displaced geometry and wave normals, integrates the existing live reflector, changes the palette/flow/contours, and provides a bounded software-rendering path. It does not import the reference's React Three Fiber components, models, assets or multi-pass simulation.

MIT License

Copyright (c) 2026 Christian Ortiz (Cortiz)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
