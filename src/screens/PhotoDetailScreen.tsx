/**
 * PhotoDetailScreen.tsx
 *
 * Fullscreen view of a single progress photo.
 * User can add/edit a note and delete the photo.
 *
 * Receives via route.params:
 *   photo: PhotoEntry — the photo to display
 */

import React, { useState } from 'react'
import {
  View, Text, Image, TouchableOpacity,
  StyleSheet, TextInput, Alert, ScrollView,
  KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as FileSystem from 'expo-file-system/legacy'
import { colors, spacing, radius } from '../theme'
import { PhotoEntry } from './PhotoProgressScreen'

const STORAGE_KEY = 'iron_progress_photos'
const SCREEN_H    = Dimensions.get('window').height

/** PhotoDetailScreen — fullscreen photo with note and delete */
export default function PhotoDetailScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets()
  const { photo } = route.params as { photo: PhotoEntry }

  const [note, setNote]     = useState(photo.note ?? '')
  const [saving, setSaving] = useState(false)

  /**
   * Saves the updated note back to AsyncStorage.
   * Finds the photo by id and updates just the note field.
   */
  async function handleSaveNote() {
    setSaving(true)
    try {
      const raw     = await AsyncStorage.getItem(STORAGE_KEY)
      const photos: PhotoEntry[] = raw ? JSON.parse(raw) : []
      const updated = photos.map(p =>
        p.id === photo.id ? { ...p, note: note.trim() } : p
      )
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } finally {
      setSaving(false)
    }
  }

  /**
   * Deletes the photo — removes the file from the device
   * and removes the entry from AsyncStorage, then goes back.
   */
  async function handleDelete() {
    Alert.alert(
      'Delete photo',
      'This cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete the actual file
              await FileSystem.deleteAsync(photo.uri, { idempotent: true })
              // Remove from AsyncStorage
              const raw     = await AsyncStorage.getItem(STORAGE_KEY)
              const photos: PhotoEntry[] = raw ? JSON.parse(raw) : []
              const updated = photos.filter(p => p.id !== photo.id)
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
            } finally {
              navigation.goBack()
            }
          },
        },
      ],
    )
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={[s.container, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={async () => { await handleSaveNote(); navigation.goBack() }} style={s.backBtn}>
            <Text style={s.backText}>‹ Photos</Text>
          </TouchableOpacity>
          <Text style={s.date}>{photo.date}</Text>
          <TouchableOpacity onPress={handleDelete} style={s.deleteBtn}>
            <Text style={s.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>

        {/* Photo */}
        <Image
          source={{ uri: photo.uri }}
          style={s.photo}
          resizeMode="cover"
        />

        {/* Note section */}
        <View style={s.noteSection}>
          <Text style={s.noteLabel}>NOTE</Text>
          <TextInput
            style={s.noteInput}
            placeholder="How are you feeling? Any changes you notice..."
            placeholderTextColor={colors.textMuted}
            value={note}
            onChangeText={setNote}
            onBlur={handleSaveNote}
            multiline
            maxLength={200}
          />
          <Text style={[
            s.charCount,
            note.length > 160 ? { color: colors.amber } : {},
          ]}>
            {note.length} / 200
          </Text>
          <TouchableOpacity
          style={{
            backgroundColor: colors.titanium,
            borderRadius: radius.md,
            height: 52,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: spacing.md,
        }}
        onPress={handleSaveNote}
        >
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.bg }}>
                {saving ? 'Saving...' : 'Save note'}
            </Text>
            </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.md,
  },
  backBtn:    { minWidth: 44, minHeight: 44, justifyContent: 'center' },
  backText:   { fontSize: 16, color: colors.titaniumMid },
  date:       { fontSize: 15, color: colors.textPrimary, fontWeight: '500' },
  deleteBtn:  { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'flex-end' },
  deleteText: { fontSize: 14, color: colors.red },

  photo: {
    width:  '100%',
    height: SCREEN_H * 0.55,
  },

  noteSection: {
    margin:       spacing.lg,
    backgroundColor: colors.bgCard,
    borderWidth:  0.5,
    borderColor:  colors.border,
    borderRadius: radius.lg,
    padding:      spacing.md,
  },
  noteLabel: {
    fontSize:      11,
    color:         colors.textMuted,
    letterSpacing: 1,
    marginBottom:  spacing.sm,
  },
  noteInput: {
    fontSize:   15,
    color:      colors.textPrimary,
    minHeight:  80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize:  12,
    color:     colors.textMuted,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
})