import * as React from 'react'
import { useAppStore, Course } from '@/store/useAppStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  BookOpen,
  Mail,
  User,
  Plus,
  Trash2,
  Edit,
  CheckSquare,
  Square,
  Clock,
  Calendar,
  GraduationCap
} from 'lucide-react'

const DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']
const DAYS_EN_MAP: Record<string, string> = {
  'Sunday': 'الأحد',
  'Monday': 'الاثنين',
  'Tuesday': 'الثلاثاء',
  'Wednesday': 'الأربعاء',
  'Thursday': 'الخميس'
}

export function Courses() {
  const { courses, saveCourse, deleteCourse } = useAppStore()
  const [selectedCourseId, setSelectedCourseId] = React.useState<string | null>(null)

  // Edit/Add Modals
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editingCourse, setEditingCourse] = React.useState<any>(null)

  // New Syllabus item
  const [newTopicName, setNewTopicName] = React.useState('')

  // New schedule slot template
  const [newSlot, setNewSlot] = React.useState({ day: 'Sunday', startTime: '08:00', endTime: '09:30', room: '' })

  const selectedCourse = courses.find(c => c.id === selectedCourseId) || courses[0]

  React.useEffect(() => {
    if (!selectedCourseId && courses.length > 0) {
      setSelectedCourseId(courses[0].id)
    }
  }, [courses])

  const openAddModal = () => {
    setEditingCourse({
      id: '',
      name: '',
      code: '',
      teacher_name: '',
      teacher_email: '',
      color: '#6366f1',
      schedule: [],
      syllabus: [],
      notes: ''
    })
    setModalOpen(true)
  }

  const openEditModal = (course: Course) => {
    setEditingCourse({
      ...course,
      schedule: JSON.parse(course.schedule || '[]'),
      syllabus: JSON.parse(course.syllabus || '[]')
    })
    setModalOpen(true)
  }

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCourse.name) return

    const id = editingCourse.id || crypto.randomUUID()
    const courseToSave: Course = {
      ...editingCourse,
      id,
      schedule: JSON.stringify(editingCourse.schedule || []),
      syllabus: JSON.stringify(editingCourse.syllabus || [])
    }

    await saveCourse(courseToSave)
    setSelectedCourseId(id)
    setModalOpen(false)
  }

  const handleDeleteCourse = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه المادة وجميع بياناتها؟')) {
      await deleteCourse(id)
      if (selectedCourseId === id) {
        setSelectedCourseId(courses.length > 0 ? courses[0].id : null)
      }
    }
  }

  // Syllabus Tracker Update
  const toggleTopic = async (topicId: string) => {
    if (!selectedCourse) return
    const syllabus = JSON.parse(selectedCourse.syllabus || '[]')
    const updated = syllabus.map((t: any) => t.id === topicId ? { ...t, covered: !t.covered } : t)
    
    await saveCourse({
      ...selectedCourse,
      syllabus: JSON.stringify(updated)
    })
  }

  const addTopic = async () => {
    if (!selectedCourse || !newTopicName.trim()) return
    const syllabus = JSON.parse(selectedCourse.syllabus || '[]')
    syllabus.push({
      id: crypto.randomUUID(),
      name: newTopicName.trim(),
      covered: false
    })

    await saveCourse({
      ...selectedCourse,
      syllabus: JSON.stringify(syllabus)
    })
    setNewTopicName('')
  }

  const deleteTopic = async (topicId: string) => {
    if (!selectedCourse) return
    const syllabus = JSON.parse(selectedCourse.syllabus || '[]')
    const updated = syllabus.filter((t: any) => t.id !== topicId)

    await saveCourse({
      ...selectedCourse,
      syllabus: JSON.stringify(updated)
    })
  }

  // Save notes auto
  const saveNotes = async (notesVal: string) => {
    if (!selectedCourse) return
    await saveCourse({
      ...selectedCourse,
      notes: notesVal
    })
  }

  // Schedule Grid slots compile
  const allScheduleSlots = React.useMemo(() => {
    const list: { courseId: string; courseName: string; color: string; day: string; startTime: string; endTime: string; room: string }[] = []
    courses.forEach(c => {
      const slots = JSON.parse(c.schedule || '[]')
      slots.forEach((s: any) => {
        list.push({
          courseId: c.id,
          courseName: c.name,
          color: c.color,
          day: s.day,
          startTime: s.startTime,
          endTime: s.endTime,
          room: s.room || ''
        })
      })
    })
    return list
  }, [courses])

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto h-full overflow-y-auto scrollbar-thin">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">إدارة المواد الدراسية</h1>
          <p className="text-sm text-muted-foreground mt-1">تتبع مقرراتك ومواعيد المحاضرات والخطط الدراسية</p>
        </div>
        <Button onClick={openAddModal} className="gap-2">
          <Plus className="h-4 w-4" /> إضافة مقرر دراسي
        </Button>
      </div>

      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card rounded-xl border text-center p-6">
          <BookOpen className="h-16 w-16 text-muted-foreground opacity-30 mb-4 animate-bounce" />
          <h3 className="text-xl font-bold">لم تتم إضافة أي مواد بعد</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">أضف مقرراتك الدراسية الآن لتتبع أوقات محاضراتك وخطة المنهج والواجبات الخاصة بكل مادة.</p>
          <Button onClick={openAddModal} className="mt-4 gap-2">
            <Plus className="h-4 w-4" /> أضف مادتك الأولى الآن
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Courses List Sidebar */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="font-bold text-sm text-muted-foreground px-1">قائمة المقررات</h3>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {courses.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCourseId(c.id)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-right cursor-pointer transition-all duration-200 ${
                    selectedCourse?.id === c.id
                      ? 'border-primary bg-primary/5 shadow-sm scale-102 font-bold'
                      : 'bg-card hover:bg-accent/40 border-border'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: c.color }}
                    />
                    <div className="truncate">
                      <h4 className="text-sm leading-tight truncate">{c.name}</h4>
                      <span className="text-xs text-muted-foreground">{c.code}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Course Details Area */}
          <div className="lg:col-span-3 space-y-6">
            {selectedCourse && (
              <>
                {/* Course Main Details header card */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-card border rounded-2xl gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl" style={{ backgroundColor: `${selectedCourse.color}15` }}>
                      <GraduationCap className="h-8 w-8" style={{ color: selectedCourse.color }} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black">{selectedCourse.name}</h2>
                      <div className="flex gap-2 items-center mt-1">
                        <Badge variant="outline" style={{ borderColor: selectedCourse.color, color: selectedCourse.color }}>
                          {selectedCourse.code}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => openEditModal(selectedCourse)} size="sm" variant="outline" className="gap-1.5">
                      <Edit className="h-4 w-4" /> تعديل المقرر
                    </Button>
                    <Button onClick={() => handleDeleteCourse(selectedCourse.id)} size="sm" variant="destructive" className="gap-1.5">
                      <Trash2 className="h-4 w-4" /> حذف
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left content: syllabus topics list (Syllabus Tracker) */}
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <CheckSquare className="h-5 w-5 text-primary" />
                        <span>خطة المنهج الدراسي</span>
                      </CardTitle>
                      <CardDescription>حدد المواضيع المغطاة وغير المغطاة</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Add topic form */}
                      <div className="flex gap-2">
                        <Input
                          value={newTopicName}
                          onChange={e => setNewTopicName(e.target.value)}
                          placeholder="عنوان موضوع جديد..."
                          onKeyDown={e => e.key === 'Enter' && addTopic()}
                        />
                        <Button type="button" onClick={addTopic} size="sm">إضافة</Button>
                      </div>

                      {/* Checklist */}
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {JSON.parse(selectedCourse.syllabus || '[]').length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-6">لا توجد مواضيع مضافة حالياً. أضف بعض المواضيع للبدء.</p>
                        ) : (
                          JSON.parse(selectedCourse.syllabus || '[]').map((topic: any) => (
                            <div
                              key={topic.id}
                              className="flex items-center justify-between p-2.5 rounded-lg border bg-accent/10 hover:bg-accent/25 transition-colors"
                            >
                              <div
                                onClick={() => toggleTopic(topic.id)}
                                className="flex items-center gap-3 cursor-pointer text-sm font-semibold select-none flex-1"
                              >
                                {topic.covered ? (
                                  <CheckSquare className="h-4.5 w-4.5 text-primary shrink-0" />
                                ) : (
                                  <Square className="h-4.5 w-4.5 text-muted-foreground shrink-0" />
                                )}
                                <span className={topic.covered ? 'line-through text-muted-foreground' : ''}>
                                  {topic.name}
                                </span>
                              </div>
                              <button
                                onClick={() => deleteTopic(topic.id)}
                                className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Right content: teacher card & schedule details */}
                  <div className="space-y-6">
                    {/* Teacher Contact Info Card */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <User className="h-5 w-5 text-primary" />
                          <span>أستاذ المقرر</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3.5 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 opacity-50 shrink-0" />
                          <span className="font-semibold text-foreground truncate">{selectedCourse.teacher_name || 'غير محدد'}</span>
                        </div>
                        {selectedCourse.teacher_email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 opacity-50 shrink-0" />
                            <a
                              href={`mailto:${selectedCourse.teacher_email}`}
                              className="text-primary hover:underline truncate"
                            >
                              {selectedCourse.teacher_email}
                            </a>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Schedule times for active course */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Clock className="h-5 w-5 text-primary" />
                          <span>مواعيد المحاضرات</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-xs">
                        {JSON.parse(selectedCourse.schedule || '[]').length === 0 ? (
                          <p className="text-muted-foreground">لا توجد مواعيد مسجلة لهذه المادة.</p>
                        ) : (
                          JSON.parse(selectedCourse.schedule || '[]').map((slot: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center bg-accent/20 p-2.5 rounded-lg border border-border">
                              <span className="font-bold">{DAYS_EN_MAP[slot.day] || slot.day}</span>
                              <span className="font-semibold text-muted-foreground">
                                {slot.startTime} - {slot.endTime} {slot.room && `(قاعة ${slot.room})`}
                              </span>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Course Notes Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <span>ملاحظات إضافية</span>
                    </CardTitle>
                    <CardDescription>مسودة لملاحظاتك العامة حول المادة (تُحفظ تلقائياً عند الكتابة)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      className="min-h-[140px] text-sm"
                      placeholder="اكتب أي ملاحظات أو روابط مهمة هنا..."
                      defaultValue={selectedCourse.notes}
                      onChange={e => saveNotes(e.target.value)}
                    />
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      )}

      {/* Unified Timetable Grid of all courses */}
      {courses.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <span>الجدول الدراسي الأسبوعي الموحد</span>
            </CardTitle>
            <CardDescription>جدول الحصص والمحاضرات لجميع المقررات المضافة</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="min-w-[800px] border border-border rounded-lg overflow-hidden">
              <div className="grid grid-cols-6 bg-muted/80 font-bold border-b text-center text-sm py-2">
                <div className="border-l py-1 text-xs">الوقت / اليوم</div>
                {DAYS_AR.map(d => (
                  <div key={d} className="border-l py-1">{d}</div>
                ))}
              </div>

              {/* Time Blocks */}
              {['08:00 - 09:30', '09:30 - 11:00', '11:00 - 12:30', '12:30 - 14:00', '14:00 - 15:30', '15:30 - 17:00'].map((timeRange) => {
                const [start, end] = timeRange.split(' - ')

                return (
                  <div key={timeRange} className="grid grid-cols-6 border-b text-center min-h-[64px]">
                    <div className="flex items-center justify-center bg-muted/20 border-l text-xs font-semibold text-muted-foreground p-1">
                      {timeRange}
                    </div>

                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'].map((day) => {
                      // Filter slot matching day and close start time
                      const matchingSlots = allScheduleSlots.filter(s => {
                        return s.day === day && s.startTime >= start && s.startTime < end
                      })

                      return (
                        <div key={day} className="border-l flex flex-col justify-center gap-1 p-1 bg-card hover:bg-accent/10 transition-colors">
                          {matchingSlots.map((slot, idx) => (
                            <div
                              key={idx}
                              onClick={() => setSelectedCourseId(slot.courseId)}
                              style={{ borderRight: `4px solid ${slot.color}` }}
                              className="text-[10px] p-1.5 rounded bg-accent/20 cursor-pointer text-right hover:scale-102 transition-transform duration-100"
                            >
                              <div className="font-extrabold text-foreground truncate">{slot.courseName}</div>
                              <div className="text-muted-foreground font-semibold truncate mt-0.5">
                                {slot.startTime} {slot.room && `| ق ${slot.room}`}
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Course Edit/Add Modal */}
      {editingCourse && (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogHeader>
            <DialogTitle>
              {editingCourse.id ? 'تعديل المقرر الدراسي' : 'إضافة مقرر دراسي جديد'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCourse}>
            <DialogContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold">اسم المقرر *</label>
                  <Input
                    required
                    value={editingCourse.name}
                    onChange={e => setEditingCourse({ ...editingCourse, name: e.target.value })}
                    placeholder="مثال: هندسة البرمجيات"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold">رمز المقرر</label>
                  <Input
                    value={editingCourse.code}
                    onChange={e => setEditingCourse({ ...editingCourse, code: e.target.value })}
                    placeholder="SWE 311"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold">أستاذ المقرر</label>
                  <Input
                    value={editingCourse.teacher_name}
                    onChange={e => setEditingCourse({ ...editingCourse, teacher_name: e.target.value })}
                    placeholder="د. أحمد..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold">البريد الإلكتروني للأستاذ</label>
                  <Input
                    type="email"
                    value={editingCourse.teacher_email}
                    onChange={e => setEditingCourse({ ...editingCourse, teacher_email: e.target.value })}
                    placeholder="teacher@univ.edu"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold">لون المقرر المميز</label>
                <div className="flex gap-3 items-center">
                  <Input
                    type="color"
                    className="w-12 h-9 p-1 cursor-pointer shrink-0"
                    value={editingCourse.color}
                    onChange={e => setEditingCourse({ ...editingCourse, color: e.target.value })}
                  />
                  <span className="text-xs text-muted-foreground">{editingCourse.color}</span>
                </div>
              </div>

              {/* Schedule slot editor */}
              <div className="border-t border-border pt-3 space-y-2">
                <label className="text-xs font-black text-primary block">مواعيد المحاضرات في الجدول</label>
                <div className="grid grid-cols-4 gap-2 items-end">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground">اليوم</label>
                    <Select
                      value={newSlot.day}
                      onChange={e => setNewSlot({ ...newSlot, day: e.target.value })}
                    >
                      <option value="Sunday">الأحد</option>
                      <option value="Monday">الاثنين</option>
                      <option value="Tuesday">الثلاثاء</option>
                      <option value="Wednesday">الأربعاء</option>
                      <option value="Thursday">الخميس</option>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground">البدء</label>
                    <Input
                      type="time"
                      value={newSlot.startTime}
                      onChange={e => setNewSlot({ ...newSlot, startTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground">الانتهاء</label>
                    <Input
                      type="time"
                      value={newSlot.endTime}
                      onChange={e => setNewSlot({ ...newSlot, endTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground">القاعة</label>
                    <div className="flex gap-1.5">
                      <Input
                        placeholder="ق-12"
                        value={newSlot.room}
                        onChange={e => setNewSlot({ ...newSlot, room: e.target.value })}
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          const list = [...(editingCourse.schedule || [])]
                          list.push({ ...newSlot })
                          setEditingCourse({ ...editingCourse, schedule: list })
                          setNewSlot({ day: 'Sunday', startTime: '08:00', endTime: '09:30', room: '' })
                        }}
                      >
                        أضف
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Added slots list */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {(editingCourse.schedule || []).map((s: any, idx: number) => (
                    <Badge key={idx} variant="secondary" className="gap-1.5 py-1 px-2.5">
                      <span>{DAYS_EN_MAP[s.day] || s.day} {s.startTime} - {s.endTime} {s.room && `(ق ${s.room})`}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const list = (editingCourse.schedule || []).filter((_: any, i: number) => i !== idx)
                          setEditingCourse({ ...editingCourse, schedule: list })
                        }}
                        className="text-red-500 hover:text-red-700 font-bold ml-1"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </DialogContent>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit">حفظ التغييرات</Button>
            </DialogFooter>
          </form>
        </Dialog>
      )}
    </div>
  )
}
