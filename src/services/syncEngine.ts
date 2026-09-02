import { useState, useEffect } from 'react'
import {
  getFirebaseDb,
  isFirebaseConfigured,
} from './firebase'
import {
  dbGetPendingSyncItems,
  dbRemoveSyncItem,
  SyncQueueItem,
} from './localDb'
import { doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore'

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'pending' | 'error'

type SyncListener = (status: SyncStatus, pendingCount: number, lastSyncedAt: number | null) => void

let currentStatus: SyncStatus = 'synced'
let lastSyncTime: number | null = Date.now()
let isSyncing = false
const listeners: Set<SyncListener> = new Set()

export function subscribeSyncStatus(listener: SyncListener): () => void {
  listeners.add(listener)
  listener(currentStatus, 0, lastSyncTime)
  return () => listeners.delete(listener)
}

function updateStatus(status: SyncStatus, pendingCount = 0) {
  currentStatus = status
  if (status === 'synced') {
    lastSyncTime = Date.now()
  }
  listeners.forEach(l => l(status, pendingCount, lastSyncTime))
}

export function getSyncStatus(): { status: SyncStatus; lastSyncedAt: number | null } {
  return { status: currentStatus, lastSyncedAt: lastSyncTime }
}

/**
 * React Hook for consuming live synchronization state.
 */
export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>(currentStatus)
  const [pendingCount, setPendingCount] = useState<number>(0)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(lastSyncTime)

  useEffect(() => {
    return subscribeSyncStatus((s, count, time) => {
      setStatus(s)
      setPendingCount(count)
      setLastSyncedAt(time)
    })
  }, [])

  return { status, pendingCount, lastSyncedAt }
}

/**
 * Flush pending SQLite sync queue to Firestore.
 */
export async function flushSyncQueue(uid: string): Promise<boolean> {
  if (!uid || isSyncing) return false
  if (!isFirebaseConfigured()) {
    updateStatus('offline', 0)
    return false
  }

  const db = getFirebaseDb()
  if (!db) {
    updateStatus('offline', 0)
    return false
  }

  const pendingItems = dbGetPendingSyncItems(uid)
  if (pendingItems.length === 0) {
    updateStatus('synced', 0)
    return true
  }

  isSyncing = true
  updateStatus('syncing', pendingItems.length)

  try {
    for (const item of pendingItems) {
      const payload = JSON.parse(item.payloadJson)
      await syncItemToFirestore(db, uid, item.entityType, item.entityId, payload)
      dbRemoveSyncItem(item.id)
    }

    const remaining = dbGetPendingSyncItems(uid)
    if (remaining.length === 0) {
      updateStatus('synced', 0)
    } else {
      updateStatus('pending', remaining.length)
    }
    isSyncing = false
    return true
  } catch (err) {
    console.warn('[SyncEngine] Flush sync queue error:', err)
    const remaining = dbGetPendingSyncItems(uid)
    updateStatus('error', remaining.length)
    isSyncing = false
    return false
  }
}

async function syncItemToFirestore(
  db: any,
  uid: string,
  entityType: SyncQueueItem['entityType'],
  entityId: string,
  payload: any
): Promise<void> {
  switch (entityType) {
    case 'profile':
      await setDoc(doc(db, 'users', uid), { ...payload, updatedAt: serverTimestamp() }, { merge: true })
      break
    case 'session':
      await setDoc(doc(db, 'sessions', entityId), { ...payload, uid, loggedAt: serverTimestamp() }, { merge: true })
      break
    case 'pr':
      await setDoc(doc(db, 'prs', `${uid}_${entityId}`), { ...payload, uid, achievedAt: serverTimestamp() }, { merge: true })
      break
    case 'weight':
      await addDoc(collection(db, 'weightLogs'), { ...payload, uid, loggedAt: serverTimestamp() })
      break
    case 'nutrition':
      await setDoc(doc(db, 'nutrition', `${uid}_${entityId}`), { ...payload, uid, updatedAt: serverTimestamp() }, { merge: true })
      break
    case 'custom_food':
      await setDoc(doc(db, 'users', uid, 'customFoods', entityId), payload, { merge: true })
      break
  }
}
