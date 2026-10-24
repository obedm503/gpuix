---
'@gpuix/native': minor
---

Scroll thumbs can be dragged. Pressing a thumb grabs it where it was pressed;
pressing its track moves the thumb's middle there and grabs it. The thumb
darkens while hovered or held, shows an arrow cursor, and keeps the press from
reaching the content under it. A drag sets the scroll offset through GPUI's own
handles (`ScrollHandle::set_offset`, and `ListState::set_offset_from_scrollbar`
between `scrollbar_drag_started` and `scrollbar_drag_ended`), so `onScrollChange`
reports it like a wheel tick. Thumbs now get their hitboxes during prepaint, so
an overlay painted above a thumb still takes the click. See
[Scrollbars](./README.md#scrollbars).
