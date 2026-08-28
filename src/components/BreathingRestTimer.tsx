import React, { useEffect, useState, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native'
import { colors, radius, spacing } from '../theme'

interface BreathingRestTimerProps {
  seconds: number
  onSkip: () => void
}

/**
 * BreathingRestTimer — Pulsing glowing halo timer with smooth color & scale animation.
 */
export default function BreathingRestTimer({ seconds, onSkip }: BreathingRestTimerProps) {
  const [remaining, setRemaining] = useState(seconds)
  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    setRemaining(seconds)
    const interval = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(interval)
          return 0
        }
        return r - 1
      })
    }, 1000)

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.18,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    )
    pulse.start()

    return () => {
      clearInterval(interval)
      pulse.stop()
    }
  }, [seconds])

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`
  const isDone = remaining === 0

  // Color dynamics: starts fiery orange/red, turns electric green when done
  const haloColor = isDone ? colors.green : remaining < 10 ? colors.amber : colors.blue

  return (
    <View style={s.container}>
      {/* Animated Pulsing Ring */}
      <Animated.View
        style={[
          s.pulseRing,
          {
            borderColor: haloColor + '44',
            backgroundColor: haloColor + '0d',
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />

      {/* Main Timer Circle */}
      <View style={[s.timerCircle, { borderColor: haloColor }]}>
        <Text style={[s.timerText, { color: isDone ? colors.green : colors.textPrimary }]}>
          {timeStr}
        </Text>
        <Text style={s.timerSub}>
          {isDone ? 'READY TO BLAST 💥' : 'RESTING & RECOVERING'}
        </Text>
      </View>

      {/* Control Buttons */}
      <View style={s.btnRow}>
        <TouchableOpacity style={s.addBtn} onPress={() => setRemaining((r) => r + 30)}>
          <Text style={s.btnText}>+30s</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.skipBtn, { backgroundColor: isDone ? colors.green : colors.titanium }]}
          onPress={onSkip}
          activeOpacity={0.85}
        >
          <Text style={[s.skipBtnText, isDone && { color: colors.bg }]}>
            {isDone ? 'START NEXT SET →' : 'SKIP REST →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xl,
  },
  pulseRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
  },
  timerCircle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: colors.bgCard,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  timerText: {
    fontSize: 44,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  timerSub: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  addBtn: {
    backgroundColor: colors.bgInset,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.titaniumMid,
  },
  skipBtn: {
    borderRadius: radius.md,
    paddingHorizontal: 24,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.bg,
    letterSpacing: 0.5,
  },
})
