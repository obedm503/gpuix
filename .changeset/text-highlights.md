---
'@gpuix/native': minor
---

Add the `textHighlights` prop: styled ranges (`color`, `backgroundColor`,
`fontFamily`, `fontWeight`, `fontStyle`, `textDecoration`) over the text of a `<text>`,
`<div>`, `<input>` or `<textarea>`, in UTF-16 offsets. It is GPUI's
`StyledText::with_highlights`. Editors move the ranges through edits made since
the value they were computed for, so syntax colours stay on their text while
typing. See [Styled text ranges](./README.md#styled-text-ranges).
