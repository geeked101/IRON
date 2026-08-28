/**
 * FontSizeContext.tsx
 *
 * Provides a global font-size scale that every screen can consume.
 * The user's preference is persisted to AsyncStorage key "iron_font_size".
 *
 * Scale factors:
 *   small      → 0.85
 *   medium     → 1.00  (default)
 *   large      → 1.15
 *   extraLarge → 1.30
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

/** The four font-size presets the user can choose from. */
export type FontSizeKey = 'small' | 'medium' | 'large' | 'extraLarge'

/** Multiplier applied to every theme font size for each preset. */
export const FONT_SCALES: Record<FontSizeKey, number> = {
  small: 0.85,
  medium: 1.0,
  large: 1.15,
  extraLarge: 1.3,
}

/** The AsyncStorage key used to persist the user's preference. */
const ASYNC_KEY = 'iron_font_size'

// ─── Context shape ────────────────────────────────────────────────────────────

interface FontSizeContextValue {
  /** Currently active size preset key. */
  size: FontSizeKey
  /** Numeric scale multiplier for the active preset. */
  scale: number
  /**
   * Update the active font-size preset and persist it.
   * @param key - the new preset to apply
   */
  setSize: (key: FontSizeKey) => Promise<void>
}

const FontSizeContext = createContext<FontSizeContextValue>({
  size: 'medium',
  scale: 1.0,
  setSize: async () => {},
})

// ─── Provider ─────────────────────────────────────────────────────────────────

interface FontSizeProviderProps {
  children: ReactNode
}

/**
 * Wraps the app tree and provides the active font-size scale.
 * Must be placed above any screen that calls `useFontSize()` or `useScaledFont()`.
 */
export function FontSizeProvider({ children }: FontSizeProviderProps) {
  const [size, setSizeState] = useState<FontSizeKey>('medium')

  // Load persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(ASYNC_KEY)
      .then((raw) => {
        if (raw && raw in FONT_SCALES) {
          setSizeState(raw as FontSizeKey)
        }
      })
      .catch((err) => {
        console.warn('[FontSizeContext] Failed to load preference:', err)
      })
  }, [])

  /**
   * Persist the new size to AsyncStorage and update context state.
   */
  const setSize = useCallback(async (key: FontSizeKey) => {
    setSizeState(key)
    try {
      await AsyncStorage.setItem(ASYNC_KEY, key)
    } catch (err) {
      console.error('[FontSizeContext] Failed to persist preference:', err)
    }
  }, [])

  const value: FontSizeContextValue = {
    size,
    scale: FONT_SCALES[size],
    setSize,
  }

  return (
    <FontSizeContext.Provider value={value}>
      {children}
    </FontSizeContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Access the active font-size preset and scale multiplier.
 * Must be used inside a `FontSizeProvider`.
 */
export function useFontSize(): FontSizeContextValue {
  return useContext(FontSizeContext)
}
