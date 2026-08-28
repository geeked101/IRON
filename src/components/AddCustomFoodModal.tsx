/**
 * AddCustomFoodModal.tsx
 *
 * Slide-up modal for creating a custom food entry.
 * Shows a live preview card as the user types.
 * Writes to customFoodStore on save (AsyncStorage + Firebase).
 *
 * Usage:
 *   <AddCustomFoodModal
 *     visible={showModal}
 *     uid={uid}
 *     onClose={() => setShowModal(false)}
 *     onSaved={(food) => console.log('saved', food)}
 *   />
 */

import React, { useState, useRef, useCallback } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, KeyboardAvoidingView,
  Platform, Alert,
} from 'react-native'
import { colors, spacing, radius } from '../theme'
import { useCustomFoodStore } from '../store/customFoodStore'
import { CustomFood } from '../services/firebase'

// ─── Category chips ───────────────────────────────────────────────────────────

const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Drinks', 'Other']

// ─── Types ────────────────────────────────────────────────────────────────────

interface AddCustomFoodModalProps {
  visible: boolean
  uid: string
  onClose: () => void
  /** Called with the saved food so the parent can update its list immediately. */
  onSaved?: (food: CustomFood) => void
}

// ─── Live preview ─────────────────────────────────────────────────────────────

/**
 * Renders a macro proportion bar: protein (blue) / carbs (amber) / fat (red).
 * @param protein - grams protein
 * @param carbs   - grams carbs
 * @param fat     - grams fat
 */
