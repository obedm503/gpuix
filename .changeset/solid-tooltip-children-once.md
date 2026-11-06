---
'@gpuix/solid': patch
---

Build each part's children once, and stop rebuilding parts when a prop changes,
in `@gpuix/solid`'s Tooltip, Select, Combobox, Dialog and Button.

The parts copied their props with an object spread, which calls every getter
at once. That built `children` again for each spread: a Tooltip trigger's
child four times, and Select, Combobox and Dialog content twice. The unused
copies stayed alive, with their own overlay layers, modal effects and item
registrations. A node shared by the copies, such as a popover passed into a
Tooltip trigger, was attached to all of them, and closing it could leave its
anchored layer painted. Inside a tracked scope the spread also subscribed to
every prop, so a change to any of them (a Select's `value`, a Dialog popup's
`style`) rebuilt the whole subtree and dropped focus.

Parts now forward their props lazily, and leave their own options (`open`,
`value`, `items`, `disabled`, …) off the host element. Props that were read
once at mount, such as Button's host props, a Select's `disabled` and `items`,
a Combobox's `disabled`, `multiple` and `itemToStringValue`, and a Tooltip's
`disableHoverableContent`, now follow changes. An `asChild` child's own
handlers still run before the part's.
