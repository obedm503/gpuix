//! Selectable text: the shared foundation for every text GPUIX paints.
//!
//! Ported from Comet (https://github.com/zeronsh/comet), MIT.
//!
//! Every text node in GPUIX goes through [`paint::selectable_text`], so a drag
//! can start in a plain `<text>` and end inside a `<code>` block. That only
//! works because all of them register into the same per-frame registry in paint
//! order. Adding a new text-painting element means calling that helper, never
//! `div().child(string)`.

pub mod highlights;
pub mod paint;
pub mod runs;
pub mod search;
pub mod selection;

use std::sync::atomic::{AtomicU64, Ordering};

static FONT_GENERATION: AtomicU64 = AtomicU64::new(0);

/// Counts `registerFont` calls. Text shaped before a font arrived may shape
/// differently after, so layout caches include this in their key.
pub fn font_generation() -> u64 {
    FONT_GENERATION.load(Ordering::Relaxed)
}

pub(crate) fn fonts_changed() {
    FONT_GENERATION.fetch_add(1, Ordering::Relaxed);
}

pub use paint::{
    chrome_text, log_painted_text, painted_highlights, painted_text, range_rects,
    record_start_region, selectable_text, selection_frame_reset, selection_key, HighlightSource,
    PaintedHighlight, SelectableText, SharedSelection,
};
pub use search::{GroupList, HighlightContext, HighlightSet};