function MacroBar({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const total = protein * 4 + carbs * 4 + fat * 9
  if (total === 0) {
    return <View style={pb.bg}><View style={[pb.seg, { flex: 1, backgroundColor: colors.bgInset }]} /></View>
  }
  return (
    <View style={pb.bg}>
      <View style={[pb.seg, { flex: protein * 4 / total, backgroundColor: colors.blue }]} />
      <View style={[pb.seg, { flex: carbs * 4 / total, backgroundColor: colors.amber }]} />
      <View style={[pb.seg, { flex: fat * 9 / total, backgroundColor: colors.red }]} />
    </View>
  )
}

const pb = StyleSheet.create({
  bg:  { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: colors.bgInset },
  seg: { height: 6 },
})

// ─── Main component ───────────────────────────────────────────────────────────

/** Slide-up modal for adding a custom food to the nutrition logger. */
export default function AddCustomFoodModal({
  visible, uid, onClose, onSaved,
}: AddCustomFoodModalProps) {
  const { add } = useCustomFoodStore()

  // Form state
  const [name, setName]         = useState('')
  const [category, setCategory] = useState('Other')
  const [calories, setCalories] = useState('')
  const [protein, setProtein]   = useState('')
  const [carbs, setCarbs]       = useState('')
  const [fat, setFat]           = useState('')
  const [serving, setServing]   = useState('')

  // Validation errors
  const [nameErr, setNameErr]       = useState('')
  const [caloriesErr, setCaloriesErr] = useState('')

  /** Reset all form state back to defaults. */
  function resetForm() {
    setName(''); setCategory('Other')
    setCalories(''); setProtein(''); setCarbs(''); setFat(''); setServing('')
    setNameErr(''); setCaloriesErr('')
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  /**
   * Validate and save the food.
   * Writes to customFoodStore (AsyncStorage + Firebase background).
   */
  async function handleSave() {
    let valid = true

    if (name.trim().length < 2) {
      setNameErr('Name must be at least 2 characters.')
      valid = false
    } else {
      setNameErr('')
    }

    const cal = parseInt(calories, 10)
    if (!calories || isNaN(cal) || cal < 1) {
      setCaloriesErr('Enter a valid calorie amount.')
      valid = false
    } else {
      setCaloriesErr('')
    }

    if (!valid) return

    const food: Omit<CustomFood, 'id' | 'uid' | 'createdAt'> = {
      name:               name.trim(),
      category,
      caloriesPerServing: cal,
      proteinG:           parseFloat(protein) || 0,
      carbsG:             parseFloat(carbs)   || 0,
      fatG:               parseFloat(fat)     || 0,
      servingDescription: serving.trim() || '1 serving',
    }

    await add(uid, food)

    // Reconstruct the full object for the callback
    const saved: CustomFood = {
      ...food,
      id:        Date.now().toString(),
      uid,
      createdAt: Date.now(),
    }
    onSaved?.(saved)
    resetForm()
    onClose()
  }

  const proNum = parseFloat(protein) || 0
  const carbNum = parseFloat(carbs)  || 0
  const fatNum  = parseFloat(fat)    || 0
  const calNum  = parseInt(calories, 10) || 0

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={s.overlay}>
        <KeyboardAvoidingView
          style={s.kav}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={s.sheet}>
            {/* Handle bar */}
            <View style={s.handle} />

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={s.title}>Add new food</Text>
              <Text style={s.subtitle}>Set the macros and it'll appear in your food list.</Text>

              {/* ── Food name ── */}
              <Text style={s.fieldLabel}>Food name *</Text>
              <TextInput
                style={[s.input, nameErr ? s.inputErr : {}]}
                placeholder="e.g. Githeri with beef"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={t => { setName(t); if (nameErr) setNameErr('') }}
                maxLength={60}
                returnKeyType="next"
              />
              {!!nameErr && <Text style={s.errText}>{nameErr}</Text>}

              {/* ── Category chips ── */}
              <Text style={s.fieldLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[s.chip, category === cat && s.chipActive]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text style={[s.chipText, category === cat && s.chipTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* ── Calories ── */}
              <Text style={s.fieldLabel}>Calories per serving *</Text>
              <View style={s.calorieRow}>
                <TextInput
                  style={[s.calorieInput, caloriesErr ? s.inputErr : {}]}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  value={calories}
                  onChangeText={t => { setCalories(t.replace(/[^0-9]/g, '')); if (caloriesErr) setCaloriesErr('') }}
                  keyboardType="numeric"
                  returnKeyType="done"
                  maxLength={5}
                />
                <Text style={s.calorieUnit}>kcal</Text>
              </View>
              {!!caloriesErr && <Text style={s.errText}>{caloriesErr}</Text>}

              {/* ── Macros row ── */}
              <Text style={s.fieldLabel}>Macros (grams)</Text>
              <View style={s.macroRow}>
                {[
                  { label: 'Protein', value: protein, setter: setProtein },
                  { label: 'Carbs',   value: carbs,   setter: setCarbs   },
                  { label: 'Fat',     value: fat,      setter: setFat     },
                ].map(({ label, value, setter }) => (
                  <View key={label} style={s.macroField}>
                    <Text style={s.macroLabel}>{label}</Text>
                    <TextInput
                      style={s.macroInput}
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                      value={value}
                      onChangeText={t => setter(t.replace(/[^0-9.]/g, ''))}
                      keyboardType="numeric"
                      returnKeyType="done"
                      maxLength={5}
                    />
                    <Text style={s.macroUnit}>g</Text>
                  </View>
                ))}
              </View>

              {/* ── Serving description ── */}
              <Text style={s.fieldLabel}>Serving size (optional)</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. 1 plate (300g)"
                placeholderTextColor={colors.textMuted}
                value={serving}
                onChangeText={setServing}
                maxLength={60}
                returnKeyType="done"
              />

              {/* ── Live preview ── */}
              {(name.trim().length > 0 || calNum > 0) && (
                <View style={s.preview}>
                  <Text style={s.previewLabel}>PREVIEW</Text>
                  <Text style={s.previewName}>{name.trim() || 'Food name'}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={s.previewCal}>{calNum} kcal</Text>
                    <Text style={s.previewMacros}>
                      P {proNum}g · C {carbNum}g · F {fatNum}g
                    </Text>
                  </View>
                  <MacroBar protein={proNum} carbs={carbNum} fat={fatNum} />
                  {(proNum + carbNum + fatNum > 0) && (
                    <View style={s.legendRow}>
                      <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: colors.blue }]} /><Text style={s.legendText}>Protein</Text></View>
                      <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: colors.amber }]} /><Text style={s.legendText}>Carbs</Text></View>
                      <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: colors.red }]} /><Text style={s.legendText}>Fat</Text></View>
                    </View>
                  )}
                </View>
              )}

              <View style={{ height: spacing.xl }} />
            </ScrollView>

            {/* ── Buttons ── */}
            <View style={s.btnGroup}>
              <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.85}>
                <Text style={s.saveBtnText}>Save food</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.cancelBtn} onPress={handleClose} activeOpacity={0.7}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  kav:     { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    borderTopWidth:  0.5,
    borderTopColor:  colors.border,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    maxHeight: '95%',
  },
  handle: {
    width: 40, height: 4,
    backgroundColor: colors.bgInset,
    borderRadius: 2,
    alignSelf: 'center',
    marginVertical: spacing.md,
  },

  title:    { fontSize: 20, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.lg },

  fieldLabel: { fontSize: 11, color: colors.textMuted, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },

  input: {
    backgroundColor: colors.bgDeep,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  inputErr: { borderColor: colors.red },
  errText:  { fontSize: 12, color: colors.red, marginTop: -4, marginBottom: spacing.sm },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.bgDeep,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  chipActive:     { borderColor: colors.titanium, backgroundColor: colors.bgInset },
  chipText:       { fontSize: 13, color: colors.textMuted },
  chipTextActive: { color: colors.titanium },

  calorieRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  calorieInput: {
    flex: 1,
    backgroundColor: colors.bgDeep,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 24,
    fontWeight: '500',
    color: colors.titanium,
    textAlign: 'center',
  },
  calorieUnit: { fontSize: 15, color: colors.textMuted, width: 36 },

  macroRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  macroField: {
    flex: 1,
    backgroundColor: colors.bgDeep,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  macroLabel: { fontSize: 10, color: colors.textMuted, letterSpacing: 1, marginBottom: 4 },
  macroInput: { fontSize: 18, fontWeight: '500', color: colors.titanium, textAlign: 'center', width: '100%' },
  macroUnit:  { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  preview: {
    backgroundColor: colors.bgDeep,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  previewLabel:  { fontSize: 10, color: colors.textMuted, letterSpacing: 1, marginBottom: 6 },
  previewName:   { fontSize: 16, fontWeight: '500', color: colors.textPrimary, marginBottom: 6 },
  previewCal:    { fontSize: 14, fontWeight: '500', color: colors.titanium },
  previewMacros: { fontSize: 12, color: colors.textMuted },
  legendRow:     { flexDirection: 'row', gap: spacing.md, marginTop: 8 },
  legendItem:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:     { width: 8, height: 8, borderRadius: 4 },
  legendText:    { fontSize: 11, color: colors.textMuted },

  btnGroup: { paddingTop: spacing.md, gap: spacing.sm },
  saveBtn: {
    backgroundColor: colors.titanium,
    borderRadius: radius.md,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: colors.bg },
  cancelBtn: {
    backgroundColor: 'transparent',
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 15, color: colors.textSecondary },
})
