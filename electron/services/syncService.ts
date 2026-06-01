import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import Store from 'electron-store'
import { db, registerLocalChangeCallback } from './database'

const store = new Store()

export interface SyncRecord {
  id: string
  table_name: string
  payload: string // Encrypted AES-256 JSON ciphertext
  updated_at: string
  device_id: string
  schema_version: number
  checksum: string
}

let syncTimeout: NodeJS.Timeout | null = null

// Encrypt payload with student's device key (AES-256-CBC)
export function encryptPayload(data: any, key: string): string {
  const iv = crypto.randomBytes(16)
  const hashedKey = crypto.createHash('sha256').update(key).digest()
  const cipher = crypto.createCipheriv('aes-256-cbc', hashedKey, iv)
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

// Decrypt payload with student's device key
export function decryptPayload(cipherText: string, key: string): any {
  const parts = cipherText.split(':')
  if (parts.length < 2) throw new Error('Invalid ciphertext format')
  const iv = Buffer.from(parts.shift()!, 'hex')
  const encrypted = parts.join(':')
  const hashedKey = crypto.createHash('sha256').update(key).digest()
  const decipher = crypto.createDecipheriv('aes-256-cbc', hashedKey, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return JSON.parse(decrypted)
}

// Fetch Sync settings
export function getSyncSettings() {
  return {
    autoSync: store.get('settings.sync.autoSync', true) as boolean,
    paused: store.get('settings.sync.paused', false) as boolean,
    deviceId: store.get('settings.sync.deviceId', 'desktop-primary') as string,
    encryptionKey: store.get('settings.sync.encryptionKey', 'scholar-default-passkey') as string,
    offlineSimulated: store.get('settings.sync.offlineSimulated', false) as boolean,
    lastSyncTimestamp: store.get('settings.sync.lastSyncTimestamp', '1970-01-01T00:00:00.000Z') as string,
    supabaseUrl: store.get('settings.sync.supabaseUrl', '') as string,
    supabaseAnonKey: store.get('settings.sync.supabaseAnonKey', '') as string
  }
}

// Update Sync settings
export function setSyncSettings(settings: Partial<ReturnType<typeof getSyncSettings>>) {
  for (const [key, val] of Object.entries(settings)) {
    store.set(`settings.sync.${key}`, val)
  }
  // If settings changed, restart timer
  startSyncTimer()
}

// Test connection to Supabase REST endpoint
export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanUrl = url.trim().replace(/\/$/, '')
    const res = await fetch(`${cleanUrl}/rest/v1/sync_records?limit=1`, {
      method: 'GET',
      headers: {
        'apikey': anonKey.trim(),
        'Authorization': `Bearer ${anonKey.trim()}`
      }
    })
    
    if (res.status === 200 || res.status === 204 || res.status === 404) {
      // 404 is also a success connectivity indicator (table exists but got standard Not Found, or table doesn't exist but API responded)
      // Actually PostgREST returns 200/204 if empty, or 404 if table sync_records doesn't exist yet (means connection works, but table needs SQL execution)
      if (res.status === 404) {
        return { success: true, error: 'Connection successful, but table sync_records was not found. Please execute the SQL setup snippet in Supabase editor!' }
      }
      return { success: true }
    } else {
      const text = await res.text()
      let parsedErr = text
      try { parsedErr = JSON.parse(text).message } catch(e){}
      return { success: false, error: `Supabase Error (${res.status}): ${parsedErr}` }
    }
  } catch (err: any) {
    return { success: false, error: err.message || String(err) }
  }
}


// Get Mock Cloud Relay file path
function getCloudRelayPath(): string {
  const userData = app.getPath('userData')
  return path.join(userData, 'sync_relay_mock.json')
}

// Reads records from mock cloud relay
function readCloudRelay(): SyncRecord[] {
  const filePath = getCloudRelayPath()
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([]))
    return []
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (err) {
    return []
  }
}

// Writes records to mock cloud relay
function writeCloudRelay(records: SyncRecord[]) {
  const filePath = getCloudRelayPath()
  fs.writeFileSync(filePath, JSON.stringify(records, null, 2))
}

// Notify frontend UI via active window
export function notifyUI(type: string, message?: string) {
  try {
    const { BrowserWindow } = require('electron')
    const wins = BrowserWindow.getAllWindows()
    if (wins.length > 0 && wins[0].webContents) {
      wins[0].webContents.send('sync:toast', { type, message })
      wins[0].webContents.send('sync:updated')
    }
  } catch (e) {
    // Suppress if windows are closed
  }
}

