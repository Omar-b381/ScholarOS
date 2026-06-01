import cron from 'node-cron'
import notifier from 'node-notifier'
import { getEventsRange, addNotificationLog, getNotificationLogs } from './database'
import Store from 'electron-store'
import { getGoogleStatus, syncEventsToGoogleCalendar } from './googleCalendarService'
import { BrowserWindow } from 'electron'

const store = new Store()

let cronTask: cron.ScheduledTask | null = null
let syncCronTask: cron.ScheduledTask | null = null

export function initNotificationService(webContents?: any) {
  // Load events and schedule check every 15 minutes
  cronTask = cron.schedule('*/15 * * * *', () => {
    checkDueNotifications(webContents)
  })

  // Check and sync Google Calendar every 5 minutes
  syncCronTask = cron.schedule('*/5 * * * *', () => {
    runBackgroundGoogleSync()
  })

  // Also check immediately on startup
  checkDueNotifications(webContents)
}

export function stopNotificationService() {
  if (cronTask) {
    cronTask.stop()
    cronTask = null
  }
  if (syncCronTask) {
    syncCronTask.stop()
    syncCronTask = null
  }
}

async function runBackgroundGoogleSync() {
  try {
    const status = await getGoogleStatus()
    if (status && status.connected) {
      console.log('[Background-Sync] Starting automatic scheduled sync...')
      const res = await syncEventsToGoogleCalendar()
      if (res.success) {
        console.log('[Background-Sync] Scheduled sync completed successfully. Broadcasting reload signal...')
        const win = BrowserWindow.getAllWindows()[0]
        if (win && win.webContents) {
          win.webContents.send('google:auto-synced')
        }
      } else {
        console.log('[Background-Sync] Scheduled sync message:', res.message)
      }
    }
  } catch (err) {
    console.error('[Background-Sync] Failed scheduled sync:', err)
  }
}

async function checkDueNotifications(webContents?: any) {
  // Check settings
  const notificationsEnabled = store.get('settings.notifications.enabled', true) as boolean
  if (!notificationsEnabled) return

  const notify24h = store.get('settings.notifications.notify24h', true) as boolean
  const notify1h = store.get('settings.notifications.notify1h', true) as boolean

  // Get active configurations, we always enable smart exam notifications if notifications are globally enabled
  const now = new Date()
  const thirtyDaysLater = new Date()
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30)

  // Get events in the next 30 days
  const events = getEventsRange(now.toISOString(), thirtyDaysLater.toISOString())
  const logs = getNotificationLogs()

  // Helper to check if log exists
  const hasLogged = (eventId: string, type: string) => {
    return logs.some((log: any) => log.event_id === eventId && log.type === type)
  }

  for (const event of events as any[]) {
    const eventTime = new Date(event.start_date)
    const diffMs = eventTime.getTime() - now.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)

    const isExam = event.type === 'Exam' || /امتحان|اختبار|كويز|quiz|exam/i.test(event.title || '')

    // 1. Smart Exam Reminders (7 Days before the exam)
    if (isExam && diffHours > 165 && diffHours <= 169 && !hasLogged(event.id, '7d')) {
      sendNotification(
        event, 
        '7d', 
        `⚠️ اقتراب الامتحان: متبقي 7 أيام على اختبار "${event.title}"! نقترح عليك فتح المساعد والبدء في توليد جدول مذاكرة ذكي بالتكرار المتباعد الآن 🚀`, 
        webContents
      )
    }

    // 2. Smart Exam Reminders (3 Days before the exam)
    if (isExam && diffHours > 69 && diffHours <= 73 && !hasLogged(event.id, '3d')) {
      sendNotification(
        event, 
        '3d', 
        `⏰ تذكير دراسي: متبقي 3 أيام فقط على اختبار "${event.title}". تفقد خطتك الدراسية وبطاقات التكرار المتباعد لتثبيت معلوماتك!`, 
        webContents
      )
    }

    // 3. Check for 24h notification (between 23 and 25 hours before, and not logged yet)
    if (notify24h && diffHours > 23 && diffHours <= 25 && !hasLogged(event.id, '24h')) {
      sendNotification(event, '24h', `📅 غداً: ${event.title}`, webContents)
    }

    // 4. Check for 1h notification (between 0.75 and 1.25 hours before, and not logged yet)
    if (notify1h && diffHours > 0.75 && diffHours <= 1.25 && !hasLogged(event.id, '1h')) {
      sendNotification(event, '1h', `⏰ بعد ساعة: ${event.title}`, webContents)
    }
  }
}

function sendNotification(event: any, type: string, message: string, webContents?: any) {
  const uuid = require('uuid').v4()
  const nowStr = new Date().toISOString()

  // Save log in SQLite
  try {
    addNotificationLog(uuid, event.id, nowStr, type)
  } catch (err) {
    console.error('Failed to log notification', err)
  }

  // Fire notifier
  notifier.notify({
    title: 'ScholarOS - تنبيه الأجندة',
    message: message,
    sound: true,
    wait: true
  })

  // Send IPC event to renderer if active
  if (webContents) {
    webContents.send('notification:received', {
      id: uuid,
      event_id: event.id,
      title: event.title,
      type: type,
      sent_at: nowStr,
      message: message
    })
  }
}
