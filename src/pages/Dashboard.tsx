import * as React from 'react'
import { useAppStore, Course, Assignment, Event } from '@/store/useAppStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts'
import {
  CalendarDays,
  FileText,
  Plus,
  Clock,
  Award,
  BookOpen,
  CheckCircle2,
  FilePlus,
  ArrowLeft
} from 'lucide-react'

export function Dashboard() {
  const {
    profile,
    courses,
    assignments,
    events,
    saveCourse,
    saveAssignment,
    saveEvent,
    setActivePage
  } = useAppStore()
  
  // Gamification stats loaded from LocalStorage
  const [level, setLevel] = React.useState<number>(1)
  const [xp, setXp] = React.useState<number>(0)

  React.useEffect(() => {
    const savedLevel = localStorage.getItem('scholaros_focus_level')
    const savedXp = localStorage.getItem('scholaros_focus_xp')
    if (savedLevel) setLevel(parseInt(savedLevel, 10))
    if (savedXp) setXp(parseInt(savedXp, 10))
  }, [])

  const getAcademicRank = () => {
    if (level === 1) return 'طالب مبتدئ'
    if (level === 2) return 'مكافح المذاكرة'
    if (level === 3) return 'باحث أكاديمي'
    if (level === 4) return 'أستاذ التلخيص'
    if (level === 5) return 'عبقري الدفعة'
    return 'عالم فوق العادة'
  }

  // Modals state
  const [courseModalOpen, setCourseModalOpen] = React.useState(false)
  const [assignmentModalOpen, setAssignmentModalOpen] = React.useState(false)
  const [eventModalOpen, setEventModalOpen] = React.useState(false)

  // Quick-Add Forms state
  const [newCourse, setNewCourse] = React.useState({ name: '', code: '', teacher: '', email: '', color: '#4f46e5' })
  const [newAssignment, setNewAssignment] = React.useState({ title: '', courseId: '', dueDate: '', notes: '' })
  const [newEvent, setNewEvent] = React.useState({ title: '', type: 'Lecture', startDate: '', endDate: '', description: '' })

  const [recentPDFs, setRecentPDFs] = React.useState<any[]>([])

  React.useEffect(() => {
    // Load recent PDFs from documents folder via IPC
    window.electronAPI.files.listPDFs().then((list) => {
      setRecentPDFs(list.slice(0, 5))
    }).catch(console.error)
  }, [assignments])

  // Current Date in Arabic
  const formattedDate = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  // Calculate Cumulative GPA
  const { grades } = useAppStore()
  const totalCredits = grades.reduce((sum, g) => sum + g.credit_hours, 0)
  const weightedGPA = grades.reduce((sum, g) => sum + (g.grade_value * g.credit_hours), 0)
  const currentGPA = totalCredits > 0 ? parseFloat((weightedGPA / totalCredits).toFixed(2)) : 0.0

  const gpaChartData = [
    {
      name: 'GPA',
      value: currentGPA,
      fill: 'hsl(var(--primary))'
    }
  ]

  // Filter items in the next 7 days
  const upcomingItems = React.useMemo(() => {
    const now = new Date()
    const sevenDaysLater = new Date()
    sevenDaysLater.setDate(now.getDate() + 7)

    const list: { type: 'assignment' | 'event'; title: string; date: string; tag: string; color: string }[] = []

    assignments.forEach(asg => {
      const date = new Date(asg.due_date)
      if (date >= now && date <= sevenDaysLater && asg.status !== 'graded') {
        const course = courses.find(c => c.id === asg.course_id)
        list.push({
          type: 'assignment',
          title: asg.title,
          date: asg.due_date,
          tag: course ? course.name : 'واجب',
          color: course ? course.color : '#4f46e5'
        })
      }
    })

    events.forEach(evt => {
      const date = new Date(evt.start_date)
      if (date >= now && date <= sevenDaysLater) {
        list.push({
          type: 'event',
          title: evt.title,
          date: evt.start_date,
          tag: evt.type === 'Exam' ? 'اختبار' : evt.type === 'Lecture' ? 'محاضرة' : 'حدث',
          color: evt.color || '#3b82f6'
        })
      }
    })

    return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [assignments, events, courses])

  // Handlers
  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCourse.name) return
    const id = crypto.randomUUID()
    await saveCourse({
      id,
      name: newCourse.name,
      code: newCourse.code,
      teacher_name: newCourse.teacher,
      teacher_email: newCourse.email,
      color: newCourse.color,
      schedule: '[]',
      syllabus: '[]',
      notes: ''
    })
    setNewCourse({ name: '', code: '', teacher: '', email: '', color: '#4f46e5' })
    setCourseModalOpen(false)
  }

  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAssignment.title || !newAssignment.dueDate) return
    const id = crypto.randomUUID()
    await saveAssignment({
      id,
      title: newAssignment.title,
      course_id: newAssignment.courseId,
      due_date: newAssignment.dueDate,
      status: 'pending',
      grade: '',
      notes: newAssignment.notes,
      pdf_path: ''
    })
    setNewAssignment({ title: '', courseId: '', dueDate: '', notes: '' })
    setAssignmentModalOpen(false)
  }

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEvent.title || !newEvent.startDate) return
    const id = crypto.randomUUID()
    const colorMap: Record<string, string> = {
      Exam: '#ef4444',
      Assignment: '#f59e0b',
      Lecture: '#3b82f6',
      Personal: '#10b981'
    }
    await saveEvent({
      id,
      title: newEvent.title,
      type: newEvent.type as any,
      start_date: newEvent.startDate,
      end_date: newEvent.endDate || newEvent.startDate,
      course_id: '',
      description: newEvent.description,
      color: colorMap[newEvent.type] || '#3b82f6',
      all_day: 0
    })
    setNewEvent({ title: '', type: 'Lecture', startDate: '', endDate: '', description: '' })
    setEventModalOpen(false)
  }

  const openDocument = (path: string) => {
    window.electronAPI.files.openPDF(path).catch(console.error)
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto h-full scrollbar-thin">
      {/* Greeting Card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-l from-primary/15 via-primary/5 to-transparent p-6 rounded-2xl border border-primary/10 shadow-sm animate-in fade-in duration-300">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
              <span>مرحباً، {profile.name}</span>
              <span className="text-2xl animate-bounce">👋</span>
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                المستوى {level}: <span className="font-extrabold text-rose-500">{getAcademicRank()}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 border border-amber-500/20 shadow-sm">
                ⭐ {xp} XP
              </span>
              <span className="text-muted-foreground text-xs font-bold flex items-center gap-1.5 mr-2">
                <Clock className="h-3.5 w-3.5" />
                اليوم هو {formattedDate}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={() => setCourseModalOpen(true)} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> مادة جديدة
          </Button>
          <Button onClick={() => setAssignmentModalOpen(true)} size="sm" variant="secondary" className="gap-1.5">
            <FilePlus className="h-4 w-4" /> واجب جديد
          </Button>
          <Button onClick={() => setEventModalOpen(true)} size="sm" variant="outline" className="gap-1.5">
            <CalendarDays className="h-4 w-4" /> حدث جديد
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GPA Progress Widget */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              <span>المعدل التراكمي الحالي</span>
            </CardTitle>
            <CardDescription>الحد الأقصى للمعدل هو 4.00</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center relative pb-0">
            <div className="w-48 h-48 relative">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="80%"
                  outerRadius="100%"
                  barSize={12}
                  data={gpaChartData}
                  startAngle={90}
                  endAngle={-270}
                >
                  <RadialBar
                    background
                    dataKey="value"
                    cornerRadius={6}
                    max={4.0}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold">{currentGPA.toFixed(2)}</span>
                <span className="text-xs text-muted-foreground mt-1">من 4.00</span>
              </div>
            </div>
          </CardContent>
          <div className="p-6 pt-0 border-t border-border mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>عدد الساعات المسجلة: {totalCredits} ساعة</span>
            <Button variant="link" size="sm" onClick={() => setActivePage('goals')} className="h-auto p-0 flex items-center gap-1">
              <span>حاسبة المعدل</span>
              <ArrowLeft className="h-3 w-3" />
            </Button>
          </div>
        </Card>

        {/* Upcoming Deadlines Widget */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <span>المهام والتسليمات القادمة (خلال 7 أيام)</span>
            </CardTitle>
            <CardDescription>المواعيد النهائية والاختبارات القادمة</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[260px] overflow-y-auto pr-1">
            {upcomingItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 text-green-500/70 mb-2" />
                <p className="text-sm font-semibold">كل شيء منجز! لا يوجد تسليمات قريبة.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-1.5 h-8 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <div>
                        <h4 className="font-semibold text-sm">{item.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <span>{new Date(item.date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </p>
                      </div>
                    </div>
                    <Badge variant={item.type === 'assignment' ? 'warning' : 'info'}>
                      {item.tag}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Documents vault */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span>المستندات والملفات المضافة حديثاً</span>
            </CardTitle>
            <CardDescription>ملفات PDF المخزنة في الخزانة الرقمية</CardDescription>
          </CardHeader>
          <CardContent>
            {recentPDFs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-center">
                <FileText className="h-10 w-10 opacity-30 mb-2" />
                <p className="text-xs">لا يوجد مستندات في الخزانة حالياً.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentPDFs.map((pdf, idx) => (
                  <div
                    key={idx}
                    onClick={() => openDocument(pdf.path)}
                    className="flex items-center justify-between py-2.5 cursor-pointer hover:text-primary transition-colors text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-red-500" />
                      <span className="font-semibold truncate max-w-md">{pdf.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(pdf.updated_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Academic Details widget */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <span>الملخص الأكاديمي</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-sm border-b pb-2">
              <span className="text-muted-foreground">الجامعة:</span>
              <span className="font-bold">{profile.university}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b pb-2">
              <span className="text-muted-foreground">التخصص:</span>
              <span className="font-bold">{profile.major}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b pb-2">
              <span className="text-muted-foreground">الفصل الدراسي:</span>
              <span className="font-bold">{profile.semester}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">عدد المواد الدراسية:</span>
              <span className="font-bold">{courses.length} مواد</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QUICK ADD MODALS */}

      {/* Course Modal */}
      <Dialog open={courseModalOpen} onOpenChange={setCourseModalOpen}>
        <DialogHeader>
          <DialogTitle>إضافة مادة دراسية جديدة</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAddCourse}>
          <DialogContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold">اسم المادة *</label>
              <Input
                required
                value={newCourse.name}
                onChange={e => setNewCourse({ ...newCourse, name: e.target.value })}
                placeholder="مثال: هندسة البرمجيات"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold">رمز المادة</label>
                <Input
                  value={newCourse.code}
                  onChange={e => setNewCourse({ ...newCourse, code: e.target.value })}
                  placeholder="مثال: SWE 311"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold">لون المادة المميز</label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="color"
                    className="w-12 h-9 p-1 cursor-pointer shrink-0"
                    value={newCourse.color}
                    onChange={e => setNewCourse({ ...newCourse, color: e.target.value })}
                  />
                  <span className="text-xs text-muted-foreground">{newCourse.color}</span>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold">اسم أستاذ المادة</label>
              <Input
                value={newCourse.teacher}
                onChange={e => setNewCourse({ ...newCourse, teacher: e.target.value })}
                placeholder="الدكتور..."
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold">البريد الإلكتروني للأستاذ</label>
              <Input
                type="email"
                value={newCourse.email}
                onChange={e => setNewCourse({ ...newCourse, email: e.target.value })}
                placeholder="teacher@university.edu"
              />
            </div>
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCourseModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit">حفظ المادة</Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Assignment Modal */}
      <Dialog open={assignmentModalOpen} onOpenChange={setAssignmentModalOpen}>
        <DialogHeader>
          <DialogTitle>إضافة واجب أو تسليم جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAddAssignment}>
          <DialogContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold">عنوان الواجب *</label>
              <Input
                required
                value={newAssignment.title}
                onChange={e => setNewAssignment({ ...newAssignment, title: e.target.value })}
                placeholder="مثال: تسليم المشروع النهائي"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold">المادة الدراسية *</label>
                <Select
                  required
                  value={newAssignment.courseId}
                  onChange={e => setNewAssignment({ ...newAssignment, courseId: e.target.value })}
                >
                  <option value="">اختر مادة...</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold">تاريخ الاستحقاق *</label>
                <Input
                  required
                  type="datetime-local"
                  value={newAssignment.dueDate}
                  onChange={e => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold">ملاحظات إضافية</label>
              <Textarea
                value={newAssignment.notes}
                onChange={e => setNewAssignment({ ...newAssignment, notes: e.target.value })}
                placeholder="اكتب تعليمات الواجب أو ملاحظاتك هنا..."
              />
            </div>
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAssignmentModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit">إضافة الواجب</Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Event Modal */}
      <Dialog open={eventModalOpen} onOpenChange={setEventModalOpen}>
        <DialogHeader>
          <DialogTitle>إضافة حدث أو موعد جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAddEvent}>
          <DialogContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold">عنوان الحدث *</label>
              <Input
                required
                value={newEvent.title}
                onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="مثال: مراجعة اختبار منتصف الفصل"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold">نوع الحدث *</label>
                <Select
                  value={newEvent.type}
                  onChange={e => setNewEvent({ ...newEvent, type: e.target.value })}
                >
                  <option value="Lecture">محاضرة</option>
                  <option value="Exam">اختبار</option>
                  <option value="Assignment">موعد تسليم</option>
                  <option value="Personal">شخصي</option>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold">تاريخ البدء *</label>
                <Input
                  required
                  type="datetime-local"
                  value={newEvent.startDate}
                  onChange={e => setNewEvent({ ...newEvent, startDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold">تاريخ الانتهاء</label>
              <Input
                type="datetime-local"
                value={newEvent.endDate}
                onChange={e => setNewEvent({ ...newEvent, endDate: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold">وصف الحدث</label>
              <Textarea
                value={newEvent.description}
                onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                placeholder="تفاصيل الموعد والمكان..."
              />
            </div>
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEventModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit">حفظ الحدث</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  )
}
