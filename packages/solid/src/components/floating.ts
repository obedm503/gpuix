import {
  createComponent,
  createContext,
  mergeProps,
  onCleanup,
  onMount,
  splitProps,
  useContext,
  type JSX,
} from "solid-js"
import type { EventPayload } from "@gpuix/native"
import { pushDismissLayer } from "@gpuix/native/host"
import type { DismissLayer, HostProps, KeyEvent, StyleDesc } from "@gpuix/native/host"
import { useGpuixRequired } from "../root.js"
import { isHostElement } from "../host.js"
import { jsx } from "../jsx-runtime.js"
import { spread } from "../universal.js"

export type FloatingSide = "top" | "right" | "bottom" | "left"
export type FloatingAlign = "start" | "center" | "end"
export type StateStyle<State> = StyleDesc | ((state: State) => StyleDesc)

export interface FloatingContentProps extends HostProps {
  children?: JSX.Element
  side?: FloatingSide
  sideOffset?: number
  align?: FloatingAlign
  alignOffset?: number
  collisionPadding?: number
}

export function resolveStyle<State>(
  style: StateStyle<State> | undefined,
  state: State
): StyleDesc | undefined {
  return typeof style === "function" ? style(state) : style
}

export function mergeStyles(
  base: StyleDesc | undefined,
  override: StyleDesc | undefined
): StyleDesc | undefined {
  if (!base) return override
  if (!override) return base
  return { ...base, ...override }
}

export function floatingRootStyle(style?: StyleDesc): StyleDesc {
  return { display: "flex", position: "relative", alignItems: "start", ...style }
}

const DismissLayerContext = createContext<DismissLayer>()

export interface DismissableLayerProps {
  children?: JSX.Element
  /** Escape reached the window, this layer is on top, and nothing prevented it. */
  onEscapeKeyDown: (event: KeyEvent) => void
  /** Element to focus when the layer opens on top. Null leaves focus. */
  initialFocus?: () => number | null
  /** Element to focus on close. `previous` is the focus from before it opened. */
  finalFocus?: (previous: number | null) => number | null
}

/**
 * Put an open overlay on the window's layer stack while mounted. Escape closes
 * only the top layer. Layers inside this one, such as a Select in a Dialog,
 * are always above it. The stack also moves focus in and out, in stack order.
 */
export function DismissableLayer(props: DismissableLayerProps): JSX.Element {
  const renderer = useGpuixRequired()
  // Read now: Solid has not created this layer's elements yet.
  const previousFocus = renderer.getFocusedElementId?.() ?? null
  const layer: DismissLayer = {
    parent: useContext(DismissLayerContext),
    onEscapeKeyDown: (event) => props.onEscapeKeyDown(event),
    initialFocus: () => props.initialFocus?.() ?? null,
    finalFocus: (previous) => props.finalFocus?.(previous) ?? null,
  }
  let pop: (() => void) | undefined
  // After the children exist, so initialFocus can name one of them.
  onMount(() => {
    pop = pushDismissLayer(renderer, layer, { previousFocus })
  })
  onCleanup(() => pop?.())
  return createComponent(DismissLayerContext.Provider, {
    value: layer,
    get children() { return props.children },
  })
}

/**
 * `props` without `omit`, with `overrides` on top, all read lazily.
 *
 * A spread (`{ ...props }`) calls every getter at once. That builds
 * `children` a second time, and inside a tracked scope it subscribes the
 * scope to every prop, so a change to any of them rebuilds the subtree.
 * Keys of `overrides` are left out of `props` too, so an override getter
 * that returns `undefined` never falls back to the caller's value.
 */
export function forwardProps(
  props: object,
  omit: readonly string[],
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  const [, rest] = splitProps(props as Record<string, unknown>, [...omit, ...Object.keys(overrides)])
  return mergeProps(rest, overrides)
}

export function composeHandlers<Event extends EventPayload>(
  first?: (event: Event) => void,
  second?: (event: Event) => void
) {
  if (!first) return second
  if (!second) return first
  return (event: Event) => {
    first(event)
    second(event)
  }
}

/**
 * Render `props` on a `div`, or spread them onto the single `asChild` element.
 *
 * `defaultTabIndex` makes the part a tab stop, like the `<button>` Base UI
 * renders. An explicit `tabIndex` on the part, then on the child, wins. The
 * child's own handlers run before the part's, like React `asChild`.
 */
