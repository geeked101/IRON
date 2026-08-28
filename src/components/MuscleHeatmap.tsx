import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { colors, radius, spacing } from '../theme'

export type MuscleStatus = 'fresh' | 'moderate' | 'fatigued'

interface MuscleGroup {
  name: string
  status: MuscleStatus
  fatiguePct: number // 0 to 100
  lastTrained: string
}

interface MuscleHeatmapProps {
  muscles?: MuscleGroup[]
  onMusclePress?: (name: string) => void
}

const DEFAULT_MUSCLES: MuscleGroup[] = [
  { name: 'Chest', status: 'fatigued', fatiguePct: 85, lastTrained: 'Yesterday' },
  { name: 'Front Delts', status: 'fatigued', fatiguePct: 75, lastTrained: 'Yesterday' },
  { name: 'Triceps', status: 'moderate', fatiguePct: 55, lastTrained: 'Yesterday' },
  { name: 'Lats & Back', status: 'fresh', fatiguePct: 15, lastTrained: '3 days ago' },
  { name: 'Biceps', status: 'fresh', fatiguePct: 10, lastTrained: '3 days ago' },
  { name: 'Quads & Glutes', status: 'moderate', fatiguePct: 40, lastTrained: '2 days ago' },
  { name: 'Hamstrings', status: 'fresh', fatiguePct: 20, lastTrained: '4 days ago' },
  { name: 'Abs / Core', status: 'fresh', fatiguePct: 0, lastTrained: 'Resting' },
]

const STATUS_CONFIG: Record<MuscleStatus, { color: string; bg: string; border: string; label: string }> = {
  fresh: { color: colors.green, bg: colors.greenBg, border: colors.greenBorder, label: 'READY' },
  moderate: { color: colors.amber, bg: 'rgba(255, 171, 0, 0.1)', border: 'rgba(255, 171, 0, 0.3)', label: 'RECOVERING' },
  fatigued: { color: colors.red, bg: 'rgba(255, 23, 68, 0.12)', border: 'rgba(255, 23, 68, 0.35)', label: 'FATIGUED' },
}

/**
 * MuscleHeatmap — Glowing interactive muscle fatigue & recovery visualizer.
 */
export default function MuscleHeatmap({ muscles = DEFAULT_MUSCLES, onMusclePress }: MuscleHeatmapProps) {
  return (
    <View style={s.card}>
      <View style={s.headerRow}>
        <Text style={s.cardTitle}>MUSCLE RECOVERY HEATMAP</Text>
        <View style={s.liveBadge}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>LIVE STATE</Text>
        </View>
      </View>

      <Text style={s.subText}>Tap a muscle group to view recovery status & readiness</Text>

      <View style={s.grid}>
        {muscles.map((m) => {
          const cfg = STATUS_CONFIG[m.status]
          return (
            <TouchableOpacity
              key={m.name}
              style={[s.muscleBox, { borderColor: cfg.border, backgroundColor: colors.bgDeep }]}
              onPress={() => onMusclePress?.(m.name)}
              activeOpacity={0.75}
            >
              <View style={s.topRow}>
                <Text style={s.muscleName}>{m.name}</Text>
                <View style={[s.statusChip, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                  <Text style={[s.statusChipText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>

              {/* Heat bar */}
              <View style={s.barBg}>
                <View style={[s.barFg, { width: `${m.fatiguePct}%`, backgroundColor: cfg.color }]} />
              </View>

              <Text style={s.timeAgo}>Trained: {m.lastTrained}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bgInset,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.green,
  },
  liveText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.green,
    letterSpacing: 0.5,
  },
  subText: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  grid: {
    gap: spacing.sm,
  },
  muscleBox: {
    borderWidth: 0.5,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  muscleName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  statusChip: {
    borderWidth: 0.5,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  barBg: {
    height: 6,
    backgroundColor: colors.bgInset,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  barFg: {
    height: 6,
    borderRadius: 3,
  },
  timeAgo: {
    fontSize: 11,
    color: colors.textMuted,
  },
})
