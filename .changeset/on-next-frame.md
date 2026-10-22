---
'@gpuix/native': minor
---

Add `renderer.onNextFrame(callback)`. It calls `callback` once, when GPUI
starts its next frame and before it draws, like `requestAnimationFrame`, so
JavaScript can pace work to the frame rate, for example dropping held-key
repeats while a slow frame is still drawing. It is GPUI's
`Window::on_next_frame`, on macOS, Windows and Linux. See [Next frame](./README.md#next-frame).
