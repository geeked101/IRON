import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, ViewStyle } from 'react-native'

interface ShimmerGlowProps {
  style?: ViewStyle
  color?: string
}

/**
 * ShimmerGlow — adds a subtle metallic sheen animation across a card.
 */
export default function ShimmerGlow({ style, color = 'rgba(255, 255, 255, 0.08)' }: ShimmerGlowProps) {
  const anim = useRef(new Animated.Value(-100)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 350,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.delay(1800),
      ])
    )
    animation.start()
    return () => animation.stop()
  }, [])

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.shimmer,
        style,
        {
          backgroundColor: color,
          transform: [{ translateX: anim }, { rotate: '25deg' }],
        },
      ]}
    />
  )
}

const styles = StyleSheet.create({
  shimmer: {
    position: 'absolute',
    top: -50,
    bottom: -50,
    width: 60,
    opacity: 0.8,
  },
})
