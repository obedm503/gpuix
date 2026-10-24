---
'@gpuix/native': minor
---

A `<textarea>` with a `scrollbarColor` shows draggable scroll thumbs, like an
`overflow: 'scroll'` container: down its right edge when the text is taller
than the box, and along the bottom when `wrap={false}` lines are wider. They sit
at the edges of its padding box. When the padding is narrower than a thumb's
band, wrapped lines end before the thumb and the text can scroll past it, so a
thumb never hides text.
