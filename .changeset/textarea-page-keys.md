---
'@gpuix/native': minor
---

Support `Page Up` and `Page Down` in `<textarea>`. They move the caret by the
editor's visible height and scroll by the same amount, so the caret keeps its
place on screen; with `Shift` they extend the selection. They are editor
actions bound to GPUI's `pageup` and `pagedown` keys, like the arrow keys.
