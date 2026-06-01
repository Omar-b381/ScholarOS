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
  getDatabaseStats,
  enqueueChange,
  getAllLevels,
  getActiveLevel,
  saveLevel,
  deleteLevel,
  archiveAndTransition,
  db
} from './services/database'

import { formatCitation, fetchByDOI, parseBibFile } from './services/citationService'

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

import {
  startSyncTimer,
  stopSyncTimer,
  getSyncSettings,
  setSyncSettings,
  runSyncCycle,
  testSupabaseConnection,
  encryptPayload,
  notifyUI
} from './services/syncService'

import { dbRowToCard, cardToDbFields } from './services/fsrsHelper'
import { FSRS, generatorParameters } from 'ts-fsrs'

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

  // Start SyncGuard background scheduler
  startSyncTimer()

  // Register all IPC main handlers
  registerIpcHandlers()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  stopNotificationService()
  try {
    stopSyncTimer()
  } catch (e) {}
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
  ipcMain.handle('ai:chat', async (_, args) => {
    let dbContext = '\n\n'
    dbContext += '══════════════════════════════════════════════════\n'
    dbContext += 'سياق الأجندة والتقويم الحالي للطالب من قاعدة البيانات المحلية لمساعدته:\n'
    
    try {
      const courses = db.prepare("SELECT name, code FROM courses").all() as any[]
      if (courses.length > 0) {
        dbContext += '📚 المقررات الدراسية النشطة في جدول الطالب:\n'
        courses.forEach(c => {
          dbContext += `- ${c.name} (${c.code || 'بلا رمز'})\n`
        })
      }
      
      const exams = db.prepare(`
        SELECT title, start_date, description FROM events 
        WHERE (type = 'Exam' OR title LIKE '%امتحان%' OR title LIKE '%اختبار%' OR title LIKE '%كويز%' OR title LIKE '%quiz%')
        AND start_date >= datetime('now')
        ORDER BY start_date ASC LIMIT 10
      `).all() as any[]
      if (exams.length > 0) {
        dbContext += '\n📅 الامتحانات والكويزات القادمة المقررة في تقويمه:\n'
        exams.forEach(e => {
          dbContext += `- امتحان: ${e.title} في تاريخ ${e.start_date.slice(0, 16).replace('T', ' ')} (${e.description || 'بلا وصف'})\n`
        })
      }

      const assignments = db.prepare(`
        SELECT title, due_date FROM assignments 
        WHERE status != 'submitted' AND status != 'graded' AND status != 'completed'
        ORDER BY due_date ASC LIMIT 10
      `).all() as any[]
      if (assignments.length > 0) {
        dbContext += '\n✏️ الواجبات والتسليمات الأكاديمية المعلقة (غير المنجزة):\n'
        assignments.forEach(a => {
          dbContext += `- واجب: ${a.title} - موعد التسليم النهائي: ${a.due_date.slice(0, 16).replace('T', ' ')}\n`
        })
      }
      
      // Propose AI study schedule reminders
      if (exams.length > 0) {
        dbContext += '\n💡 تنويه لمساعد الذكاء الاصطناعي:\n'
        dbContext += 'إذا سألك الطالب عن امتحاناته أو كيفية الاستعداد لها، بادر باقتراح توليد جدول مذاكرة ذكي بالتكرار المتباعد (Spaced Repetition) من خلال شاشة "جدول المذاكرة الذكي" المخصصة لذلك في التطبيق! وساعده في التخطيط الأولي لها هنا.\n'
      }
    } catch (dbErr) {
      console.error('Failed to query DB context for AI chat', dbErr)
    }
    dbContext += '══════════════════════════════════════════════════\n\n'

    // Inject the structured local database context securely at the end of the system prompt
    args.systemPrompt = (args.systemPrompt || '') + dbContext

    return processAIChat(args)
  })

  // Notion Integration
  ipcMain.handle('notion:syncEvents', () => syncEventsToNotion())

  // Google Calendar Integration
  ipcMain.handle('google:login', () => startOAuth2Flow())
  ipcMain.handle('google:logout', () => disconnectGoogleCalendar())
  ipcMain.handle('google:getStatus', () => getGoogleStatus())
  ipcMain.handle('google:sync', () => syncEventsToGoogleCalendar())

  // ── Flashcard FSRS review ──────────────────────────
  ipcMain.handle('db:flashcards:review', (_e, { id, rating }: { id: string; rating: number }) => {
    const row = db.prepare('SELECT * FROM flashcards WHERE id = ?').get(id) as any
    if (!row) throw new Error('Flashcard not found')

    const fsrsInstance = new FSRS(generatorParameters({ enable_fuzz: true }))
    const card = dbRowToCard(row)
    const result = fsrsInstance.next(card, new Date(), rating)
    const scheduled = result[rating]
    const fields = cardToDbFields(scheduled.card)

    db.prepare(`
      UPDATE flashcards SET
        due = @due, stability = @stability, difficulty = @difficulty,
        elapsed_days = @elapsed_days, scheduled_days = @scheduled_days,
        reps = @reps, lapses = @lapses, state = @state, last_review = @last_review
      WHERE id = ?
    `).run({ ...fields }, id)

    return {
      nextReviewIn: scheduled.card.scheduled_days,
      due: fields.due,
    }
  })

  ipcMain.handle('db:flashcards:getDue', () => {
    const now = new Date().toISOString()
    return db.prepare(
      "SELECT * FROM flashcards WHERE due <= ? ORDER BY due ASC"
    ).all(now)
  })

  ipcMain.handle('db:flashcards:getStats', () => {
    const total = (db.prepare('SELECT COUNT(*) as c FROM flashcards').get() as any).c
    const due   = (db.prepare("SELECT COUNT(*) as c FROM flashcards WHERE due <= datetime('now')").get() as any).c
    const new_  = (db.prepare('SELECT COUNT(*) as c FROM flashcards WHERE state = 0').get() as any).c
    const review = (db.prepare('SELECT COUNT(*) as c FROM flashcards WHERE state = 2').get() as any).c
    return { total, due, new: new_, review }
  })

  // ── Kanban Board Reordering ─────────────────────────
  ipcMain.handle('db:assignments:reorder', (_e, items: { id: string; column: string; order: number }[]) => {
    const stmt = db.prepare('UPDATE assignments SET kanban_column = ?, kanban_order = ? WHERE id = ?')
    const updateMany = db.transaction((rows: typeof items) => {
      for (const row of rows) stmt.run(row.column, row.order, row.id)
    })
    updateMany(items)
    return { ok: true }
  })

  // ── Academic Citations ──────────────────────────────
  ipcMain.handle('citation:format', (_e, input, format) => {
    return formatCitation(input, format)
  })

  ipcMain.handle('citation:fetchDOI', async (_e, doi: string) => {
    return await fetchByDOI(doi)
  })

  ipcMain.handle('citation:parseBib', (_e, content: string) => {
    return parseBibFile(content)
  })

  ipcMain.handle('citation:importBibFile', async () => {
    const { dialog } = require('electron')
    const result = await dialog.showOpenDialog({
      title:       'استيراد ملف BibTeX',
      filters:     [{ name: 'BibTeX', extensions: ['bib'] }],
      properties:  ['openFile'],
    })
    if (result.canceled || !result.filePaths[0]) return []
    const content = require('fs').readFileSync(result.filePaths[0], 'utf-8')
    return parseBibFile(content)
  })

  // ═══════════════════════════════════════════════════
  // ATTENDANCE
  // ═══════════════════════════════════════════════════
  ipcMain.handle('attendance:getAll', (_e, courseId?: string) => {
    if (courseId) {
      return db.prepare('SELECT * FROM attendance WHERE course_id = ? AND is_deleted = 0 ORDER BY date DESC').all(courseId)
    }
    return db.prepare('SELECT * FROM attendance WHERE is_deleted = 0 ORDER BY date DESC').all()
  })

  ipcMain.handle('attendance:save', (_e, record: any) => {
    const { v4: uuidv4 } = require('uuid')
    const id = record.id || uuidv4()
    db.prepare(`
      INSERT INTO attendance (id, course_id, date, status, notes, is_deleted)
      VALUES (@id, @course_id, @date, @status, @notes, 0)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        notes  = excluded.notes,
        is_deleted = 0
    `).run({ notes: '', ...record, id })
    enqueueChange('attendance', id, record)
    return db.prepare('SELECT * FROM attendance WHERE id = ?').get(id)
  })

  ipcMain.handle('attendance:getStats', (_e, courseId: string) => {
    const rows = db.prepare(
      'SELECT status, COUNT(*) as count FROM attendance WHERE course_id = ? GROUP BY status'
    ).all(courseId) as any[]
    const total   = rows.reduce((s, r) => s + r.count, 0)
    const present = rows.find(r => r.status === 'present')?.count ?? 0
    const absent  = rows.find(r => r.status === 'absent')?.count ?? 0
    const excused = rows.find(r => r.status === 'excused')?.count ?? 0
    const pct     = total > 0 ? Math.round((present / total) * 100) : 100
    return { total, present, absent, excused, percentage: pct, warning: pct < 75 }
  })

  // ═══════════════════════════════════════════════════
  // HABITS
  // ═══════════════════════════════════════════════════
  ipcMain.handle('habits:getAll', () =>
    db.prepare('SELECT * FROM habits ORDER BY created_at ASC').all()
  )

  ipcMain.handle('habits:save', (_e, habit: any) => {
    const { v4: uuidv4 } = require('uuid')
    const id = habit.id || uuidv4()
    db.prepare(`
      INSERT INTO habits (id, title, icon, color, target_days)
      VALUES (@id, @title, @icon, @color, @target_days)
      ON CONFLICT(id) DO UPDATE SET
        title       = excluded.title,
        icon        = excluded.icon,
        color       = excluded.color,
        target_days = excluded.target_days
    `).run({ icon: '📚', color: '#6d28d9', target_days: 7, ...habit, id })
    return db.prepare('SELECT * FROM habits WHERE id = ?').get(id)
  })

  ipcMain.handle('habits:delete', (_e, id: string) => {
    db.prepare('DELETE FROM habit_logs WHERE habit_id = ?').run(id)
    db.prepare('DELETE FROM habits WHERE id = ?').run(id)
    return { ok: true }
  })

  ipcMain.handle('habits:log', (_e, { habitId, date, completed }: any) => {
    const { v4: uuidv4 } = require('uuid')
    db.prepare(`
      INSERT INTO habit_logs (id, habit_id, date, completed)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(habit_id, date) DO UPDATE SET completed = excluded.completed
    `).run(uuidv4(), habitId, date, completed ? 1 : 0)
    return { ok: true }
  })

  ipcMain.handle('habits:getHeatmap', (_e, { habitId, days }: any) => {
    const rows = db.prepare(`
      SELECT date, completed FROM habit_logs
      WHERE habit_id = ?
      ORDER BY date ASC
      LIMIT ?
    `).all(habitId, days) as any[]
    return rows
  })

  // ═══════════════════════════════════════════════════
  // RESEARCH (Semantic Scholar + CrossRef + Open Library)
  // ═══════════════════════════════════════════════════
  ipcMain.handle('research:searchPapers', async (_e, query: string) => {
    // Check cache first (1 hour TTL)
    const cacheKey = `papers_${query}`
    const cached = db.prepare(
      "SELECT results, fetched_at FROM research_cache WHERE id = ?"
    ).get(cacheKey) as any
    if (cached) {
      const age = Date.now() - new Date(cached.fetched_at).getTime()
      if (age < 3600000) return { papers: JSON.parse(cached.results), error: null } // return wrapped if < 1hr old
    }

    try {
      const url = `https://api.semanticscholar.org/graph/v1/paper/search?` +
        `query=${encodeURIComponent(query)}&limit=10&` +
        `fields=paperId,title,authors,year,abstract,citationCount,openAccessPdf,externalIds`

      const res  = await fetch(url, {
        headers: { 'User-Agent': 'ScholarOS/1.0 (scholaros@app.com)' }
      })

      if (res.status === 429) {
        return { error: 'تجاوزت الحد المسموح — انتظر دقيقة ثم حاول مجدداً', papers: [] }
      }

      const json = await res.json() as any
      const papers = (json.data ?? []).map((p: any) => ({
        id:           p.paperId,
        title:        p.title,
        authors:      p.authors?.map((a: any) => a.name).join('، ') ?? '',
        year:         p.year,
        abstract:     p.abstract ?? '',
        citations:    p.citationCount ?? 0,
        pdfUrl:       p.openAccessPdf?.url ?? null,
        doi:          p.externalIds?.DOI ?? null,
      }))

      // Cache result
      db.prepare(`
        INSERT INTO research_cache (id, query, source, results)
        VALUES (?, ?, 'semantic_scholar', ?)
        ON CONFLICT(id) DO UPDATE SET results = excluded.results, fetched_at = CURRENT_TIMESTAMP
      `).run(cacheKey, query, JSON.stringify(papers))

      return { papers, error: null }
    } catch (e: any) {
      return { papers: [], error: 'تعذّر الاتصال بقاعدة البيانات الأكاديمية' }
    }
  })

  ipcMain.handle('research:fetchByDOI', async (_e, doi: string) => {
    try {
      const res  = await fetch(
        `https://api.crossref.org/works/${encodeURIComponent(doi)}?mailto=scholaros@app.com`,
        { headers: { 'User-Agent': 'ScholarOS/1.0' } }
      )
      if (!res.ok) return { error: 'لم يُعثر على هذا الـ DOI', data: null }
      const json = await res.json() as any
      const w    = json.message
      return {
        error: null,
        data: {
          title:   w.title?.[0] ?? '',
          authors: w.author?.map((a: any) => `${a.given ?? ''} ${a.family ?? ''}`).join('، ') ?? '',
          year:    w.published?.['date-parts']?.[0]?.[0] ?? '',
          journal: w['container-title']?.[0] ?? '',
          doi:     w.DOI ?? '',
          url:     w.URL ?? '',
          abstract: w.abstract ?? '',
        }
      }
    } catch {
      return { error: 'حدث خطأ في الاتصال', data: null }
    }
  })

  ipcMain.handle('research:searchBooks', async (_e, query: string) => {
    const cacheKey = `books_${query}`
    const cached = db.prepare(
      "SELECT results, fetched_at FROM research_cache WHERE id = ?"
    ).get(cacheKey) as any
    if (cached) {
      const age = Date.now() - new Date(cached.fetched_at).getTime()
      if (age < 86400000) return { books: JSON.parse(cached.results), error: null } // 24hr cache for books
    }

    try {
      const res  = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10&fields=key,title,author_name,first_publish_year,isbn,cover_i`,
        { headers: { 'User-Agent': 'ScholarOS/1.0 (scholaros@app.com)' } }
      )
      const json = await res.json() as any
      const books = (json.docs ?? []).map((b: any) => ({
        olKey:    b.key,
        title:    b.title ?? '',
        author:   b.author_name?.[0] ?? '',
        year:     b.first_publish_year ?? '',
        isbn:     b.isbn?.[0] ?? '',
        coverUrl: b.cover_i
          ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg`
          : null,
      }))

      db.prepare(`
        INSERT INTO research_cache (id, query, source, results)
        VALUES (?, ?, 'open_library', ?)
        ON CONFLICT(id) DO UPDATE SET results = excluded.results, fetched_at = CURRENT_TIMESTAMP
      `).run(cacheKey, query, JSON.stringify(books))

      return { books, error: null }
    } catch {
      return { books: [], error: 'تعذّر الاتصال بمكتبة الكتب' }
    }
  })

  ipcMain.handle('research:saveBook', (_e, book: any) => {
    const { v4: uuidv4 } = require('uuid')
    const id = uuidv4()
    db.prepare(`
      INSERT INTO book_references (id, isbn, title, author, year, cover_url, ol_key, course_id, notes)
      VALUES (@id, @isbn, @title, @author, @year, @cover_url, @ol_key, @course_id, @notes)
    `).run({
      isbn: null,
      author: null,
      year: null,
      cover_url: null,
      ol_key: null,
      course_id: null,
      notes: null,
      ...book,
      id
    })
    return { ok: true, id }
  })

  ipcMain.handle('research:getSavedBooks', () =>
    db.prepare('SELECT * FROM book_references ORDER BY created_at DESC').all()
  )

  // ═══════════════════════════════════════════════════
  // FORMULA SHEET
  // ═══════════════════════════════════════════════════
  ipcMain.handle('formulas:getAll', () =>
    db.prepare('SELECT * FROM formula_sheets ORDER BY updated_at DESC').all()
  )

  ipcMain.handle('formulas:save', (_e, sheet: any) => {
    const { v4: uuidv4 } = require('uuid')
    const id = sheet.id || uuidv4()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO formula_sheets (id, course_id, title, formulas, created_at, updated_at)
      VALUES (@id, @course_id, @title, @formulas, @now, @now)
      ON CONFLICT(id) DO UPDATE SET
        title     = excluded.title,
        formulas  = excluded.formulas,
        course_id = excluded.course_id,
        updated_at = excluded.updated_at
    `).run({
      course_id: null,
      ...sheet,
      id,
      formulas: typeof sheet.formulas === 'string' ? sheet.formulas : JSON.stringify(sheet.formulas),
      now,
    })
    return db.prepare('SELECT * FROM formula_sheets WHERE id = ?').get(id)
  })

  ipcMain.handle('formulas:delete', (_e, id: string) => {
    db.prepare('DELETE FROM formula_sheets WHERE id = ?').run(id)
    return { ok: true }
  })

  ipcMain.handle('formulas:exportPDF', async (_e, id: string) => {
    const sheet = db.prepare('SELECT * FROM formula_sheets WHERE id = ?').get(id) as any
    if (!sheet) throw new Error('Formula sheet not found')
    const win = BrowserWindow.getAllWindows()[0]
    const pdfBuffer = await win.webContents.printToPDF({ printBackground: true })
    const path = require('path')
    const app  = require('electron').app
    const dest = path.join(app.getPath('userData'), 'documents', `formulas_${id}.pdf`)
    require('fs').writeFileSync(dest, pdfBuffer)
    return dest
  })

  // ═══════════════════════════════════════════════════
  // FOCUS MODE
  // ═══════════════════════════════════════════════════
  ipcMain.handle('focus:start', (_e, { duration, breakMin }: any) => {
    const { v4: uuidv4 } = require('uuid')
    const id = uuidv4()
    db.prepare(`
      INSERT INTO focus_sessions (id, duration_minutes, break_minutes, started_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(id, duration, breakMin)
    return { id }
  })

  ipcMain.handle('focus:complete', (_e, id: string) => {
    db.prepare(`
      UPDATE focus_sessions SET completed = 1, ended_at = datetime('now') WHERE id = ?
    `).run(id)
    return { ok: true }
  })

  ipcMain.handle('focus:getHistory', () =>
    db.prepare('SELECT * FROM focus_sessions ORDER BY started_at DESC LIMIT 30').all()
  )

  ipcMain.handle('focus:getStats', () => {
    const total     = (db.prepare('SELECT COUNT(*) as c FROM focus_sessions WHERE completed = 1').get() as any).c
    const minutes   = (db.prepare('SELECT SUM(duration_minutes) as s FROM focus_sessions WHERE completed = 1').get() as any).s ?? 0
    const todayMin  = (db.prepare(`
      SELECT SUM(duration_minutes) as s FROM focus_sessions
      WHERE completed = 1 AND date(started_at) = date('now')
    `).get() as any).s ?? 0
    return { totalSessions: total, totalMinutes: minutes, todayMinutes: todayMin }
  })

  // ═══════════════════════════════════════════════════
  // GRADE PREDICTOR
  // ═══════════════════════════════════════════════════
  ipcMain.handle('grades:getInputs', (_e, courseId: string) =>
    db.prepare('SELECT * FROM grade_inputs WHERE course_id = ? ORDER BY created_at ASC').all(courseId)
  )

  ipcMain.handle('grades:saveInput', (_e, input: any) => {
    const { v4: uuidv4 } = require('uuid')
    const id = input.id || uuidv4()
    db.prepare(`
      INSERT INTO grade_inputs (id, course_id, component, weight, score, max_score)
      VALUES (@id, @course_id, @component, @weight, @score, @max_score)
      ON CONFLICT(id) DO UPDATE SET
        component = excluded.component,
        weight    = excluded.weight,
        score     = excluded.score,
        max_score = excluded.max_score
    `).run({ score: null, max_score: 100, ...input, id })
    return { ok: true, id }
  })

  ipcMain.handle('grades:deleteInput', (_e, id: string) => {
    db.prepare('DELETE FROM grade_inputs WHERE id = ?').run(id)
    return { ok: true }
  })

  // ═══════════════════════════════════════════════════
  // STUDY SCHEDULE GENERATOR
  // ═══════════════════════════════════════════════════
  ipcMain.handle('schedule:generate', async (_e, payload: any) => {
    const store = new (require('electron-store'))()
    const provider: string = store.get('ai_provider', 'groq') as string
    const apiKey: string   = store.get(`api_key_${provider}`, '') as string

    if (!apiKey && provider !== 'ollama') {
      return { error: 'أدخل مفتاح API في الإعدادات أولاً', schedule: null }
    }

    const prompt = `
أنت مساعد أكاديمي. أنشئ جدول مذاكرة مُثلى بناءً على المعلومات التالية:
الامتحانات: ${JSON.stringify(payload.exams)}
المواد: ${JSON.stringify(payload.courses)}
ساعات الدراسة اليومية المتاحة: ${payload.hoursPerDay}
تاريخ البدء: ${payload.startDate}

أنشئ جدول مذاكرة يومي بمبدأ التكرار المتباعد (Spaced Repetition).
أجب بـ JSON فقط بهذا الشكل:
{
  "title": "جدول مذاكرة [اسم الفصل]",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "sessions": [
        { "course": "اسم المادة", "topic": "الموضوع", "duration": 60, "type": "مراجعة|دراسة جديدة|تدريب" }
      ]
    }
  ]
}
`

    try {
      // Use Groq as primary (fastest free option)
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model:    'llama-3.1-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000,
          response_format: { type: 'json_object' },
        }),
      })

      const json    = await res.json() as any
      const content = json.choices?.[0]?.message?.content ?? '{}'
      const parsed  = JSON.parse(content)

      const { v4: uuidv4 } = require('uuid')
      const id = uuidv4()
      db.prepare(`
        INSERT INTO study_schedule (id, title, generated_for, schedule_data)
        VALUES (?, ?, ?, ?)
      `).run(id, parsed.title ?? 'جدول مذاكرة', payload.startDate, JSON.stringify(parsed.days ?? []))

      return { schedule: { id, ...parsed }, error: null }
    } catch (e: any) {
      return { schedule: null, error: 'فشل توليد الجدول — تحقق من مفتاح API' }
    }
  })

  ipcMain.handle('schedule:getAll', () =>
    db.prepare('SELECT * FROM study_schedule ORDER BY created_at DESC').all()
  )

  ipcMain.handle('schedule:delete', (_e, id: string) => {
    db.prepare('DELETE FROM study_schedule WHERE id = ?').run(id)
    return { ok: true }
  })

  // ── Academic Levels & Transitions ───────────────────
  ipcMain.handle('db:levels:getAll', () => getAllLevels())
  ipcMain.handle('db:levels:getActive', () => getActiveLevel())
  ipcMain.handle('db:levels:save', (_, level) => saveLevel(level))
  ipcMain.handle('db:levels:delete', (_, id) => deleteLevel(id))
  ipcMain.handle('db:levels:transition', (_, name) => archiveAndTransition(name))

  // ═══════════════════════════════════════════════════
  // SYNCGUARD HANDLERS
  // ═══════════════════════════════════════════════════
  ipcMain.handle('sync:getStatus', () => {
    const settings = getSyncSettings()
    
    // Get size of pending queue
    const queueSize = db.prepare("SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending'").get() as { count: number }
    return {
      ...settings,
      pendingCount: queueSize ? queueSize.count : 0
    }
  })

  ipcMain.handle('sync:getLogs', () => {
    return db.prepare("SELECT * FROM sync_logs ORDER BY timestamp DESC LIMIT 20").all()
  })

  ipcMain.handle('sync:getGradeConflicts', () => {
    return db.prepare("SELECT * FROM grade_conflict_log ORDER BY resolved_at DESC").all()
  })

  ipcMain.handle('sync:trigger', async () => {
    return await runSyncCycle()
  })

  ipcMain.handle('sync:setSettings', (_, settings) => {
    setSyncSettings(settings)
    return { success: true }
  })

  ipcMain.handle('sync:simulateAction', async (_, { action, data }) => {
    const Store = require('electron-store')
    const store = new Store()
    const crypto = require('crypto')
    const fs = require('fs')
    const path = require('path')

    const settings = getSyncSettings()
    const userData = app.getPath('userData')
    const relayPath = path.join(userData, 'sync_relay_mock.json')

    // Read existing relay
    let relay: any[] = []
    if (fs.existsSync(relayPath)) {
      try { relay = JSON.parse(fs.readFileSync(relayPath, 'utf8')) } catch (e) {}
    }

    if (action === 'toggle_offline') {
      const current = store.get('settings.sync.offlineSimulated', false)
      store.set('settings.sync.offlineSimulated', !current)
      notifyUI(!current ? 'sync:offline' : 'sync:success', !current ? 'Simulated Offline Mode Enabled' : 'Back Online')
      return { offline: !current }
    }

    if (action === 'mobile_edit') {
      // Simulate student adding/editing an assignment on their phone
      const phoneAssignmentId = data?.id || crypto.randomUUID()
      const payload = {
        id: phoneAssignmentId,
        title: data?.title || 'مراجعة مشروع التخرج للهاتف',
        course_id: data?.course_id || 'course-sample',
        due_date: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        status: 'pending',
        grade: '',
        notes: 'مضافة من الهاتف للمحاكاة',
        is_deleted: 0,
        updated_at: new Date().toISOString()
      }

      const cipher = encryptPayload(payload, settings.encryptionKey)
      const checksum = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')

      const record = {
        id: phoneAssignmentId,
        table_name: 'assignments',
        payload: cipher,
        updated_at: payload.updated_at,
        device_id: 'student-phone',
        schema_version: 1,
        checksum: checksum
      }

      const existingIdx = relay.findIndex(r => r.id === record.id && r.table_name === 'assignments')
      if (existingIdx !== -1) {
        relay[existingIdx] = record
      } else {
        relay.push(record)
      }

      fs.writeFileSync(relayPath, JSON.stringify(relay, null, 2))
      
      // Notify client
      notifyUI('sync:success', 'Simulated Mobile Edit pushed to cloud relay!')
      notifyUI('sync:updated')
      return { success: true }
    }

    if (action === 'grade_conflict') {
      // Simulate student editing a grade on their phone
      // Let's find an existing grade in the database to conflict with
      const existingGrade = db.prepare("SELECT * FROM grades ORDER BY created_at DESC LIMIT 1").get() as any
      const gradeId = existingGrade ? existingGrade.id : crypto.randomUUID()
      const courseId = existingGrade ? existingGrade.course_id : 'course-sample'
      const semester = existingGrade ? existingGrade.semester : 'الفصل الأول 2026'

      // First, modify it locally to cause an unsynced conflict!
      db.prepare(`
        UPDATE grades SET grade_value = 85.0, updated_at = ? WHERE id = ?
      `).run(new Date(Date.now() - 5000).toISOString(), gradeId) // modified locally 5s ago

      // Enqueue the local modification as pending in sync_queue
      db.prepare(`
        INSERT INTO sync_queue (id, table_name, record_id, payload, updated_at, device_id, schema_version, status)
        VALUES (?, 'grades', ?, ?, ?, ?, 1, 'pending')
      `).run(
        crypto.randomUUID(),
        gradeId,
        JSON.stringify({ id: gradeId, course_id: courseId, semester: semester, grade_value: 85.0, is_deleted: 0, updated_at: new Date(Date.now() - 5000).toISOString() }),
        new Date(Date.now() - 5000).toISOString(),
        settings.deviceId
      )

      // We modify the grade value on the phone (newer timestamp)
      const payload = {
        id: gradeId,
        course_id: courseId,
        semester: semester,
        grade_value: 99.5, // High grade from phone!
        credit_hours: existingGrade ? existingGrade.credit_hours : 3,
        is_deleted: 0,
        updated_at: new Date().toISOString()
      }

      // Encrypt remote phone record
      const cipher = encryptPayload(payload, settings.encryptionKey)
      const checksum = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')

      const record = {
        id: gradeId,
        table_name: 'grades',
        payload: cipher,
        updated_at: payload.updated_at,
        device_id: 'student-phone',
        schema_version: 1,
        checksum: checksum
      }

      const existingIdx = relay.findIndex(r => r.id === record.id && r.table_name === 'grades')
      if (existingIdx !== -1) {
        relay[existingIdx] = record
      } else {
        relay.push(record)
      }

      fs.writeFileSync(relayPath, JSON.stringify(relay, null, 2))
      
      // Notify client
      notifyUI('sync:success', 'Simulated Mobile Grade change pushed to cloud relay!')
      notifyUI('sync:updated')
      return { success: true }
    }

    return { error: 'Unknown simulation action' }
  })

  ipcMain.handle('sync:testConnection', async (_, { url, anonKey }) => {
    return await testSupabaseConnection(url, anonKey)
  })
}
