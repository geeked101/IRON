/**
 * SyncBadge.tsx
 *
 * Prominent visual synchronization status badge for IRON.
 * Displays sync state ('synced' | 'pending' | 'syncing' | 'offline' | 'error'),
 * pending mutation count, last synced time, and a manual "Sync Now" button.
 */

import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { colors, radius, spacing } from '../theme'
import { useSyncStatus, flushSyncQueue } from '../services/syncEngine'
import { useAuthStore } from '../store/index'

export default function SyncBadge() {
  const { status, pendingCount, lastSyncedAt } = useSyncStatus()
  const { uid } = useAuthStore()
  const [manualSyncing, setManualSyncing] = useState(false)

  async function handleManualSync() {
    if (!uid || manualSyncing) return
    setManualSyncing(true)
    try {
      await flushSyncQueue(uid)
    } finally {
      setManualSyncing(false)
    }
  }

  function renderStatusDetails() {
    switch (status) {
      case 'synced':
        return {
          dotColor: '#34c759',
          title: 'Cloud Synced',
          sub: lastSyncedAt ? `Last synced ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Up to date',
          showBtn: false,
        }
      case 'syncing':
        return {
          dotColor: '#0a84ff',
          title: 'Syncing Changes...',
          sub: pendingCount > 0 ? `${pendingCount} items pending` : 'Updating cloud database',
          showBtn: false,
        }
      case 'pending':
        return {
          dotColor: '#ff9f0a',
          title: 'Sync Pending',
          sub: `${pendingCount} local ${pendingCount === 1 ? 'change' : 'changes'} waiting for cloud`,
          showBtn: true,
        }
      case 'offline':
        return {
          dotColor: '#8e8e93',
          title: 'Local SQLite Mode',
          sub: 'Changes saved locally on device',
          showBtn: true,
        }
      case 'error':
        return {
          dotColor: '#ff453a',
          title: 'Sync Warning',
          sub: 'Cloud update paused. Tap to retry.',
          showBtn: true,
        }
    }
  }

  const details = renderStatusDetails()

  return (
    <View style={s.card}>
      <View style={s.row}>
        <View style={[s.dot, { backgroundColor: details.dotColor }]} />
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{details.title}</Text>
          <Text style={s.sub}>{details.sub}</Text>
        </View>

        {details.showBtn && (
          <TouchableOpacity
            style={s.syncBtn}
            onPress={handleManualSync}
            disabled={manualSyncing || status === 'syncing'}
          >
            {manualSyncing ? (
              <ActivityIndicator color={colors.titanium} size="small" />
            ) : (
              <Text style={s.syncBtnText}>Sync Now</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  syncBtn: {
    backgroundColor: colors.bgDeep,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  syncBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.titanium,
  },
})
