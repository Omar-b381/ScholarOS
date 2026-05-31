import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import fs from 'fs'
import ICAL from 'ical.js'
import Store from 'electron-store'

import {
  initDatabase,
  getAllCourses,
  saveCourse,
  deleteCourse,
  getEventsRange,
  saveEvent,
  deleteEvent,
  getAllAssignments,
  saveAssignment,
  deleteAssignment,
  getAllGoals,
  saveGoal,
  deleteGoal,
  getAllGrades,
  saveGrade,
  deleteGrade,
  getAllWikiPages,
  saveWikiPage,
  deleteWikiPage,
  getAllFlashcards,
  saveFlashcard,
  deleteFlashcard,
  getDueFlashcards,
  getAllResources,
  saveResource,
  deleteResource,
  getAllMindMaps,
  saveMindMap,
  deleteMindMap,
  getChatSessions,
  saveChatSession,
  deleteChatSession,
  getCalculatorHistory,
  addCalculatorHistory,
  clearCalculatorHistory,
  getNotificationLogs,
  clearNotificationLogs,
  exportAllData,
  importAllData,
  clearDatabase,
  getAllLecturers,
  saveLecturer,
  deleteLecturer,
  getDatabaseStats
} from './services/database'

import {
  initNotificationService,
  stopNotificationService
} from './services/notificationService'

import {
  uploadPDF,
  listPDFs,
  openPDF,
  convertImagesToPDF,
  mergePDFs,
  splitPDF,
  exportPDF,
  convertImage,
  parseBookmarks
} from './services/fileService'

import { processAIChat } from './services/aiService'
import { syncEventsToNotion } from './services/notionService'
import {
  startOAuth2Flow,
  disconnectGoogleCalendar,
  getGoogleStatus,
  syncEventsToGoogleCalendar
} from './services/googleCalendarService'

