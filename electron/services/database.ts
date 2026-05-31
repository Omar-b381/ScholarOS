import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import { seedDatabase } from './databaseSeeder'

let db: Database.Database

export function initDatabase() {
  const dbDir = app.getPath('userData')
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }
  const dbPath = path.join(dbDir, 'scholar-os.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY, name TEXT, code TEXT,
      teacher_name TEXT, teacher_email TEXT, color TEXT,
      schedule TEXT, syllabus TEXT, notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY, title TEXT, type TEXT,
      start_date TEXT, end_date TEXT, course_id TEXT,
      description TEXT, color TEXT, all_day INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY, title TEXT, course_id TEXT,
      due_date TEXT, status TEXT DEFAULT 'pending',
      grade TEXT, notes TEXT, pdf_path TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY, title TEXT, target_gpa REAL,
      current_gpa REAL, deadline TEXT, milestones TEXT,
      status TEXT DEFAULT 'active', created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS grades (
      id TEXT PRIMARY KEY, course_id TEXT, semester TEXT,
      grade_value REAL, credit_hours INTEGER, created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS wiki_pages (
      id TEXT PRIMARY KEY, title TEXT, course_id TEXT,
      content TEXT, parent_id TEXT, created_at TEXT, updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS flashcards (
      id TEXT PRIMARY KEY, question TEXT, answer TEXT,
      source_page_id TEXT, ease_factor REAL DEFAULT 2.5,
      interval INTEGER DEFAULT 1, repetitions INTEGER DEFAULT 0,
      next_review TEXT, created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY, title TEXT, url TEXT,
      category TEXT, tags TEXT, course_id TEXT,
      notes TEXT, rating INTEGER, is_favorite INTEGER DEFAULT 0,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS mind_maps (
      id TEXT PRIMARY KEY, title TEXT, markdown_content TEXT,
      svg_content TEXT, course_id TEXT, created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY, title TEXT, provider TEXT,
      model TEXT, messages TEXT, created_at TEXT, updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS calculator_history (
      id TEXT PRIMARY KEY, expression TEXT, result TEXT, created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS notifications_log (
      id TEXT PRIMARY KEY, event_id TEXT, sent_at TEXT, type TEXT
    );

    CREATE TABLE IF NOT EXISTS lecturers (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      office TEXT,
      department TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // Automatic seeding is disabled to allow empty fresh startup
}

// DB Helpers

// Courses
export function getAllCourses() {
  return db.prepare('SELECT * FROM courses ORDER BY name ASC').all()
}

export function saveCourse(course: any) {
  const { id, name, code, teacher_name, teacher_email, color, schedule, syllabus, notes } = course
  const stmt = db.prepare(`
    INSERT INTO courses (id, name, code, teacher_name, teacher_email, color, schedule, syllabus, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      code = excluded.code,
      teacher_name = excluded.teacher_name,
      teacher_email = excluded.teacher_email,
      color = excluded.color,
      schedule = excluded.schedule,
      syllabus = excluded.syllabus,
      notes = excluded.notes
  `)
  stmt.run(id, name, code, teacher_name, teacher_email, color, schedule, syllabus, notes)
}

export function deleteCourse(id: string) {
  db.prepare('DELETE FROM courses WHERE id = ?').run(id)
}

// Events
export function getEventsRange(start: string, end: string) {
  return db.prepare('SELECT * FROM events WHERE start_date >= ? AND start_date <= ?').all(start, end)
}

export function saveEvent(event: any) {
  const { id, title, type, start_date, end_date, course_id, description, color, all_day } = event
  const stmt = db.prepare(`
    INSERT INTO events (id, title, type, start_date, end_date, course_id, description, color, all_day)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      type = excluded.type,
      start_date = excluded.start_date,
      end_date = excluded.end_date,
      course_id = excluded.course_id,
      description = excluded.description,
      color = excluded.color,
      all_day = excluded.all_day
  `)
  stmt.run(id, title, type, start_date, end_date, course_id, description, color, all_day ? 1 : 0)
}

export function deleteEvent(id: string) {
  db.prepare('DELETE FROM events WHERE id = ?').run(id)
}

// Assignments
export function getAllAssignments() {
  return db.prepare('SELECT * FROM assignments ORDER BY due_date ASC').all()
}

export function saveAssignment(assignment: any) {
  const { id, title, course_id, due_date, status, grade, notes, pdf_path } = assignment
  const stmt = db.prepare(`
    INSERT INTO assignments (id, title, course_id, due_date, status, grade, notes, pdf_path)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      course_id = excluded.course_id,
      due_date = excluded.due_date,
      status = excluded.status,
      grade = excluded.grade,
      notes = excluded.notes,
      pdf_path = excluded.pdf_path
  `)
  stmt.run(id, title, course_id, due_date, status, grade, notes, pdf_path)
}

export function deleteAssignment(id: string) {
  db.prepare('DELETE FROM assignments WHERE id = ?').run(id)
}

// Goals
export function getAllGoals() {
  return db.prepare('SELECT * FROM goals ORDER BY deadline ASC').all()
}

export function saveGoal(goal: any) {
  const { id, title, target_gpa, current_gpa, deadline, milestones, status, created_at } = goal
  const created = created_at || new Date().toISOString()
  const stmt = db.prepare(`
    INSERT INTO goals (id, title, target_gpa, current_gpa, deadline, milestones, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      target_gpa = excluded.target_gpa,
      current_gpa = excluded.current_gpa,
      deadline = excluded.deadline,
      milestones = excluded.milestones,
      status = excluded.status
  `)
  stmt.run(id, title, target_gpa, current_gpa, deadline, milestones, status, created)
}

export function deleteGoal(id: string) {
  db.prepare('DELETE FROM goals WHERE id = ?').run(id)
}

// Grades
export function getAllGrades() {
  return db.prepare('SELECT * FROM grades ORDER BY semester ASC').all()
}

export function saveGrade(grade: any) {
  const { id, course_id, semester, grade_value, credit_hours, created_at } = grade
  const created = created_at || new Date().toISOString()
  const stmt = db.prepare(`
    INSERT INTO grades (id, course_id, semester, grade_value, credit_hours, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      course_id = excluded.course_id,
      semester = excluded.semester,
      grade_value = excluded.grade_value,
      credit_hours = excluded.credit_hours
  `)
  stmt.run(id, course_id, semester, grade_value, credit_hours, created)
}

export function deleteGrade(id: string) {
  db.prepare('DELETE FROM grades WHERE id = ?').run(id)
}

// Wiki Pages
export function getAllWikiPages() {
  return db.prepare('SELECT * FROM wiki_pages ORDER BY title ASC').all()
}

export function saveWikiPage(page: any) {
  const { id, title, course_id, content, parent_id, created_at, updated_at } = page
  const created = created_at || new Date().toISOString()
  const updated = updated_at || new Date().toISOString()
  const stmt = db.prepare(`
    INSERT INTO wiki_pages (id, title, course_id, content, parent_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      course_id = excluded.course_id,
      content = excluded.content,
      parent_id = excluded.parent_id,
      updated_at = excluded.updated_at
  `)
  stmt.run(id, title, course_id, content, parent_id, created, updated)
}

export function deleteWikiPage(id: string) {
  db.prepare('DELETE FROM wiki_pages WHERE id = ?').run(id)
}

// Flashcards
export function getAllFlashcards() {
  return db.prepare('SELECT * FROM flashcards').all()
}

export function saveFlashcard(card: any) {
  const { id, question, answer, source_page_id, ease_factor, interval, repetitions, next_review, created_at } = card
  const created = created_at || new Date().toISOString()
  const nextReview = next_review || new Date().toISOString()
  const stmt = db.prepare(`
    INSERT INTO flashcards (id, question, answer, source_page_id, ease_factor, interval, repetitions, next_review, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      question = excluded.question,
      answer = excluded.answer,
      source_page_id = excluded.source_page_id,
      ease_factor = excluded.ease_factor,
      interval = excluded.interval,
      repetitions = excluded.repetitions,
      next_review = excluded.next_review
  `)
  stmt.run(id, question, answer, source_page_id, ease_factor ?? 2.5, interval ?? 1, repetitions ?? 0, nextReview, created)
}

export function deleteFlashcard(id: string) {
  db.prepare('DELETE FROM flashcards WHERE id = ?').run(id)
}

export function getDueFlashcards(now: string) {
  return db.prepare('SELECT * FROM flashcards WHERE next_review <= ? ORDER BY next_review ASC').all(now)
}

// Resources
export function getAllResources() {
  return db.prepare('SELECT * FROM resources ORDER BY created_at DESC').all()
}

export function saveResource(res: any) {
  const { id, title, url, category, tags, course_id, notes, rating, is_favorite, created_at } = res
  const created = created_at || new Date().toISOString()
  const stmt = db.prepare(`
    INSERT INTO resources (id, title, url, category, tags, course_id, notes, rating, is_favorite, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      url = excluded.url,
      category = excluded.category,
      tags = excluded.tags,
      course_id = excluded.course_id,
      notes = excluded.notes,
      rating = excluded.rating,
      is_favorite = excluded.is_favorite
  `)
  stmt.run(id, title, url, category, tags, course_id, notes, rating, is_favorite ? 1 : 0, created)
}

export function deleteResource(id: string) {
  db.prepare('DELETE FROM resources WHERE id = ?').run(id)
}

// Mind Maps
export function getAllMindMaps() {
  return db.prepare('SELECT * FROM mind_maps ORDER BY created_at DESC').all()
}

export function saveMindMap(map: any) {
  const { id, title, markdown_content, svg_content, course_id, created_at } = map
  const created = created_at || new Date().toISOString()
  const stmt = db.prepare(`
    INSERT INTO mind_maps (id, title, markdown_content, svg_content, course_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      markdown_content = excluded.markdown_content,
      svg_content = excluded.svg_content,
      course_id = excluded.course_id
  `)
  stmt.run(id, title, markdown_content, svg_content, course_id, created)
}

export function deleteMindMap(id: string) {
  db.prepare('DELETE FROM mind_maps WHERE id = ?').run(id)
}

// Chat Sessions
export function getChatSessions() {
  return db.prepare('SELECT * FROM chat_sessions ORDER BY updated_at DESC').all()
}

export function saveChatSession(session: any) {
  const { id, title, provider, model, messages, created_at, updated_at } = session
  const created = created_at || new Date().toISOString()
  const updated = updated_at || new Date().toISOString()
  const stmt = db.prepare(`
    INSERT INTO chat_sessions (id, title, provider, model, messages, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      provider = excluded.provider,
      model = excluded.model,
      messages = excluded.messages,
      updated_at = excluded.updated_at
  `)
  stmt.run(id, title, provider, model, messages, created, updated)
}

export function deleteChatSession(id: string) {
  db.prepare('DELETE FROM chat_sessions WHERE id = ?').run(id)
}

// Calculator History
export function getCalculatorHistory() {
  return db.prepare('SELECT * FROM calculator_history ORDER BY created_at DESC LIMIT 20').all()
}

export function addCalculatorHistory(expression: string, result: string) {
  const id = require('uuid').v4()
  const created = new Date().toISOString()
  db.prepare('INSERT INTO calculator_history (id, expression, result, created_at) VALUES (?, ?, ?, ?)').run(id, expression, result, created)
}

export function clearCalculatorHistory() {
  db.prepare('DELETE FROM calculator_history').run()
}

// Notifications Log
export function getNotificationLogs() {
  return db.prepare('SELECT * FROM notifications_log ORDER BY sent_at DESC').all()
}

export function addNotificationLog(id: string, eventId: string, sentAt: string, type: string) {
  db.prepare('INSERT INTO notifications_log (id, event_id, sent_at, type) VALUES (?, ?, ?, ?)').run(id, eventId, sentAt, type)
}

export function clearNotificationLogs() {
  db.prepare('DELETE FROM notifications_log').run()
}

// Backup & Restore helpers
export function exportAllData() {
  const tables = [
    'courses', 'events', 'assignments', 'goals', 'grades',
    'wiki_pages', 'flashcards', 'resources', 'mind_maps',
    'chat_sessions', 'calculator_history', 'notifications_log', 'lecturers'
  ]
  const data: Record<string, any[]> = {}
  for (const table of tables) {
    data[table] = db.prepare(`SELECT * FROM ${table}`).all()
  }
  return data
}

export function importAllData(data: Record<string, any[]>) {
  const transaction = db.transaction((payload: Record<string, any[]>) => {
    // Clear existing
    const tables = [
      'courses', 'events', 'assignments', 'goals', 'grades',
      'wiki_pages', 'flashcards', 'resources', 'mind_maps',
      'chat_sessions', 'calculator_history', 'notifications_log', 'lecturers'
    ]
    for (const table of tables) {
      db.prepare(`DELETE FROM ${table}`).run()
    }

    // Insert payload
    for (const [table, rows] of Object.entries(payload)) {
      if (!rows || rows.length === 0) continue
      const keys = Object.keys(rows[0])
      const placeholders = keys.map(() => '?').join(', ')
      const insertStmt = db.prepare(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`)
      for (const row of rows) {
        const values = keys.map(k => row[k])
        insertStmt.run(...values)
      }
    }
  })
  transaction(data)
}

export function clearDatabase() {
  const tables = [
    'courses', 'events', 'assignments', 'goals', 'grades',
    'wiki_pages', 'flashcards', 'resources', 'mind_maps',
    'chat_sessions', 'calculator_history', 'notifications_log', 'lecturers'
  ]
  for (const table of tables) {
    db.prepare(`DELETE FROM ${table}`).run()
  }
}

// Lecturers
export function getAllLecturers() {
  return db.prepare('SELECT * FROM lecturers ORDER BY name ASC').all()
}

export function saveLecturer(lecturer: any) {
  const { id, name, email, office, department } = lecturer
  const stmt = db.prepare(`
    INSERT INTO lecturers (id, name, email, office, department)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      email = excluded.email,
      office = excluded.office,
      department = excluded.department
  `)
  stmt.run(id, name, email, office, department)
}

export function deleteLecturer(id: string) {
  db.prepare('DELETE FROM lecturers WHERE id = ?').run(id)
}

// Database stats diagnostics
export function getDatabaseStats() {
  const tables = [
    'courses', 'events', 'assignments', 'goals', 'grades',
    'wiki_pages', 'flashcards', 'resources', 'mind_maps',
    'chat_sessions', 'calculator_history', 'notifications_log', 'lecturers'
  ]
  const stats: Record<string, number> = {}
  for (const table of tables) {
    try {
      const row = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number }
      stats[table] = row ? row.count : 0
    } catch {
      stats[table] = 0
    }
  }
  return stats
}
