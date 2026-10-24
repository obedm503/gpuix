//! `textHighlights` via GPUI's `StyledText::with_highlights`. JS sends UTF-16
//! ranges; GPUI wants UTF-8 byte ranges on char boundaries. `HighlightStyle` has
//! no font family, so families go through `with_font_family_overrides`.

use std::ops::Range;

use gpui::{FontStyle, HighlightStyle, Hsla, SharedString, StrikethroughStyle, UnderlineStyle};
use serde::Deserialize;

use crate::style::FontWeightValue;

#[derive(Debug, Clone, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TextHighlightSpec {
    pub start: usize,
    pub end: usize,
    pub color: Option<String>,
    pub background_color: Option<String>,
    pub font_family: Option<String>,
    pub font_weight: Option<FontWeightValue>,
    pub font_style: Option<String>,
    pub text_decoration: Option<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct TextHighlightStyle {
    pub style: HighlightStyle,
    pub font_family: Option<SharedString>,
}

/// UTF-8 byte ranges, sorted and non-overlapping.
pub type TextHighlights = Vec<(Range<usize>, TextHighlightStyle)>;

pub fn styled_text(text: SharedString, highlights: TextHighlights) -> gpui::StyledText {
    let families: Vec<(Range<usize>, SharedString)> = highlights
        .iter()
        .filter_map(|(range, style)| Some((range.clone(), style.font_family.clone()?)))
        .collect();
    let styled = gpui::StyledText::new(text).with_highlights(
        highlights
            .into_iter()
            .map(|(range, style)| (range, style.style)),
    );
    if families.is_empty() {
        styled
    } else {
        styled.with_font_family_overrides(families)
    }
}

pub fn parse_specs(value: &serde_json::Value) -> Vec<TextHighlightSpec> {
    serde_json::from_value(value.clone()).unwrap_or_default()
}

fn color(value: Option<&str>) -> Option<Hsla> {
    value
        .and_then(crate::color::parse_color_rgba)
        .map(Hsla::from)
}

fn highlight_style(spec: &TextHighlightSpec) -> TextHighlightStyle {
    let color_value = color(spec.color.as_deref());
    let style = HighlightStyle {
        color: color_value,
        background_color: color(spec.background_color.as_deref()),
        font_weight: spec
            .font_weight
            .as_ref()
            .map(crate::renderer::parse_font_weight),
        font_style: match spec.font_style.as_deref() {
            Some("italic") => Some(FontStyle::Italic),
            Some("normal") => Some(FontStyle::Normal),
            _ => None,
        },
        // `None` follows the text colour.
        underline: (spec.text_decoration.as_deref() == Some("underline")).then(|| {
            UnderlineStyle {
                color: color_value,
                thickness: gpui::px(1.0),
                wavy: false,
            }
        }),
        strikethrough: (spec.text_decoration.as_deref() == Some("line-through")).then(|| {
            StrikethroughStyle {
                color: color_value,
                thickness: gpui::px(1.0),
            }
        }),
        fade_out: None,
    };
    TextHighlightStyle {
        style,
        font_family: spec.font_family.clone().map(SharedString::from),
    }
}

/// Rounds down to a char boundary and clamps to `text.len()`.
fn utf8_offset(text: &str, utf16: usize) -> usize {
    let mut units = 0;
    for (byte, character) in text.char_indices() {
        if units >= utf16 {
            return byte;
        }
        units += character.len_utf16();
        if units > utf16 {
            return byte;
        }
    }
    text.len()
}

/// Overlaps are trimmed to start where the previous range ended: GPUI runs
/// must not overlap.
pub fn resolve(text: &str, specs: &[TextHighlightSpec]) -> TextHighlights {
    let mut ordered: Vec<&TextHighlightSpec> = specs.iter().collect();
    ordered.sort_by_key(|spec| (spec.start, spec.end));
    let mut resolved: TextHighlights = Vec::with_capacity(ordered.len());
    let mut covered = 0;
    for spec in ordered {
        let start = utf8_offset(text, spec.start).max(covered);
        let end = utf8_offset(text, spec.end);
        if start >= end {
            continue;
        }
        covered = end;
        resolved.push((start..end, highlight_style(spec)));
    }
    resolved
}

/// Keeps colours on untouched text through a local edit until JS sends fresh
/// highlights.
pub fn shift(highlights: &mut TextHighlights, edited: Range<usize>, inserted_len: usize) {
    let removed = edited.end - edited.start;
    let moved = |offset: usize| offset - removed + inserted_len;
    highlights.retain_mut(|(range, _)| {
        if range.end <= edited.start {
            return true;
        }
        if range.start >= edited.end {
            *range = moved(range.start)..moved(range.end);
            return true;
        }
        if range.start < edited.start {
            range.end = edited.start;
            return true;
        }
        if range.end > edited.end {
            *range = edited.start + inserted_len..moved(range.end);
            return range.start < range.end;
        }
        false
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    fn spec(start: usize, end: usize) -> TextHighlightSpec {
        TextHighlightSpec {
            start,
            end,
            color: Some("#ff0000".into()),
            background_color: None,
            font_family: None,
            font_weight: None,
            font_style: None,
            text_decoration: None,
        }
    }

    fn ranges(highlights: &TextHighlights) -> Vec<Range<usize>> {
        highlights.iter().map(|(range, _)| range.clone()).collect()
    }

    #[test]
    fn converts_utf16_ranges_to_bytes() {
        // "é" is 2 bytes and 1 UTF-16 unit; "😀" is 4 bytes and 2 units.
        let text = "é😀ab";
        let resolved = resolve(text, &[spec(0, 1), spec(1, 3), spec(3, 4)]);
        assert_eq!(ranges(&resolved), vec![0..2, 2..6, 6..7]);
    }

    #[test]
    fn drops_bad_ranges_and_trims_overlaps() {
        let resolved = resolve("abcdef", &[spec(4, 2), spec(1, 3), spec(2, 5), spec(9, 12)]);
        assert_eq!(ranges(&resolved), vec![1..3, 3..5]);
    }

    #[test]
    fn deserializes_style_fields() {
        let specs = parse_specs(&serde_json::json!([
            { "start": 0, "end": 2, "fontWeight": 700, "fontStyle": "italic", "textDecoration": "underline", "fontFamily": "Mono" }
        ]));
        let resolved = resolve("ab", &specs);
        let style = &resolved[0].1;
        assert_eq!(style.style.font_weight, Some(gpui::FontWeight(700.0)));
        assert_eq!(style.style.font_style, Some(FontStyle::Italic));
        assert!(style.style.underline.is_some());
        assert_eq!(style.font_family.as_deref(), Some("Mono"));
    }

    #[test]
    fn shifts_through_an_insert() {
        let mut highlights = resolve("abc def", &[spec(0, 3), spec(4, 7)]);
        shift(&mut highlights, 4..4, 2);
        assert_eq!(ranges(&highlights), vec![0..3, 6..9]);
    }

    #[test]
    fn shifts_through_a_replacement() {
        let mut highlights = resolve("abcdefgh", &[spec(0, 4), spec(4, 6), spec(5, 8)]);
        shift(&mut highlights, 2..6, 1);
        assert_eq!(ranges(&highlights), vec![0..2, 3..5]);
    }
}
