---
'@gpuix/native': patch
---

Moving the caret in a `<textarea>` no longer reshapes its whole text. Taffy
measures an editor at several widths each frame (its minimum, then its real
width), and every frame measured it again, shaping every line each time. The
editor now keeps its last few layouts and reuses one while the text, style,
`textHighlights`, IME composition and wrap width are unchanged; without
wrapping the width is not part of the key at all. Registering a font with
`registerFont` invalidates them. On a 337-line document this took the editor's
layout work from about 6.5ms to near zero per frame.
