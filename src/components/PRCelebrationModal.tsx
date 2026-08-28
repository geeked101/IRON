import React, { useEffect, useRef } from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native'
import { colors, radius, spacing } from '../theme'
import ShimmerGlow from './ShimmerGlow'

interface PRCelebrationModalProps {
  visible: boolean
  prs: string[]
  onClose: () => void
}

/**
 * PRCelebrationModal — Neon shockwave & particle burst modal for Personal Records.
 */
export default function PRCelebrationModal({ visible, prs, onClose }: PRCelebrationModalProps) {
  const scaleAnim = useRef(new Animated.Value(0.3)).current
  const opacityAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.3)
      opacityAnim.setValue(0)

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start()

      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      )
      pulse.start()

      return () => pulse.stop()
    }
  }, [visible])

  if (!visible) return null

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        {/* Animated Shockwave Ring */}
        <Animated.View
          style={[
            s.shockwaveRing,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />

        <Animated.View
          style={[
            s.card,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <ShimmerGlow />
          
          <View style={s.badgeBox}>
            <Text style={s.trophyIcon}>🏆</Text>
          </View>

          <Text style={s.title}>NEW PERSONAL RECORD!</Text>
          <Text style={s.sub}>You just shattered your previous limits.</Text>

          <View style={s.prList}>
            {prs.map((pr, idx) => (
              <View key={idx} style={s.prTag}>
                <Text style={s.prDot}>⚡</Text>
                <Text style={s.prName}>{pr}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={s.btn} onPress={onClose} activeOpacity={0.85}>
            <Text style={s.btnText}>KEEP CRUSHING IT 🦾</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 12, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  shockwaveRing: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 2,
    borderColor: 'rgba(0, 230, 118, 0.35)',
    backgroundColor: 'rgba(0, 230, 118, 0.05)',
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  badgeBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.greenBg,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  trophyIcon: {
    fontSize: 36,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 4,
  },
  sub: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  prList: {
    width: '100%',
    gap: 8,
    marginBottom: spacing.xl,
  },
  prTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgDeep,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: 8,
  },
  prDot: {
    fontSize: 14,
    color: colors.amber,
  },
  prName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.green,
  },
  btn: {
    width: '100%',
    height: 54,
    backgroundColor: colors.green,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.bg,
    letterSpacing: 1,
  },
})
