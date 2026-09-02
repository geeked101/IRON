/**
 * EditSplitScreen.tsx
 *
 * Full customization manager for workout days and exercises.
 * Users can edit target sets/reps, add custom exercises, remove exercises,
 * and customize their split.
 */

import React, { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, spacing, radius, typography } from '../theme'
import { useSplitStore } from '../store/splitStore'
import { Exercise } from '../data/workoutSplit'
import { validateCustomExerciseInput } from '../utils/validation'

export default function EditSplitScreen({ navigation }: any) {
  const insets = useSafeAreaInsets()
  const { split, addExerciseToDay, updateExerciseInDay, removeExerciseFromDay, resetToDefaultSplit } = useSplitStore()

  const [selectedDay, setSelectedDay] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  // New/Edit exercise form state
  const [name, setName] = useState('')
  const [muscles, setMuscles] = useState('')
  const [targetSets, setTargetSets] = useState('3')
  const [targetReps, setTargetReps] = useState('10')
  const [restSeconds, setRestSeconds] = useState('90')

  const currentDayObj = split.find(d => d.day === selectedDay) ?? split[0]

  function openAddModal() {
    setName('')
    setMuscles('General')
    setTargetSets('3')
    setTargetReps('10')
    setRestSeconds('90')
    setEditingIndex(null)
    setShowAddModal(true)
  }

  function openEditModal(index: number, ex: Exercise) {
    setName(ex.name)
    setMuscles(ex.primaryMuscles?.join(', ') || 'General')
    setTargetSets(String(ex.targetSets))
    setTargetReps(ex.targetReps)
    setRestSeconds(String(ex.restSeconds))
    setEditingIndex(index)
    setShowAddModal(true)
  }

  async function handleSaveExercise() {
    const val = validateCustomExerciseInput({
      name,
      muscleGroup: muscles,
      targetSets,
      targetReps,
    })

    if (!val.isValid) {
      Alert.alert('Validation Error', val.error)
      return
    }

    const rest = parseInt(restSeconds, 10) || 90
    const primaryMuscles = muscles.split(',').map(m => m.trim()).filter(Boolean)

    if (editingIndex !== null) {
      await updateExerciseInDay(selectedDay, editingIndex, {
        name,
        primaryMuscles,
        targetSets: parseInt(targetSets, 10),
        targetReps,
        restSeconds: rest,
      })
    } else {
      const newEx: Exercise = {
        name,
        primaryMuscles,
        targetSets: parseInt(targetSets, 10),
        targetReps,
        restSeconds: rest,
        formCues: ['Focus on controlled movement and full range of motion.'],
      }
      await addExerciseToDay(selectedDay, newEx)
    }

    setShowAddModal(false)
  }

  async function handleRemove(index: number, exName: string) {
    Alert.alert(
      'Remove Exercise',
      `Remove ${exName} from Day ${selectedDay}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeExerciseFromDay(selectedDay, index) },
      ]
    )
  }

  async function handleReset() {
    Alert.alert(
      'Reset Split?',
      'Revert all exercises and days back to the default PPL split?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => resetToDefaultSplit() },
      ]
    )
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Customize Split</Text>
        <TouchableOpacity onPress={handleReset}>
          <Text style={s.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>

      {/* Day Selector horizontal scroll */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.dayScroll} contentContainerStyle={s.dayScrollContent}>
        {split.map(d => (
          <TouchableOpacity
            key={d.day}
            style={[s.dayTab, d.day === selectedDay && s.dayTabActive]}
            onPress={() => setSelectedDay(d.day)}
          >
            <Text style={[s.dayTabText, d.day === selectedDay && s.dayTabTextActive]}>
              D{d.day} · {d.shortName}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Selected Day Header */}
      <View style={s.dayHeader}>
        <View>
          <Text style={s.dayTitle}>{currentDayObj.name}</Text>
          <Text style={s.dayFocus}>{currentDayObj.focus}</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openAddModal}>
          <Text style={s.addBtnText}>+ Add Exercise</Text>
        </TouchableOpacity>
      </View>

      {/* Exercise List */}
      <ScrollView style={s.exerciseList} showsVerticalScrollIndicator={false}>
        {currentDayObj.exercises.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyText}>No exercises in this day. Tap "+ Add Exercise" to customize.</Text>
          </View>
        ) : (
          currentDayObj.exercises.map((ex, idx) => (
            <View key={idx} style={s.exCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.exName}>{ex.name}</Text>
                <Text style={s.exSub}>
                  {ex.targetSets} sets × {ex.targetReps} reps · {ex.restSeconds}s rest
                </Text>
                <Text style={s.exMuscles}>{ex.primaryMuscles?.join(', ')}</Text>
              </View>
              <View style={s.cardActions}>
                <TouchableOpacity style={s.editActionBtn} onPress={() => openEditModal(idx, ex)}>
                  <Text style={s.actionBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.removeActionBtn} onPress={() => handleRemove(idx, ex.name)}>
                  <Text style={s.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add / Edit Exercise Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>{editingIndex !== null ? 'Edit Exercise' : 'Add Custom Exercise'}</Text>
            
            <Text style={s.inputLabel}>EXERCISE NAME</Text>
            <TextInput
              style={s.textInput}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Incline Cable Fly"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={s.inputLabel}>PRIMARY MUSCLES (comma separated)</Text>
            <TextInput
              style={s.textInput}
              value={muscles}
              onChangeText={setMuscles}
              placeholder="Chest, Upper Pectorals"
              placeholderTextColor={colors.textMuted}
            />

            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <Text style={s.inputLabel}>SETS</Text>
                <TextInput
                  style={s.textInput}
                  value={targetSets}
                  onChangeText={setTargetSets}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.inputLabel}>REPS</Text>
                <TextInput
                  style={s.textInput}
                  value={targetReps}
                  onChangeText={setTargetReps}
                  placeholder="8–10"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            <Text style={s.inputLabel}>REST TIMER (seconds)</Text>
            <TextInput
              style={s.textInput}
              value={restSeconds}
              onChangeText={setRestSeconds}
              keyboardType="numeric"
            />

            <View style={s.modalBtnRow}>
              <TouchableOpacity style={[s.modalBtn, s.cancelBtn]} onPress={() => setShowAddModal(false)}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, s.saveBtn]} onPress={handleSaveExercise}>
                <Text style={s.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  backBtn: { paddingVertical: spacing.xs },
  backText: { fontSize: 14, color: colors.titaniumMid },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  resetText: { fontSize: 13, color: colors.red },

  dayScroll: { maxHeight: 50, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  dayScrollContent: { paddingHorizontal: spacing.md, alignItems: 'center', gap: spacing.xs },
  dayTab: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: colors.bgCard },
  dayTabActive: { backgroundColor: colors.titanium },
  dayTabText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  dayTabTextActive: { color: colors.bg, fontWeight: '700' },

  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  dayTitle: { fontSize: 20, fontWeight: '600', color: colors.titanium },
  dayFocus: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  addBtn: { backgroundColor: colors.bgInset, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  addBtnText: { fontSize: 13, color: colors.titanium, fontWeight: '600' },

  exerciseList: { flex: 1, paddingHorizontal: spacing.lg },
  emptyBox: { padding: spacing.xl, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },

  exCard: {
    backgroundColor: colors.bgCard,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  exName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  exSub: { fontSize: 12, color: colors.titaniumMid },
  exMuscles: { fontSize: 11, color: colors.textMuted, marginTop: 4 },

  cardActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  editActionBtn: { backgroundColor: colors.bgInset, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  actionBtnText: { fontSize: 12, color: colors.titanium, fontWeight: '500' },
  removeActionBtn: { backgroundColor: 'rgba(192, 80, 80, 0.15)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  removeBtnText: { fontSize: 12, color: colors.red, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, borderTopWidth: 0.5, borderTopColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: '600', color: colors.titanium, marginBottom: spacing.lg },
  inputLabel: { fontSize: 11, color: colors.textMuted, letterSpacing: 1, marginBottom: 4, marginTop: spacing.sm },
  textInput: { backgroundColor: colors.bgDeep, borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.md, color: colors.textPrimary, fontSize: 14 },
  row2: { flexDirection: 'row', gap: spacing.md },
  modalBtnRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  modalBtn: { flex: 1, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  cancelBtn: { backgroundColor: colors.bgDeep, borderWidth: 0.5, borderColor: colors.border },
  cancelBtnText: { color: colors.textMuted, fontWeight: '600' },
  saveBtn: { backgroundColor: colors.titanium },
  saveBtnText: { color: colors.bg, fontWeight: '700' },
})
