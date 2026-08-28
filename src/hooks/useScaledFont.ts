/**
 * useScaledFont.ts
 *
 * Hook that returns theme font sizes multiplied by the user's active scale factor.
 * Import and use this hook in screens instead of hardcoding pixel values, so that
 * the "Text size" setting in Settings applies uniformly across the app.
 *
 * Usage:
 *   const f = useScaledFont()
 *   <Text style={{ fontSize: f.body }}>Hello</Text>
 */

import { useFontSize } from '../context/FontSizeContext'

/** Scaled font-size values derived from theme base sizes. */
export interface ScaledFonts {
  /** Base: 28 — major headings */
  h1: number
  /** Base: 22 — section titles */
  h2: number
  /** Base: 18 — card titles */
  h3: number
  /** Base: 16 — sub-titles */
  h4: number
  /** Base: 14 — body text */
  body: number
  /** Base: 12 — secondary text, sub-labels */
  small: number
  /** Base: 11 — muted labels, caps tracking */
  label: number
  /** Base: 22 — stat values (large numbers in cards) */
  statVal: number
  /** Base: 28 — big numbers (streak, weight) */
  bigNum: number
  /** Base: 15 — prominent day name */
  dayName: number
  /** Base: 13 — captions, helper text */
  caption: number
}

/** Base sizes that map 1:1 to the app theme before scaling. */
const BASE: ScaledFonts = {
  h1: 28,
  h2: 22,
  h3: 18,
  h4: 16,
  body: 14,
  small: 12,
  label: 11,
  statVal: 22,
  bigNum: 28,
  dayName: 15,
  caption: 13,
}

/**
 * Returns all common font sizes scaled by the user's active multiplier.
 * Components can destructure only the sizes they need.
 *
 * @returns ScaledFonts — object with numeric fontSize values ready for StyleSheet use
 */
export function useScaledFont(): ScaledFonts {
  const { scale } = useFontSize()

  return {
    h1: Math.round(BASE.h1 * scale),
    h2: Math.round(BASE.h2 * scale),
    h3: Math.round(BASE.h3 * scale),
    h4: Math.round(BASE.h4 * scale),
    body: Math.round(BASE.body * scale),
    small: Math.round(BASE.small * scale),
    label: Math.round(BASE.label * scale),
    statVal: Math.round(BASE.statVal * scale),
    bigNum: Math.round(BASE.bigNum * scale),
    dayName: Math.round(BASE.dayName * scale),
    caption: Math.round(BASE.caption * scale),
  }
}
