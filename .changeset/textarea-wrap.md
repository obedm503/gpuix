---
'@gpuix/native': minor
---

Add `wrap` to `<textarea>`. `wrap={false}` keeps each line on one row and
scrolls the editor sideways instead, with a horizontal wheel or trackpad,
`Shift` plus the wheel, or by following the caret. GPUI already lays out an
unwrapped line when `shape_text` gets no wrap width; the editor now passes none
and clamps a horizontal scroll offset, as a single-line `<input>` does. Text
scrolled sideways is clipped to the text area, so it never draws over the
`showLineNumbers` gutter.
