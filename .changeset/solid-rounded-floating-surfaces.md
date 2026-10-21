---
'@gpuix/solid': patch
---

Keep rounded Select, Combobox, and Tooltip content rounded in `@gpuix/solid`.
`FloatingLayer` now puts border radii, `visibility`, and `opacity` (with hover
and active refinements) on its anchored surface, as `@gpuix/react` does, and
gives that surface an explicit transparent fill. The content already paints the
popup, so no fallback fill shows as square corners or as a dark rim around
rounded ones. Content opacity no longer multiplies against that fill.
