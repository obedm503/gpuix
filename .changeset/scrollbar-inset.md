---
'@gpuix/native': minor
---

Scroll thumbs sit 3px inside the edges of their viewport instead of flush
against them, and their track stops 3px short of each end. The band a thumb
takes along its edge, the thumb plus that gap on each side (12px with the
default `scrollbarWidth`), is also its grab area, so a 6px thumb is easy to hit.
Keep content clear of that band, for example with 12px of padding.
