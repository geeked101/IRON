/**
 * PhotoProgressScreen.tsx
 *
 * Lets the user take or pick progress photos.
 * Photos are saved locally on the device — no internet needed.
 *
 * Storage:
 *   - expo-file-system: saves the actual image file permanently
 *   - AsyncStorage: saves the list of photo metadata (path, date, note)
 */

import React, { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Image, Alert, Dimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system/legacy'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { colors, spacing, radius } from '../theme'

// ── Constants ─────────────────────────────────────────────────────────────────

/** AsyncStorage key for the photo list */
const STORAGE_KEY = 'iron_progress_photos'

/** Folder inside the app where photos are permanently saved */
const PHOTOS_DIR = FileSystem.documentDirectory + 'progress_photos/'

/** Screen width — used to calculate grid cell size */
const SCREEN_W = Dimensions.get('window').width

/** Each photo cell = half screen width minus padding and gap */
const CELL_SIZE = (SCREEN_W - spacing.lg * 2 - spacing.sm) / 2

// ── Types ─────────────────────────────────────────────────────────────────────

/** One photo entry saved to AsyncStorage */
export interface PhotoEntry {
  id:    string   // unique ID — we use the timestamp
  uri:   string   // local file path inside the app folder
  date:  string   // human readable e.g. '22 May 2026'
  note?: string   // optional user note
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Makes sure the photos directory exists.
 * Creates it if it doesn't. Safe to call multiple times.
 */
async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(PHOTOS_DIR)
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true })
  }
}

/**
 * Loads the saved photo list from AsyncStorage.
 * Returns empty array if nothing saved yet.
 */
async function loadPhotos(): Promise<PhotoEntry[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw) : []
}

/**
 * Saves the full photo list to AsyncStorage.
 */
async function savePhotos(photos: PhotoEntry[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(photos))
}

/**
 * Formats today's date as a readable string e.g. '22 May 2026'
 */
function todayLabel(): string {
  return new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── Main Screen ───────────────────────────────────────────────────────────────

/** PhotoProgressScreen — grid of progress photos with add button */
export default function PhotoProgressScreen({ navigation }: any) {
  const insets = useSafeAreaInsets()
  const [photos, setPhotos] = useState<PhotoEntry[]>([])

  // Load saved photos when screen opens
  useFocusEffect(
    React.useCallback(() => {
      loadPhotos().then(setPhotos)
    }, [])
  )

  /**
   * Handles picking a photo from the gallery or camera.
   * Copies it to the app's permanent folder so it survives
   * if the user deletes from their gallery.
   */
  async function handleAddPhoto(source: 'camera' | 'gallery') {
    // Ask for permission
    const permission = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        `IRON needs ${source} access to save progress photos.`,
      )
      return
    }

    // Launch the picker
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8 })

    // User cancelled
    if (result.canceled) return

    const pickedUri = result.assets[0].uri

    // Copy to permanent app folder
    await ensureDir()
    const id       = Date.now().toString()
    const destPath = PHOTOS_DIR + id + '.jpg'
    await FileSystem.copyAsync({ from: pickedUri, to: destPath })

    // Save metadata to AsyncStorage
    const newEntry: PhotoEntry = {
      id,
      uri:  destPath,
      date: todayLabel(),
    }
    const updated = [newEntry, ...photos]
    setPhotos(updated)
    await savePhotos(updated)
  }

  /**
   * Shows a bottom sheet style alert to choose camera or gallery.
   */
  function handleFABPress() {
    Alert.alert(
      'Add photo',
      'Choose a source',
      [
        { text: 'Take photo',          onPress: () => handleAddPhoto('camera')  },
        { text: 'Choose from gallery', onPress: () => handleAddPhoto('gallery') },
        { text: 'Cancel', style: 'cancel' },
      ],
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>‹ Progress</Text>
        </TouchableOpacity>
        <Text style={s.title}>Photos</Text>
      </View>

      {/* Empty state */}
      {photos.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>📸</Text>
          <Text style={s.emptyTitle}>No photos yet</Text>
          <Text style={s.emptySub}>
            Track your physique by adding your first progress photo.
          </Text>
          <TouchableOpacity style={s.emptyBtn} onPress={handleFABPress}>
            <Text style={s.emptyBtnText}>Add first photo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.grid}
          showsVerticalScrollIndicator={false}
        >
          {photos.map(photo => (
            <TouchableOpacity
              key={photo.id}
              style={s.cell}
              onPress={() => navigation.push('PhotoDetail', { photo })}
              activeOpacity={0.85}
            >
              <Image source={{ uri: photo.uri }} style={s.cellImage} />
              <Text style={s.cellDate}>{photo.date}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* FAB — floating add button */}
      {photos.length > 0 && (
        <TouchableOpacity
          style={[s.fab, { bottom: insets.bottom + spacing.lg }]}
          onPress={handleFABPress}
          activeOpacity={0.85}
        >
          <Text style={s.fabText}>+</Text>
        </TouchableOpacity>
      )}

    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.md,
  },
  backBtn: { marginBottom: spacing.xs },
  backText: { fontSize: 16, color: colors.titaniumMid },
  title:    { fontSize: 26, fontWeight: '600', color: colors.textPrimary },

  // Grid
  grid: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    gap:            spacing.sm,
    padding:        spacing.lg,
    paddingBottom:  100,  // room for FAB
  },
  cell: {
    width:        CELL_SIZE,
    borderRadius: radius.md,
    overflow:     'hidden',
    backgroundColor: colors.bgCard,
  },
  cellImage: {
    width:  CELL_SIZE,
    height: CELL_SIZE,
  },
  cellDate: {
    fontSize:  12,
    color:     colors.textMuted,
    padding:   spacing.xs,
    textAlign: 'center',
  },

  // Empty state
  empty: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    padding:        spacing.xl,
  },
  emptyIcon:  { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm },
  emptySub:   { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl },
  emptyBtn: {
    backgroundColor: colors.titanium,
    borderRadius:    radius.md,
    height:          56,
    paddingHorizontal: spacing.xl,
    alignItems:      'center',
    justifyContent:  'center',
  },
  emptyBtnText: { fontSize: 16, fontWeight: '600', color: colors.bg },

  // FAB
  fab: {
    position:        'absolute',
    right:           spacing.lg,
    width:           64,
    height:          64,
    borderRadius:    32,
    backgroundColor: colors.titanium,
    alignItems:      'center',
    justifyContent:  'center',
    elevation:       6,  // Android shadow
  },
  fabText: { fontSize: 32, color: colors.bg, lineHeight: 36 },
})