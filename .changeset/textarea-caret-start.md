---
'@gpuix/native': patch
---

A `<textarea>` opens with the caret at the start of its text instead of the end,
and a new `value` puts it back there. The editor scrolls to keep the caret in
view, so a long document used to open scrolled to its last line. An `<input>`
still puts the caret at the end.
