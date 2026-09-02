import React, { useState, useEffect, useMemo } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, Modal, Alert
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { format } from 'date-fns'
import { colors, spacing, radius, typography } from '../theme'
import { useNutritionStore, useAuthStore } from '../store/index'
import { KENYAN_FOODS, CATEGORIES, Food, FoodCategory } from '../data/kenyaFoods'
import { MealEntry, CustomFood } from '../services/firebase'
import { useCustomFoodStore } from '../store/customFoodStore'
import AddCustomFoodModal from '../components/AddCustomFoodModal'

function MacroBar({ value, target, color }: { value: number; target: number; color: string }) {
  const pct = Math.min(value / target, 1)
  return (
    <View style={mb.bg}>
      <View style={[mb.fg, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
    </View>
  )
}
const mb = StyleSheet.create({
  bg: { height: 5, backgroundColor: colors.bgDeep, borderRadius: 3, marginTop: 6 },
  fg: { height: 5, borderRadius: 3 },
})

function FoodDetailModal({ food, visible, onClose, onAdd }: {
  food: Food | null
  visible: boolean
  onClose: () => void
  onAdd: (meal: MealEntry) => void
}) {
  const [servings, setServings] = useState(1)
  const [servingsText, setServingsText] = useState('1.0')

  useEffect(() => {
    if (visible) {
      setServings(1)
      setServingsText('1.0')
    }
  }, [visible])

  if (!food) return null

  const cal = Math.round(food.caloriesPerServing * servings)
  const pro = Math.round(food.proteinG * servings)
  const carb = Math.round(food.carbsG * servings)
  const fat = Math.round(food.fatG * servings)

  const updateServings = (val: number) => {
    const clamped = Math.max(0.1, Math.min(50, parseFloat(val.toFixed(1))))
    setServings(clamped)
    setServingsText(clamped.toFixed(1))
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={md.overlay}>
        <View style={md.sheet}>
          <View style={md.handle} />
          <Text style={md.name}>{food.name}</Text>
          <Text style={md.sub}>{food.servingDescription}</Text>

          <View style={md.macroGrid}>
            <View style={md.macroItem}><Text style={md.macroVal}>{cal}</Text><Text style={md.macroLab}>kcal</Text></View>
            <View style={md.macroItem}><Text style={md.macroVal}>{pro}g</Text><Text style={md.macroLab}>protein</Text></View>
            <View style={md.macroItem}><Text style={md.macroVal}>{carb}g</Text><Text style={md.macroLab}>carbs</Text></View>
            <View style={md.macroItem}><Text style={md.macroVal}>{fat}g</Text><Text style={md.macroLab}>fat</Text></View>
          </View>

          <View style={md.servRow}>
            <Text style={md.servLabel}>Servings</Text>
            <View style={md.stepper}>
              <TouchableOpacity
                style={md.stepBtn}
                onPress={() => updateServings(servings - 0.5)}
                activeOpacity={0.7}
              >
                <Text style={md.stepText}>−</Text>
              </TouchableOpacity>
              <View style={md.stepInputBox}>
                <TextInput
                  style={md.stepInput}
                  value={servingsText}
                  onChangeText={(t) => {
                    setServingsText(t)
                    const parsed = parseFloat(t)
                    if (!isNaN(parsed) && parsed > 0) {
                      setServings(parsed)
                    }
                  }}
                  onBlur={() => {
                    const parsed = parseFloat(servingsText)
                    if (isNaN(parsed) || parsed <= 0) {
                      setServingsText(servings.toFixed(1))
                    } else {
                      updateServings(parsed)
                    }
                  }}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                />
              </View>
              <TouchableOpacity
                style={md.stepBtn}
                onPress={() => updateServings(servings + 0.5)}
                activeOpacity={0.7}
              >
                <Text style={md.stepText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={md.addBtn} onPress={() => {
            onAdd({
              name: food.name,
              calories: cal,
              protein: pro,
              carbs: carb,
              fat,
              servings,
              time: format(new Date(), 'HH:mm'),
            })
            setServings(1)
            onClose()
          }}>
            <Text style={md.addBtnText}>Add to today · {cal} kcal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={md.cancelBtn} onPress={onClose}>
            <Text style={md.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const md = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.xl, paddingBottom: 40 },
  handle: { width: 36, height: 4, backgroundColor: colors.bgInset, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg },
  name: { fontSize: 20, fontWeight: '500', color: colors.textPrimary, marginBottom: 4 },
  sub: { ...typography.small, marginBottom: spacing.lg },
  macroGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  macroItem: { flex: 1, backgroundColor: colors.bgDeep, borderRadius: radius.sm, padding: spacing.sm, alignItems: 'center' },
  macroVal: { fontSize: 18, fontWeight: '500', color: colors.titanium },
  macroLab: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  servRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bgDeep, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  servLabel: { fontSize: 14, color: colors.textPrimary },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: colors.bgInset, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 20, color: colors.titaniumMid },
  stepInputBox: { minWidth: 54, height: 36, borderRadius: 8, backgroundColor: colors.bgInset, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  stepInput: { fontSize: 18, fontWeight: '500', color: colors.titanium, textAlign: 'center', minWidth: 40, padding: 0 },
  addBtn: { backgroundColor: colors.titanium, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', marginBottom: spacing.sm },
  addBtnText: { fontSize: 15, fontWeight: '500', color: colors.bg },
  cancelBtn: { padding: spacing.sm, alignItems: 'center' },
  cancelText: { fontSize: 14, color: colors.textMuted },
})

export default function NutritionScreen() {
  const insets = useSafeAreaInsets()
  const { meals, totalCalories, totalProtein, waterLitres, targetCalories, targetProtein, targetWater, addMeal, addWater, load } = useNutritionStore()
  const { uid } = useAuthStore()
  const { foods: customFoods, load: loadCustomFoods, remove: removeCustomFood } = useCustomFoodStore()
  const [view, setView] = useState<'dashboard' | 'log'>('dashboard')
  const [category, setCategory] = useState<FoodCategory | 'all'>('all')
  const [selectedFood, setSelectedFood] = useState<Food | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [addFoodModalVisible, setAddFoodModalVisible] = useState(false)

  useEffect(() => {
    load()
    if (uid) loadCustomFoods(uid)
  }, [uid])

  /** Convert a CustomFood to the Food shape expected by FoodDetailModal. */
  function customFoodToFood(cf: CustomFood): Food {
    return {
      id: cf.id,
      name: cf.name,
      category: 'snacks' as FoodCategory,
      caloriesPerServing: cf.caloriesPerServing,
      proteinG: cf.proteinG,
      carbsG: cf.carbsG,
      fatG: cf.fatG,
      servingDescription: cf.servingDescription,
      servingGrams: 0,
    }
  }

  /** Long-press a custom food to offer deletion. */
  function handleCustomFoodLongPress(cf: CustomFood) {
    Alert.alert(
      `Delete "${cf.name}"?`,
      'This food will be removed from your custom list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => { if (uid) removeCustomFood(uid, cf.id) },
        },
      ],
    )
  }

  const filteredFoods = useMemo(() => {
    return category === 'all'
      ? KENYAN_FOODS
      : KENYAN_FOODS.filter(f => f.category === category)
  }, [category])

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <FoodDetailModal
        food={selectedFood}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={addMeal}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.ph}>
          <Text style={s.muted}>{format(new Date(), 'EEEE')} · Lean bulk</Text>
          <Text style={s.title}>Nutrition</Text>

          {/* View toggle */}
          <View style={s.toggle}>
            <TouchableOpacity style={[s.toggleBtn, view === 'dashboard' && s.toggleBtnOn]} onPress={() => setView('dashboard')}>
              <Text style={[s.toggleText, view === 'dashboard' && s.toggleTextOn]}>Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.toggleBtn, view === 'log' && s.toggleBtnOn]} onPress={() => setView('log')}>
              <Text style={[s.toggleText, view === 'log' && s.toggleTextOn]}>Log food</Text>
            </TouchableOpacity>
          </View>

          {/* ── DASHBOARD ── */}
          {view === 'dashboard' && (
            <>
              {/* Calorie card */}
              <View style={[s.card, { backgroundColor: colors.greenBg, borderColor: colors.greenBorder }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
                  <View>
                    <Text style={[s.label, { color: colors.green }]}>CALORIES</Text>
                    <Text style={s.bigNum}>{totalCalories}<Text style={s.bigNumSub}> / {targetCalories}</Text></Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.muted}>remaining</Text>
                    <Text style={[s.bigNum, { fontSize: 22, color: colors.green }]}>{Math.max(0, targetCalories - totalCalories)}</Text>
                  </View>
                </View>
                <MacroBar value={totalCalories} target={targetCalories} color={colors.green} />
              </View>

              {/* Macro cards */}
              <View style={s.grid2}>
                <View style={s.macroCard}>
                  <Text style={s.macroCardVal}>{totalProtein}<Text style={s.macroCardUnit}>g</Text></Text>
                  <Text style={s.macroCardLab}>protein / {targetProtein}g</Text>
                  <MacroBar value={totalProtein} target={targetProtein} color={colors.titaniumMid} />
                </View>
                <View style={s.macroCard}>
                  <Text style={s.macroCardVal}>{waterLitres.toFixed(1)}<Text style={s.macroCardUnit}>L</Text></Text>
                  <Text style={s.macroCardLab}>water / {targetWater}L</Text>
                  <MacroBar value={waterLitres} target={targetWater} color={colors.blue} />
                  <TouchableOpacity style={s.addWaterBtn} onPress={() => addWater(0.25)}>
                    <Text style={s.addWaterText}>+250ml</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Mass shake */}
              <TouchableOpacity style={s.shakeCard} onPress={() => {
                const shake = KENYAN_FOODS.find(f => f.id === 'mass-shake')!
                addMeal({ name: shake.name, calories: shake.caloriesPerServing, protein: shake.proteinG, carbs: shake.carbsG, fat: shake.fatG, servings: 1, time: format(new Date(), 'HH:mm') })
              }}>
                <View>
                  <Text style={[s.label, { color: colors.amber }]}>MASS SHAKE</Text>
                  <Text style={s.shakeName}>Homemade Mass Shake</Text>
                  <Text style={s.muted}>Milk · oats · banana · PB · honey</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.shakeKcal}>+850</Text>
                  <Text style={s.muted}>kcal · 35g pro</Text>
                </View>
              </TouchableOpacity>

              {/* Meals logged */}
              <View style={s.card}>
                <Text style={[s.label, { marginBottom: spacing.sm }]}>TODAY'S MEALS</Text>
                {meals.length === 0 && (
                  <Text style={[s.muted, { textAlign: 'center', padding: spacing.lg }]}>Nothing logged yet. Tap Log food.</Text>
                )}
                {meals.map((meal, i) => (
                  <View key={i} style={s.mealRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.mealName}>{meal.name}</Text>
                      <Text style={s.muted}>{meal.time}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={s.mealCal}>{meal.calories} kcal</Text>
                      <Text style={s.muted}>{meal.protein}g protein</Text>
                    </View>
                  </View>
                ))}
                <TouchableOpacity style={s.addMealBtn} onPress={() => setView('log')}>
                  <Text style={s.addMealText}>+ Log meal</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── LOG FOOD ── */}
          {view === 'log' && (
            <>
              {/* Category filter */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat.key}
                      style={[s.catPill, category === cat.key && s.catPillOn]}
                      onPress={() => setCategory(cat.key as any)}
                    >
                      <Text style={[s.catText, category === cat.key && s.catTextOn]}>{cat.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <View style={s.card}>
                <Text style={[s.label, { marginBottom: spacing.sm }]}>KENYAN FOODS</Text>
                {filteredFoods.map((food, i) => (
                  <TouchableOpacity
                    key={food.id}
                    style={[s.foodRow, i === filteredFoods.length - 1 && { borderBottomWidth: 0 }]}
                    onPress={() => { setSelectedFood(food); setModalVisible(true) }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={s.foodName}>{food.name}</Text>
                      <Text style={s.muted}>{food.proteinG}g pro · {food.carbsG}g carbs · {food.servingDescription}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={s.foodCal}>{food.caloriesPerServing}</Text>
                      <Text style={s.muted}>kcal</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* ── My (custom) foods ── */}
              {customFoods.length > 0 && (
                <View style={s.card}>
                  <Text style={[s.label, { marginBottom: spacing.sm }]}>MY FOODS</Text>
                  {customFoods.map((cf, i) => (
                    <TouchableOpacity
                      key={cf.id}
                      style={[s.foodRow, i === customFoods.length - 1 && { borderBottomWidth: 0 }]}
                      onPress={() => { setSelectedFood(customFoodToFood(cf)); setModalVisible(true) }}
                      onLongPress={() => handleCustomFoodLongPress(cf)}
                      delayLongPress={500}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={s.foodName}>{cf.name}</Text>
                          <View style={s.customBadge}>
                            <Text style={s.customBadgeText}>custom</Text>
                          </View>
                        </View>
                        <Text style={s.muted}>{cf.proteinG}g pro · {cf.carbsG}g carbs · {cf.servingDescription}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={s.foodCal}>{cf.caloriesPerServing}</Text>
                        <Text style={s.muted}>kcal</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* ── Add new food button ── */}
              <TouchableOpacity
                style={s.addNewFoodRow}
                onPress={() => setAddFoodModalVisible(true)}
                activeOpacity={0.75}
              >
                <View style={s.addNewFoodIcon}>
                  <Text style={{ fontSize: 18, color: colors.green }}>+</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.addNewFoodTitle}>Add new food</Text>
                  <Text style={s.muted}>Log your own meals with custom macros</Text>
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add custom food modal */}
      <AddCustomFoodModal
        visible={addFoodModalVisible}
        uid={uid ?? ''}
        onClose={() => setAddFoodModalVisible(false)}
      />
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  ph: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  muted: { ...typography.small },
  title: { fontSize: 22, fontWeight: '500', color: colors.textPrimary, marginBottom: spacing.md },
  label: { fontSize: 11, color: colors.textMuted, letterSpacing: 1 },
  card: { backgroundColor: colors.bgCard, borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm },
  bigNum: { fontSize: 30, fontWeight: '500', color: colors.titanium },
  bigNumSub: { fontSize: 14, color: colors.textMuted },

  toggle: { flexDirection: 'row', backgroundColor: colors.bgDeep, borderRadius: radius.full, padding: 3, marginBottom: spacing.md },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: radius.full, alignItems: 'center' },
  toggleBtnOn: { backgroundColor: colors.bgInset },
  toggleText: { fontSize: 13, color: colors.textMuted },
  toggleTextOn: { color: colors.titanium },

  grid2: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  macroCard: { flex: 1, backgroundColor: colors.bgDeep, borderRadius: radius.md, padding: spacing.md },
  macroCardVal: { fontSize: 20, fontWeight: '500', color: colors.titanium },
  macroCardUnit: { fontSize: 13, color: colors.textMuted },
  macroCardLab: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  addWaterBtn: { marginTop: spacing.sm, backgroundColor: colors.bgInset, borderRadius: radius.sm, paddingVertical: 6, alignItems: 'center' },
  addWaterText: { fontSize: 12, color: colors.blue },

  shakeCard: { backgroundColor: colors.amberBg, borderWidth: 0.5, borderColor: colors.amberBorder, borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  shakeName: { fontSize: 14, fontWeight: '500', color: colors.textPrimary, marginTop: 2 },
  shakeKcal: { fontSize: 22, fontWeight: '500', color: colors.amber },

  mealRow: { flexDirection: 'row', paddingVertical: spacing.sm, borderBottomWidth: 0.5, borderBottomColor: '#1a1e28' },
  mealName: { fontSize: 13, fontWeight: '500', color: colors.textPrimary },
  mealCal: { fontSize: 13, color: colors.titanium },
  addMealBtn: { borderStyle: 'dashed', borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  addMealText: { fontSize: 13, color: colors.titaniumFaint },

  catPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.bgDeep, borderWidth: 0.5, borderColor: colors.border },
  catPillOn: { backgroundColor: colors.bgInset, borderColor: colors.borderMid },
  catText: { fontSize: 12, color: colors.textMuted },
  catTextOn: { color: colors.titanium },

  foodRow: { flexDirection: 'row', paddingVertical: spacing.sm, borderBottomWidth: 0.5, borderBottomColor: '#1a1e28', alignItems: 'center', gap: spacing.sm },
  foodName: { fontSize: 13, fontWeight: '500', color: colors.textPrimary },
  foodCal: { fontSize: 14, fontWeight: '500', color: colors.titanium },

  customBadge: { backgroundColor: colors.bgInset, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, borderWidth: 0.5, borderColor: colors.titaniumFaint },
  customBadgeText: { fontSize: 9, color: colors.titaniumMid },

  addNewFoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgCard,
    borderWidth: 0.5,
    borderColor: colors.greenBorder,
    borderLeftWidth: 3,
    borderLeftColor: colors.green,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 56,
    marginBottom: spacing.sm,
  },
  addNewFoodIcon: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: colors.greenBg,
    borderWidth: 0.5,
    borderColor: colors.greenBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addNewFoodTitle: { fontSize: 15, fontWeight: '500', color: colors.textPrimary },
})
