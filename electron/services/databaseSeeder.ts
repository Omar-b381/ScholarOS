import { Database } from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'

export function seedDatabase(db: Database) {
  console.log('Seeding database with default mock academic data in Arabic...')

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

  // 4. Grades Seed
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

  console.log('✅ Seeding completed successfully!')
}
