import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

function getDatabasePath() {
  const isWin = process.platform === 'win32'
  const isMac = process.platform === 'darwin'

  let appDataDir = ''
  if (isWin) {
    appDataDir = path.join(process.env.APPDATA || '', 'scholar-os')
  } else if (isMac) {
    appDataDir = path.join(process.env.HOME || '', 'Library', 'Application Support', 'scholar-os')
  } else {
    appDataDir = path.join(process.env.HOME || '', '.config', 'scholar-os')
  }

  if (!fs.existsSync(appDataDir)) {
    fs.mkdirSync(appDataDir, { recursive: true })
  }
  return path.join(appDataDir, 'scholar-os.db')
}

function seed() {
  const dbPath = getDatabasePath()
  console.log(`جارٍ فتح قاعدة البيانات على المسار: ${dbPath}`)

  const db = new Database(dbPath)

  // Ensure tables exist
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
  `)

  // Clear existing
  db.exec(`
    DELETE FROM courses;
    DELETE FROM events;
    DELETE FROM assignments;
    DELETE FROM goals;
    DELETE FROM grades;
    DELETE FROM wiki_pages;
    DELETE FROM flashcards;
    DELETE FROM resources;
  `)

  // Course IDs
  const c1 = uuidv4()
  const c2 = uuidv4()
  const c3 = uuidv4()

  // 1. Courses Seed
  const courses = [
    {
      id: c1,
      name: 'هندسة البرمجيات',
      code: 'SWE 311',
      teacher_name: 'د. أحمد الحربي',
      teacher_email: 'alharbi@university.edu',
      color: '#6366f1',
      schedule: JSON.stringify([
        { day: 'Sunday', startTime: '08:00', endTime: '09:30', room: 'A-14' },
        { day: 'Tuesday', startTime: '08:00', endTime: '09:30', room: 'A-14' }
      ]),
      syllabus: JSON.stringify([
        { id: uuidv4(), name: 'مقدمة في هندسة البرمجيات ونماذج دورة حياة البرمجيات SDLC', covered: true },
        { id: uuidv4(), name: 'تحليل المتطلبات البرمجية وصياغتها SRS', covered: true },
        { id: uuidv4(), name: 'هندسة التصميم المعماري للأنظمة البرمجية', covered: false },
        { id: uuidv4(), name: 'اختبار البرمجيات وضمان الجودة وحقن الأخطاء', covered: false }
      ]),
      notes: 'مقرر ممتاز يركز على الجوانب التطبيقية وإدارة المشاريع البرمجية الكبيرة.'
    },
    {
      id: c2,
      name: 'شبكات الحاسب',
      code: 'NET 220',
      teacher_name: 'د. فيصل العتيبي',
      teacher_email: 'alotaibi@university.edu',
      color: '#f59e0b',
      schedule: JSON.stringify([
        { day: 'Sunday', startTime: '11:00', endTime: '12:30', room: 'Lab-4' },
        { day: 'Tuesday', startTime: '11:00', endTime: '12:30', room: 'Lab-4' }
      ]),
      syllabus: JSON.stringify([
        { id: uuidv4(), name: 'المفاهيم الأساسية للشبكات وبنية طبقات OSI & TCP/IP', covered: true },
        { id: uuidv4(), name: 'بروتوكولات التوجيه الفرعي وعناوين IP Subnetting', covered: true },
        { id: uuidv4(), name: 'بروتوكولات طبقة النقل TCP/UDP ومراقبة التدفق', covered: false }
      ]),
      notes: 'المحاضرات تعتمد بشكل كبير على المعامل وتطبيق Packet Tracer.'
    },
    {
      id: c3,
      name: 'قواعد البيانات',
      code: 'DB 240',
      teacher_name: 'أ. سارة السديري',
      teacher_email: 'alsudairi@university.edu',
      color: '#10b981',
      schedule: JSON.stringify([
        { day: 'Monday', startTime: '09:30', endTime: '11:00', room: 'B-6' },
        { day: 'Wednesday', startTime: '09:30', endTime: '11:00', room: 'B-6' }
      ]),
      syllabus: JSON.stringify([
        { id: uuidv4(), name: 'نموذج الكيانات والعلاقات ERD', covered: true },
        { id: uuidv4(), name: 'لغة الاستعلامات البنيوية SQL والجداول', covered: true },
        { id: uuidv4(), name: 'قواعد الاستقرار البنيوي والأشكال العادية Normalization', covered: false }
      ]),
      notes: 'المشروع العملي النهائي يتطلب استخدام قاعدة بيانات مثل SQLite أو Postgres.'
    }
  ]

  const insertCourse = db.prepare(`
    INSERT INTO courses (id, name, code, teacher_name, teacher_email, color, schedule, syllabus, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  courses.forEach(c => insertCourse.run(c.id, c.name, c.code, c.teacher_name, c.teacher_email, c.color, c.schedule, c.syllabus, c.notes))

  // 2. Events Seed
  const events = [
    {
      id: uuidv4(),
      title: 'اختبار الميد الأول - هندسة برمجيات',
      type: 'Exam',
      start_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().substring(0, 16),
      end_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString().substring(0, 16),
      course_id: c1,
      description: 'الاختبار يغطي الفصول 1 و 2 و 3 في القاعة الرئيسية.',
      color: '#ef4444',
      all_day: 0
    },
    {
      id: uuidv4(),
      title: 'محاضرة مراجعة الشبكات',
      type: 'Lecture',
      start_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().substring(0, 16),
      end_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000).toISOString().substring(0, 16),
      course_id: c2,
      description: 'مراجعة مسائل Subnetting وحسابات التوجيه.',
      color: '#3b82f6',
      all_day: 0
    },
    {
      id: uuidv4(),
      title: 'تقديم مقترح مشروع قواعد البيانات',
      type: 'Assignment',
      start_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().substring(0, 16),
      end_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().substring(0, 16),
      course_id: c3,
      description: 'رفع ملف المقترح PDF عبر بوابة الطالب.',
      color: '#f59e0b',
      all_day: 0
    }
  ]

  const insertEvent = db.prepare(`
    INSERT INTO events (id, title, type, start_date, end_date, course_id, description, color, all_day)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  events.forEach(e => insertEvent.run(e.id, e.title, e.type, e.start_date, e.end_date, e.course_id, e.description, e.color, e.all_day))

  // 3. Assignments Seed
  const assignments = [
    {
      id: uuidv4(),
      title: 'الواجب الأول: SRS Document',
      course_id: c1,
      due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().substring(0, 16),
      status: 'pending',
      grade: '',
      notes: 'كتابة مواصفات المتطلبات البرمجية لنظام مكتبة جامعية.',
      pdf_path: ''
    },
    {
      id: uuidv4(),
      title: 'معمل الشبكات 2: Cisco Tracer Subnets',
      course_id: c2,
      due_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().substring(0, 16),
      status: 'graded',
      grade: '95/100',
      notes: 'تهيئة مسارات التوجيه لـ 4 شبكات فرعية.',
      pdf_path: ''
    }
  ]

  const insertAsg = db.prepare(`
    INSERT INTO assignments (id, title, course_id, due_date, status, grade, notes, pdf_path)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  assignments.forEach(a => insertAsg.run(a.id, a.title, a.course_id, a.due_date, a.status, a.grade, a.notes, a.pdf_path))

  // 4. Grades Seed for Cumulative GPA
  const gradesData = [
    { id: uuidv4(), course_id: c1, semester: 'الفصل السابق', grade_value: 4.0, credit_hours: 3 },
    { id: uuidv4(), course_id: c2, semester: 'الفصل السابق', grade_value: 3.75, credit_hours: 4 },
    { id: uuidv4(), course_id: c3, semester: 'الفصل الحالي', grade_value: 4.0, credit_hours: 3 }
  ]

  const insertGrade = db.prepare(`
    INSERT INTO grades (id, course_id, semester, grade_value, credit_hours, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  gradesData.forEach(g => insertGrade.run(g.id, g.course_id, g.semester, g.grade_value, g.credit_hours, new Date().toISOString()))

  // 5. Goals Seed
  const goals = [
    {
      id: uuidv4(),
      title: 'الحصول على معدل امتياز الفصل الحالي',
      target_gpa: 3.75,
      current_gpa: 3.85,
      deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      milestones: JSON.stringify([
        { id: uuidv4(), title: 'المذاكرة للاختبارات النصفية مسبقاً بفترة كافية', completed: true },
        { id: uuidv4(), title: 'تسليم جميع المعامل والواجبات في مواعيدها المحددة', completed: true },
        { id: uuidv4(), title: 'الحصول على 90+ في المشروع النهائي لمقرر هندسة البرمجيات', completed: false }
      ]),
      status: 'active',
      created_at: new Date().toISOString()
    }
  ]

  const insertGoal = db.prepare(`
    INSERT INTO goals (id, title, target_gpa, current_gpa, deadline, milestones, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  goals.forEach(g => insertGoal.run(g.id, g.title, g.target_gpa, g.current_gpa, g.deadline, g.milestones, g.status, g.created_at))

  console.log('✅ تم إدخال بيانات التغذية الأولية (Seed) بنجاح في قاعدة البيانات!')
}

seed()