export function renderSlot(args: {
  asChild?: boolean
  children?: JSX.Element
  props: Record<string, unknown>
  defaultTabIndex?: number
}): JSX.Element {
  // Descriptors, not a spread, so reactive getters such as `style` stay live.
  const descriptors = Object.getOwnPropertyDescriptors(args.props)
  const tabIndex = descriptors.tabIndex
  const child = args.asChild ? args.children : undefined
  if (args.asChild && !isHostElement(child)) {
    throw new Error("asChild requires one GPUIX intrinsic element")
  }
  const childTabIndex = isHostElement(child) ? child.props.get("tabIndex") : undefined
  if (args.defaultTabIndex !== undefined || childTabIndex !== undefined) {
    descriptors.tabIndex = {
      enumerable: true,
      configurable: true,
      get: () => (tabIndex?.get ? tabIndex.get() : tabIndex?.value) ??
        childTabIndex ?? args.defaultTabIndex,
    }
  }
  if (!isHostElement(child)) {
    descriptors.children = {
      enumerable: true,
      configurable: true,
      get: () => args.children,
    }
    return jsx("div", Object.defineProperties({}, descriptors))
  }
  for (const [key, descriptor] of Object.entries(descriptors)) {
    const own = child.props.get(key)
    if (!key.startsWith("on") || typeof own !== "function") continue
    // Forwarded props arrive as getters; read the part's handler per event.
    const slotHandler = descriptor.get ?? (() => descriptor.value)
    descriptors[key] = {
      enumerable: true,
      configurable: true,
      value: (event: EventPayload) => {
        own(event)
        const handler = slotHandler()
        if (typeof handler === "function") handler(event)
      },
    }
  }
  // The child keeps its own children. Without skipChildren, spread would
  // insert `props.children`, which is the child itself.
  delete descriptors.children
  spread(child, Object.defineProperties({}, descriptors), true)
  return child as never
}

type InteractiveStyle = Omit<StyleDesc, "hover" | "active">

function floatingSurfaceStateStyle(style?: InteractiveStyle): InteractiveStyle | undefined {
  if (!style) return undefined
  const surface: InteractiveStyle = {}
  if (style.visibility !== undefined) surface.visibility = style.visibility
  if (style.opacity !== undefined) surface.opacity = style.opacity
  if (style.borderRadius !== undefined) surface.borderRadius = style.borderRadius
  if (style.borderTopLeftRadius !== undefined) {
    surface.borderTopLeftRadius = style.borderTopLeftRadius
  }
  if (style.borderTopRightRadius !== undefined) {
    surface.borderTopRightRadius = style.borderTopRightRadius
  }
  if (style.borderBottomRightRadius !== undefined) {
    surface.borderBottomRightRadius = style.borderBottomRightRadius
  }
  if (style.borderBottomLeftRadius !== undefined) {
    surface.borderBottomLeftRadius = style.borderBottomLeftRadius
  }
  return Object.keys(surface).length > 0 ? surface : undefined
}

function floatingSurfaceStyle(style?: StyleDesc): StyleDesc {
  const surface: StyleDesc = floatingSurfaceStateStyle(style) ?? {}
  const hover = floatingSurfaceStateStyle(style?.hover)
  const active = floatingSurfaceStateStyle(style?.active)
  if (hover) surface.hover = hover
  if (active) surface.active = active
  return surface
}

function withoutOpacity(style?: InteractiveStyle): InteractiveStyle | undefined {
  if (!style) return undefined
  const { opacity: _opacity, ...rest } = style
  return rest
}

function floatingContentStyle(style?: StyleDesc): StyleDesc | undefined {
  if (!style) return undefined
  const { opacity: _opacity, hover, active, ...rest } = style
  return {
    ...rest,
    hover: withoutOpacity(hover),
    active: withoutOpacity(active),
  }
}

/**
 * The deferred surface behind Select, Combobox and Tooltip content. Like the
 * React `FloatingLayer`, radii, visibility and opacity go on the outer
 * anchored surface. Fill, border, shadow and layout stay on the inner
 * content, which is the only thing that paints.
 */
export function FloatingLayer(props: FloatingContentProps): JSX.Element {
  const side = () => props.side ?? "bottom"
  return jsx("anchored", {
    // The content below always paints a fill, so the anchored layer declares
    // a transparent one and gets no fallback quad. A fallback rounded to the
    // same radius still shows its anti-aliased edge around each corner.
    get style() { return { ...floatingSurfaceStyle(props.style), backgroundColor: "transparent" } },
    get side() { return side() },
    get align() { return props.align ?? "start" },
    get gap() { return props.sideOffset ?? 0 },
    get offset() {
      const alignOffset = props.alignOffset ?? 0
      return side() === "top" || side() === "bottom"
        ? { x: alignOffset, y: 0 }
        : { x: 0, y: alignOffset }
    },
    fit: "snap",
    get snapMargin() { return props.collisionPadding ?? 8 },
    deferred: true,
    priority: 1,
    get occlude() { return props.style?.pointerEvents !== "none" },
    get children() {
      return jsx("div", forwardProps(
        props,
        ["side", "sideOffset", "align", "alignOffset", "collisionPadding"],
        {
          get style() {
            return mergeStyles({ backgroundColor: "#1A1A1A" }, floatingContentStyle(props.style))
          },
        }
      ))
    },
  })
}