const store = new Store()
let mainWindow: BrowserWindow | null = null
let isQuitting = false

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      webviewTag: true // Required for YouTube in-app player embeds
    }
  })

  mainWindow.on('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show()
    }
  })

  // Final sync on app close
  mainWindow.on('close', async (e) => {
    if (mainWindow && !isQuitting) {
      e.preventDefault()
      console.log('[Auto-Sync] Application is closing. Running final background Google Calendar sync...')
      try {
        const status = await getGoogleStatus()
        if (status && status.connected) {
          await syncEventsToGoogleCalendar()
          console.log('[Auto-Sync] Final sync complete.')
        }
      } catch (err) {
        console.error('[Auto-Sync] Final sync failed:', err)
      } finally {
        isQuitting = true
        mainWindow.close()
      }
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.scholaros.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialize DB and Notification Background Services
  initDatabase()
  initNotificationService(mainWindow?.webContents)

  // Register all IPC main handlers
  registerIpcHandlers()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  stopNotificationService()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC Handler Registrations
function registerIpcHandlers() {
  // DB Courses
  ipcMain.handle('db:courses:getAll', () => getAllCourses())
  ipcMain.handle('db:courses:save', (_, course) => saveCourse(course))
  ipcMain.handle('db:courses:delete', (_, id) => deleteCourse(id))

  // DB Events
  ipcMain.handle('db:events:getRange', (_, { start, end }) => getEventsRange(start, end))
  ipcMain.handle('db:events:save', (_, event) => saveEvent(event))
  ipcMain.handle('db:events:delete', (_, id) => deleteEvent(id))
  ipcMain.handle('db:events:importICS', (_, fileContent) => {
    try {
      const jcalData = ICAL.parse(fileContent)
      const comp = new ICAL.Component(jcalData)
      const vevents = comp.getAllSubcomponents('vevent')
      let count = 0

      for (const vevent of vevents) {
        const event = new ICAL.Event(vevent)
        const id = event.uid || require('uuid').v4()
        const title = event.summary || 'حدث مستورد'
        const description = event.description || ''
        const start_date = event.startDate.toJSDate().toISOString()
        const end_date = event.endDate.toJSDate().toISOString()
        const all_day = event.startDate.isDate ? 1 : 0

        // Guess type
        let type = 'Personal'
        const text = title.toLowerCase()
        if (text.includes('exam') || text.includes('امتحان') || text.includes('اختبار')) {
          type = 'Exam'
        } else if (text.includes('assignment') || text.includes('واجب') || text.includes('تسليم')) {
          type = 'Assignment'
        } else if (text.includes('lecture') || text.includes('محاضرة') || text.includes('درس')) {
          type = 'Lecture'
        }

        const color = type === 'Exam' ? '#ef4444' : type === 'Assignment' ? '#f59e0b' : type === 'Lecture' ? '#3b82f6' : '#10b981'

        saveEvent({
          id,
          title,
          type,
          start_date,
          end_date,
          course_id: '',
          description,
          color,
          all_day
        })
        count++
      }
      return count
    } catch (err) {
      console.error('Failed to parse ICS file', err)
      throw new Error('فشل قراءة ملف التقويم المختار')
    }
  })

  // DB Assignments
  ipcMain.handle('db:assignments:getAll', () => getAllAssignments())
  ipcMain.handle('db:assignments:save', (_, assignment) => saveAssignment(assignment))
  ipcMain.handle('db:assignments:delete', (_, id) => deleteAssignment(id))

  // DB Goals
  ipcMain.handle('db:goals:getAll', () => getAllGoals())
  ipcMain.handle('db:goals:save', (_, goal) => saveGoal(goal))
  ipcMain.handle('db:goals:delete', (_, id) => deleteGoal(id))

  // DB Grades
  ipcMain.handle('db:grades:getAll', () => getAllGrades())
  ipcMain.handle('db:grades:save', (_, grade) => saveGrade(grade))
  ipcMain.handle('db:grades:delete', (_, id) => deleteGrade(id))

  // DB Wiki Pages
  ipcMain.handle('db:wiki:getPages', () => getAllWikiPages())
  ipcMain.handle('db:wiki:savePage', (_, page) => saveWikiPage(page))
  ipcMain.handle('db:wiki:deletePage', (_, id) => deleteWikiPage(id))

  // DB Flashcards
  ipcMain.handle('db:flashcards:getAll', () => getAllFlashcards())
  ipcMain.handle('db:flashcards:save', (_, card) => saveFlashcard(card))
  ipcMain.handle('db:flashcards:delete', (_, id) => deleteFlashcard(id))
  ipcMain.handle('db:flashcards:getDue', (_, now) => getDueFlashcards(now))

  // DB Resources
  ipcMain.handle('db:resources:getAll', () => getAllResources())
  ipcMain.handle('db:resources:save', (_, resource) => saveResource(resource))
  ipcMain.handle('db:resources:delete', (_, id) => deleteResource(id))

  // DB Mind Maps
  ipcMain.handle('db:mindMaps:getAll', () => getAllMindMaps())
  ipcMain.handle('db:mindMaps:save', (_, map) => saveMindMap(map))
  ipcMain.handle('db:mindMaps:delete', (_, id) => deleteMindMap(id))

  // DB Chat
  ipcMain.handle('db:chat:getSessions', () => getChatSessions())
  ipcMain.handle('db:chat:saveSession', (_, session) => saveChatSession(session))
  ipcMain.handle('db:chat:deleteSession', (_, id) => deleteChatSession(id))

  // DB Calculator
  ipcMain.handle('db:calculator:getHistory', () => getCalculatorHistory())
  ipcMain.handle('db:calculator:addHistory', (_, { expression, result }) => addCalculatorHistory(expression, result))
  ipcMain.handle('db:calculator:clearHistory', () => clearCalculatorHistory())

  // DB Notifications
  ipcMain.handle('db:notifications:getLogs', () => getNotificationLogs())
  ipcMain.handle('db:notifications:clearLogs', () => clearNotificationLogs())

  // DB Lecturers & Diagnostics
  ipcMain.handle('db:lecturers:getAll', () => getAllLecturers())
  ipcMain.handle('db:lecturers:save', (_, lecturer) => saveLecturer(lecturer))
  ipcMain.handle('db:lecturers:delete', (_, id) => deleteLecturer(id))
  ipcMain.handle('db:getStats', () => getDatabaseStats())

  // File Operations
  ipcMain.handle('files:uploadPDF', (_, { sourcePath, destName }) => uploadPDF(sourcePath, destName))
  ipcMain.handle('files:listPDFs', () => listPDFs())
  ipcMain.handle('files:openPDF', (_, filePath) => openPDF(filePath))
  ipcMain.handle('files:readPDFBase64', (_, filePath) => {
    if (!fs.existsSync(filePath)) throw new Error('الملف غير موجود')
    return fs.readFileSync(filePath).toString('base64')
  })
  ipcMain.handle('files:convertImagesToPDF', (_, imagesPaths) => convertImagesToPDF(imagesPaths))
  ipcMain.handle('files:mergePDFs', (_, pdfPaths) => mergePDFs(pdfPaths))
  ipcMain.handle('files:splitPDF', (_, { pdfPath, ranges }) => splitPDF(pdfPath, ranges))
  ipcMain.handle('files:exportPDF', (_, { htmlContent, filename }) => exportPDF(htmlContent, filename))
  ipcMain.handle('files:convertImage', (_, { imagePath, format, width, quality }) => convertImage(imagePath, format, width, quality))
  ipcMain.handle('files:parseBookmarks', (_, filePath) => parseBookmarks(filePath))

  // Store & Settings Operations
  ipcMain.handle('settings:get', (_, key) => store.get(key))
  ipcMain.handle('settings:set', (_, { key, value }) => {
    store.set(key, value)
  })
  ipcMain.handle('settings:delete', (_, key) => {
    store.delete(key)
  })
  ipcMain.handle('settings:backup', () => {
    try {
      const data = exportAllData()
      return { success: true, data: JSON.stringify(data) }
    } catch (err) {
      console.error('Failed to backup database', err)
      throw new Error('فشل تصدير النسخة الاحتياطية لقاعدة البيانات')
    }
  })
  ipcMain.handle('settings:restore', (_, jsonData) => {
    try {
      const data = JSON.parse(jsonData)
      importAllData(data)
      return { success: true }
    } catch (err) {
      console.error('Failed to restore database', err)
      throw new Error('فشل استيراد النسخة الاحتياطية. تحقق من سلامة الملف.')
    }
  })
  ipcMain.handle('settings:clearAllData', () => {
    try {
      clearDatabase()
      store.clear()
      return { success: true }
    } catch (err) {
      console.error('Failed to wipe app data', err)
      throw new Error('فشل مسح البيانات المحلية')
    }
  })

  // App Metadata & Utilities
  ipcMain.handle('app:getVersion', () => app.getVersion())
  ipcMain.handle('app:openExternal', (_, url) => {
    shell.openExternal(url)
  })
  ipcMain.handle('app:selectFile', async (_, options) => {
    const result = await dialog.showOpenDialog(mainWindow!, options)
    if (result.canceled) return null
    return result.filePaths
  })

  // AI Assistant Call
  ipcMain.handle('ai:chat', (_, args) => processAIChat(args))

  // Notion Integration
  ipcMain.handle('notion:syncEvents', () => syncEventsToNotion())

  // Google Calendar Integration
  ipcMain.handle('google:login', () => startOAuth2Flow())
  ipcMain.handle('google:logout', () => disconnectGoogleCalendar())
  ipcMain.handle('google:getStatus', () => getGoogleStatus())
  ipcMain.handle('google:sync', () => syncEventsToGoogleCalendar())
}