// Log a sync event
export function logSyncEvent(status: string, details: {
  recordsPushed: number
  recordsPulled: number
  conflictsResolved: number
  durationMs: number
  error?: string
}) {
  try {
    const id = crypto.randomUUID()
    const timestamp = new Date().toISOString()
    const deviceId = store.get('settings.sync.deviceId', 'desktop-primary') as string

    db.prepare(`
      INSERT INTO sync_logs (id, timestamp, device_id, status, records_pushed, records_pulled, conflicts_resolved, duration_ms, error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      timestamp,
      deviceId,
      status,
      details.recordsPushed,
      details.recordsPulled,
      details.conflictsResolved,
      details.durationMs,
      details.error || null
    )
  } catch (err) {
    console.error('[SyncGuard] Failed to write sync log entry:', err)
  }
}

// Rule-Based conflict resolver
export function resolveConflict(localRecord: any, remoteRecord: any, tableName: string): any {
  const remoteIsDeleted = remoteRecord.is_deleted === 1 || remoteRecord.is_deleted === true
  const localIsDeleted = localRecord.is_deleted === 1 || localRecord.is_deleted === true

  // Rule 3 — Soft-Delete Preservation
  if (localIsDeleted !== remoteIsDeleted) {
    // If one device deleted it and the other modified it, keep the modified version (active wins)
    return localIsDeleted ? remoteRecord : localRecord
  }

  // Rule 4 — Grade Protection
  if (tableName === 'grades') {
    const localGrade = localRecord.grade_value || 0
    const remoteGrade = remoteRecord.grade_value || 0
    
    // Log both to grade_conflict_log for transparency
    try {
      db.prepare(`
        INSERT INTO grade_conflict_log (id, record_id, course_id, semester, local_grade, remote_grade, local_updated_at, remote_updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        localRecord.id,
        localRecord.course_id || '',
        localRecord.semester || '',
        localGrade,
        remoteGrade,
        localRecord.updated_at,
        remoteRecord.updated_at
      )
      notifyUI('sync:conflict_resolved', `تم تسجيل تعارض درجات وحفظ كِلا النسختين للمراجعة.`)
    } catch (err) {
      console.error('[SyncGuard] Error logging grade conflict:', err)
    }

    // Always keep higher updated_at (Rule 1 fallback)
    return new Date(localRecord.updated_at) >= new Date(remoteRecord.updated_at) ? localRecord : remoteRecord
  }

  // Rule 1 — Timestamp Wins (Default)
  const localTime = new Date(localRecord.updated_at || 0).getTime()
  const remoteTime = new Date(remoteRecord.updated_at || 0).getTime()
  return localTime >= remoteTime ? localRecord : remoteRecord
}

// Executes a complete synchronization cycle (Push + Pull)
export async function runSyncCycle(): Promise<{ success: boolean; pushed: number; pulled: number; conflicts: number; error?: string }> {
  const startTime = Date.now()
  const settings = getSyncSettings()
  
  if (settings.paused) {
    return { success: false, pushed: 0, pulled: 0, conflicts: 0, error: 'Sync is paused' }
  }

  // Simulate network connectivity
  if (settings.offlineSimulated) {
    notifyUI('sync:offline')
    return { success: false, pushed: 0, pulled: 0, conflicts: 0, error: 'Device is offline (Simulated)' }
  }

  let pushedCount = 0
  let pulledCount = 0
  let conflictsResolved = 0

  const isSupabaseActive = settings.supabaseUrl && settings.supabaseAnonKey

  try {
    // ----------------------------------------------------
    // STEP 1: FLUSH OFFLINE sync_queue TO CLOUD RELAY (PUSH)
    // ----------------------------------------------------
    const pendingChanges = db.prepare(`
      SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY updated_at ASC
    `).all() as any[]

    if (pendingChanges.length > 0) {
      const batch = pendingChanges.slice(0, 100)

      const recordsToPush = batch.map(change => {
        const decryptedPayload = JSON.parse(change.payload)
        const ciphertext = encryptPayload(decryptedPayload, settings.encryptionKey)
        const shaChecksum = crypto.createHash('sha256').update(JSON.stringify(decryptedPayload)).digest('hex')

        return {
          id: change.record_id,
          table_name: change.table_name,
          payload: ciphertext,
          updated_at: change.updated_at,
          device_id: change.device_id,
          schema_version: change.schema_version,
          checksum: shaChecksum
        }
      })

      if (isSupabaseActive) {
        // Push to Real Supabase Cloud Relay
        const cleanUrl = settings.supabaseUrl.trim().replace(/\/$/, '')
        const res = await fetch(`${cleanUrl}/rest/v1/sync_records`, {
          method: 'POST',
          headers: {
            'apikey': settings.supabaseAnonKey.trim(),
            'Authorization': `Bearer ${settings.supabaseAnonKey.trim()}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(recordsToPush)
        })

        if (![200, 201, 204].includes(res.status)) {
          const text = await res.text()
          throw new Error(`Supabase push failed with status ${res.status}: ${text}`)
        }

        // Mark local queue as synced
        const transaction = db.transaction(() => {
          for (const change of batch) {
            db.prepare(`UPDATE sync_queue SET status = 'synced' WHERE id = ?`).run(change.id)
            pushedCount++
          }
        })
        transaction()
      } else {
        // PUSH to Mock Local JSON Cloud Relay
        const cloudRelay = readCloudRelay()
        const transaction = db.transaction(() => {
          for (const record of recordsToPush) {
            const existingIdx = cloudRelay.findIndex(r => r.id === record.id && r.table_name === record.table_name)
            if (existingIdx !== -1) {
              cloudRelay[existingIdx] = record
            } else {
              cloudRelay.push(record)
            }
          }
          for (const change of batch) {
            db.prepare(`UPDATE sync_queue SET status = 'synced' WHERE id = ?`).run(change.id)
            pushedCount++
          }
        })
        transaction()
        writeCloudRelay(cloudRelay)
      }
    }

    // ----------------------------------------------------
    // STEP 2: PULL RECENT CHANGES FROM CLOUD RELAY
    // ----------------------------------------------------
    const lastSync = settings.lastSyncTimestamp
    let remoteChanges: SyncRecord[] = []

    if (isSupabaseActive) {
      // Pull from Real Supabase Cloud Relay
      const cleanUrl = settings.supabaseUrl.trim().replace(/\/$/, '')
      const queryUrl = `${cleanUrl}/rest/v1/sync_records?updated_at=gt.${encodeURIComponent(lastSync)}&device_id=neq.${encodeURIComponent(settings.deviceId)}`
      const res = await fetch(queryUrl, {
        method: 'GET',
        headers: {
          'apikey': settings.supabaseAnonKey.trim(),
          'Authorization': `Bearer ${settings.supabaseAnonKey.trim()}`
        }
      })

      if (res.status !== 200) {
        const text = await res.text()
        throw new Error(`Supabase pull failed with status ${res.status}: ${text}`)
      }

      remoteChanges = await res.json() as SyncRecord[]
    } else {
      // Pull from Mock Local JSON Cloud Relay
      const cloudRelay = readCloudRelay()
      remoteChanges = cloudRelay.filter(r => 
        r.device_id !== settings.deviceId && 
        new Date(r.updated_at) > new Date(lastSync)
      )
    }

    if (remoteChanges.length > 0) {
      const transaction = db.transaction(() => {
        for (const remoteRecord of remoteChanges) {
          // Schema mismatch check
          if (remoteRecord.schema_version > 1) {
            notifyUI('sync:error', `تنبيه: نسخة قاعدة بيانات السحابة أحدث! يرجى تحديث ScholarOS.`)
            throw new Error('Schema mismatch')
          }

          // Decrypt payload
          let decryptedPayload: any
          try {
            decryptedPayload = decryptPayload(remoteRecord.payload, settings.encryptionKey)
          } catch (err) {
            console.error(`[SyncGuard] Failed to decrypt remote record ${remoteRecord.id}. Keys mismatch?`)
            continue // Skip un-decryptable records
          }

          // Checksum validation
          const calculatedChecksum = crypto.createHash('sha256').update(JSON.stringify(decryptedPayload)).digest('hex')
          if (calculatedChecksum !== remoteRecord.checksum) {
            console.warn(`[SyncGuard] Checksum mismatch on pulled record ${remoteRecord.id}. Skipping.`)
            continue // Skip corrupted payloads
          }

          // Check if record exists locally
          const localRecord = db.prepare(`SELECT * FROM ${remoteRecord.table_name} WHERE id = ?`).get(remoteRecord.id) as any

          let winningRecord = decryptedPayload

          if (localRecord) {
            // Check if there is a pending local change (unsynced mutation)
            const hasLocalChange = db.prepare(`
              SELECT COUNT(*) as cnt FROM sync_queue WHERE record_id = ? AND table_name = ? AND status = 'pending'
            `).get(remoteRecord.id, remoteRecord.table_name) as { cnt: number }

            if (hasLocalChange && hasLocalChange.cnt > 0) {
              // CONFLICT DETECTED! Both changed remote & local unsynced
              winningRecord = resolveConflict(localRecord, decryptedPayload, remoteRecord.table_name)
              conflictsResolved++
            }
          }

          // Write record to local database
          // Rule 5: Timetable slot deduplication
          if (remoteRecord.table_name === 'schedule_slots' && winningRecord.is_deleted === 0) {
            const duplicateSlot = db.prepare(`
              SELECT * FROM schedule_slots 
              WHERE course_id = ? AND day_of_week = ? AND start_time = ? AND is_deleted = 0 AND id != ?
            `).get(winningRecord.course_id, winningRecord.day_of_week, winningRecord.start_time, winningRecord.id) as any

            if (duplicateSlot) {
              // Conflict on same timetable slot! Keep more recently updated, soft-delete other
              const duplicateTime = new Date(duplicateSlot.updated_at || 0).getTime()
              const winningTime = new Date(winningRecord.updated_at || 0).getTime()
              
              if (duplicateTime > winningTime) {
                // Keep local duplicate, ignore remote pull (mark remote as deleted)
                continue
              } else {
                // Keep remote slot, soft-delete local duplicate
                db.prepare(`UPDATE schedule_slots SET is_deleted = 1 WHERE id = ?`).run(duplicateSlot.id)
                // Enqueue the local duplicate soft-delete so it syncs back
                const Store = require('electron-store')
                const storeInst = new Store()
                const depId = storeInst.get('settings.sync.deviceId', 'desktop-primary')
                const upAt = new Date().toISOString()
                db.prepare(`
                  INSERT INTO sync_queue (id, table_name, record_id, payload, updated_at, device_id, schema_version, status)
                  VALUES (?, 'schedule_slots', ?, ?, ?, ?, 1, 'pending')
                `).run(crypto.randomUUID(), duplicateSlot.id, JSON.stringify({ id: duplicateSlot.id, is_deleted: 1, updated_at: upAt, device_id: depId }), upAt, depId)
              }
            }
          }

          // Execute INSERT OR REPLACE locally
          const keys = Object.keys(winningRecord)
          const placeholders = keys.map(() => '?').join(', ')
          db.prepare(`
            INSERT OR REPLACE INTO ${remoteRecord.table_name} (${keys.join(', ')})
            VALUES (${placeholders})
          `).run(...keys.map(k => {
            const v = winningRecord[k]
            if (typeof v === 'boolean') return v ? 1 : 0
            if (typeof v === 'object' && v !== null) return JSON.stringify(v)
            return v
          }))

          pulledCount++
        }
      })
      transaction()
    }

    // Success! Update sync timestamp
    const nowTimestamp = new Date().toISOString()
    store.set('settings.sync.lastSyncTimestamp', nowTimestamp)

    const duration = Date.now() - startTime
    logSyncEvent('success', {
      recordsPushed: pushedCount,
      recordsPulled: pulledCount,
      conflictsResolved: conflictsResolved,
      durationMs: duration
    })

    if (pushedCount > 0 || pulledCount > 0 || conflictsResolved > 0) {
      notifyUI('sync:success')
      if (conflictsResolved > 0) {
        notifyUI('sync:conflict_resolved', `تمت مزامنة البيانات تلقائياً وحل ${conflictsResolved} تعارض بنجاح!`)
      } else {
        notifyUI('sync:success', `تمت المزامنة بنجاح. تم رفع ${pushedCount} وتنزيل ${pulledCount} سجل.`)
      }
    }

    return {
      success: true,
      pushed: pushedCount,
      pulled: pulledCount,
      conflicts: conflictsResolved
    }

  } catch (err: any) {
    const duration = Date.now() - startTime
    logSyncEvent('error', {
      recordsPushed: pushedCount,
      recordsPulled: pulledCount,
      conflictsResolved: conflictsResolved,
      durationMs: duration,
      error: err.message || String(err)
    })
    notifyUI('sync:error', `خطأ في المزامنة: ${err.message || 'تعذر الاتصال بسحابة المزامنة.'}`)
    return {
      success: false,
      pushed: pushedCount,
      pulled: pulledCount,
      conflicts: conflictsResolved,
      error: err.message
    }
  }
}

// Silent triggers (debounce / avoid overlap)
let syncPromiseInProgress: Promise<any> | null = null
export function triggerSilentSync() {
  const settings = getSyncSettings()
  if (settings.paused) return

  if (syncPromiseInProgress) return
  
  syncPromiseInProgress = runSyncCycle()
    .finally(() => {
      syncPromiseInProgress = null
    })
}

// Standard 5-Minute Scheduler Timer
export function startSyncTimer() {
  if (syncTimeout) {
    clearInterval(syncTimeout)
    syncTimeout = null
  }
  const settings = getSyncSettings()
  if (settings.paused || !settings.autoSync) return

  // Run immediately on schedule start
  triggerSilentSync()

  // Run every 5 minutes
  syncTimeout = setInterval(() => {
    triggerSilentSync()
  }, 5 * 60 * 1000)
}

export function stopSyncTimer() {
  if (syncTimeout) {
    clearInterval(syncTimeout)
    syncTimeout = null
  }
}

// Register callback in database to decouple dependency and avoid circular import issues
registerLocalChangeCallback(triggerSilentSync)
