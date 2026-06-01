import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Sparkles, Trash2, Calendar, BookOpen, Clock, CheckCircle2, AlertTriangle, Plus, X } from 'lucide-react'

interface ExamInput {
  title: string
  date: string
  course: string
}

export function StudySchedulePage() {
  const { courses: storeCourses } = useAppStore()
  
  // Schedule list & history
  const [schedules, setSchedules] = useState<any[]>([])
  const [activeSchedule, setActiveSchedule] = useState<any>(null)
  
  // Creator form state
  const [isCreating, setIsCreating] = useState(false)
  const [hoursPerDay, setHoursPerDay] = useState(3)
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])
  const [exams, setExams] = useState<ExamInput[]>([])
  
  // Exam temp inputs
  const [tempExamTitle, setTempExamTitle] = useState('')
  const [tempExamDate, setTempExamDate] = useState('')
  const [tempExamCourse, setTempExamCourse] = useState('')
  
  // Execution status
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Session checkoff tracking
  const [completedSessions, setCompletedSessions] = useState<Record<string, boolean>>({})

  // Load initial schedules and initialize selected courses from store courses
  useEffect(() => {
    loadSchedules()
    if (storeCourses.length > 0) {
      setSelectedCourses(storeCourses.map(c => c.name))
    }
  }, [storeCourses])

  // Load checked off sessions from local storage
  useEffect(() => {
    const saved = localStorage.getItem('scholaros_completed_study_sessions')
    if (saved) {
      try {
        setCompletedSessions(JSON.parse(saved))
      } catch {
        // Ignore parsing errors
      }
    }
  }, [])

  async function loadSchedules() {
    try {
      const list = await window.electronAPI.schedule_getAll()
      setSchedules(list)
      if (list.length > 0 && !activeSchedule) {
        // Auto-select latest
        setActiveSchedule(list[0])
        setIsCreating(false)
      } else if (list.length === 0) {
        setIsCreating(true)
      }
    } catch (e) {
      console.error('Failed to load schedules', e)
    }
  }

  const toggleCourseSelection = (courseName: string) => {
    setSelectedCourses(prev =>
      prev.includes(courseName)
        ? prev.filter(c => c !== courseName)
        : [...prev, courseName]
    )
  }

  const addExam = () => {
    if (!tempExamTitle.trim() || !tempExamDate) return
    const newExam: ExamInput = {
      title: tempExamTitle.trim(),
      date: tempExamDate,
      course: tempExamCourse || (storeCourses[0]?.name ?? 'عام')
    }
    setExams(prev => [...prev, newExam])
    setTempExamTitle('')
    setTempExamDate('')
  }

  const removeExam = (index: number) => {
    setExams(prev => prev.filter((_, i) => i !== index))
  }

  const handleGenerate = async () => {
    if (selectedCourses.length === 0) {
      setError('يرجى تحديد مقرر دراسي واحد على الأقل.')
      return
    }
    setLoading(true)
    setError('')
    
    const payload = {
      exams,
      courses: selectedCourses,
      hoursPerDay,
      startDate
    }

    try {
      const res = await window.electronAPI.schedule_generate(payload)
      if (res.error) {
        setError(res.error)
      } else if (res.schedule) {
        // Reload list, set active, switch view
        const list = await window.electronAPI.schedule_getAll()
        setSchedules(list)
        const newSched = list.find(s => s.id === res.schedule.id) || res.schedule
        setActiveSchedule(newSched)
        setIsCreating(false)
        // Reset form
        setExams([])
      }
    } catch (e) {
      setError('حدث خطأ غير متوقع أثناء توليد الجدول.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('هل أنت متأكد من حذف هذا الجدول؟')) return
    try {
      await window.electronAPI.schedule_delete(id)
      const list = await window.electronAPI.schedule_getAll()
      setSchedules(list)
      if (activeSchedule?.id === id) {
        if (list.length > 0) {
          setActiveSchedule(list[0])
        } else {
          setActiveSchedule(null)
          setIsCreating(true)
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  const toggleSessionComplete = (scheduleId: string, dayIndex: number, sessionIndex: number) => {
    const key = `${scheduleId}-${dayIndex}-${sessionIndex}`
    const updated = {
      ...completedSessions,
      [key]: !completedSessions[key]
    }
    setCompletedSessions(updated)
    localStorage.setItem('scholaros_completed_study_sessions', JSON.stringify(updated))
  }

  // Parse safety for schedule_data string in DB
  const getActiveScheduleDays = () => {
    if (!activeSchedule) return []
    try {
      return typeof activeSchedule.schedule_data === 'string'
        ? JSON.parse(activeSchedule.schedule_data)
        : activeSchedule.schedule_data ?? []
    } catch {
      return []
    }
  }

  const activeDays = getActiveScheduleDays()

  return (
    <div className="flex h-full w-full bg-background" dir="rtl">
      {/* Schedules History Sidebar */}
      <div className="w-64 border-l border-border bg-card flex flex-col shrink-0">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <span className="font-extrabold text-sm text-foreground">الجداول المُولّدة</span>
          <Button
            size="sm"
            variant="outline"
            className="text-xs flex items-center gap-1 font-bold border-primary text-primary hover:bg-primary/5"
            onClick={() => {
              setIsCreating(true)
              setActiveSchedule(null)
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            جديد
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
          {schedules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-xs">
              لا توجد جداول محفوظة بعد
            </div>
          ) : (
            schedules.map(s => {
              const isActive = activeSchedule?.id === s.id && !isCreating
              return (
                <div
                  key={s.id}
                  onClick={() => {
                    setActiveSchedule(s)
                    setIsCreating(false)
                    setError('')
                  }}
                  className={`group w-full flex items-center justify-between p-2.5 rounded-lg text-right text-xs font-semibold cursor-pointer transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Calendar className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-primary-foreground' : 'text-primary'}`} />
                    <div className="truncate">
                      <p className="font-bold truncate">{s.title}</p>
                      <p className={`text-[9px] ${isActive ? 'text-primary-foreground/75' : 'text-muted-foreground'}`}>
                        {s.generated_for}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(s.id, e)}
                    className={`opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded-md transition-all ${
                      isActive ? 'text-primary-foreground hover:bg-white/20' : 'text-muted-foreground hover:text-destructive'
                    }`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 h-full overflow-y-auto p-6 scrollbar-thin bg-background/50">
        {loading ? (
          <div className="h-full w-full flex flex-col items-center justify-center space-y-4">
            <div className="relative flex items-center justify-center">
              <div className="h-14 w-14 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <Sparkles className="h-6 w-6 text-primary absolute animate-bounce" />
            </div>
            <p className="font-black text-foreground">جاري استشارة الذكاء الاصطناعي لبناء خطة دراسية فائقة...</p>
            <p className="text-xs text-muted-foreground text-center max-w-xs leading-relaxed">
              نقوم بتحليل مواعيد اختباراتك، والمقررات، والجهد اليومي المطلوب وتوزيع المواد باستخدام منهجية التكرار المتباعد الذكي.
            </p>
          </div>
        ) : isCreating ? (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="border-b pb-4">
              <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
                <Sparkles className="text-primary h-6 w-6 animate-pulse" />
                توليد جدول مذاكرة ذكي بالذكاء الاصطناعي
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                صمم جدولك الدراسي المخصص القائم على تقنية التكرار المتباعد (Spaced Repetition) لتثبيت الفهم والاستعداد الأمثل.
              </p>
            </div>

            {error && (
              <Card className="border-destructive bg-destructive/5">
                <CardContent className="p-4 flex items-center gap-3 text-destructive text-sm font-bold">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Daily hours */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-muted-foreground">ساعات المذاكرة اليومية المتاحة</label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={hoursPerDay}
                    onChange={e => setHoursPerDay(parseInt(e.target.value) || 3)}
                    className="font-bold text-center w-20 shrink-0"
                  />
                  <input
                    type="range"
                    min={1}
                    max={12}
                    value={hoursPerDay}
                    onChange={e => setHoursPerDay(parseInt(e.target.value) || 3)}
                    className="flex-1 accent-primary h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-xs font-extrabold text-foreground">{hoursPerDay} ساعات/يوم</span>
                </div>
              </div>

              {/* Start Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-muted-foreground">تاريخ بدء المذاكرة</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="font-bold text-foreground"
                />
              </div>
            </div>

            {/* Courses Checklist */}
            <Card>
              <CardHeader className="p-4 border-b">
                <CardTitle className="text-sm font-black text-foreground">المواد المشمولة في خطة المذاكرة</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">اختر المقررات التي تود إضافتها للجدول الحالي</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                {storeCourses.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    لا توجد مواد مضافة في حسابك حالياً. يرجى إضافتها أولاً في شاشة المواد الدراسية.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2.5">
                    {storeCourses.map(c => {
                      const isSelected = selectedCourses.includes(c.name)
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleCourseSelection(c.name)}
                          className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${
                            isSelected
                              ? 'bg-primary/10 border-primary text-primary shadow-sm scale-102 font-black'
                              : 'bg-card border-border text-muted-foreground hover:border-muted-foreground'
                          }`}
                        >
                          {c.name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Exams list builder */}
            <Card>
              <CardHeader className="p-4 border-b">
                <CardTitle className="text-sm font-black text-foreground">الامتحانات المقررة (لتكثيف المراجعة قبلها)</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">أضف تواريخ اختباراتك القادمة ليقوم الذكاء الاصطناعي بتنظيم تكرارات المراجعة التراكمية لتسبقها</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Inputs grid */}
                <div className="grid grid-cols-3 gap-2 items-end">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-muted-foreground">عنوان الامتحان / الاختبار</label>
                    <Input
                      placeholder="مثال: الاختبار الفصلي الأول"
                      value={tempExamTitle}
                      onChange={e => setTempExamTitle(e.target.value)}
                      className="text-xs font-bold placeholder:text-muted-foreground/50 h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-muted-foreground">تاريخ الامتحان</label>
                    <Input
                      type="date"
                      value={tempExamDate}
                      onChange={e => setTempExamDate(e.target.value)}
                      className="text-xs font-bold h-8"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-black text-muted-foreground">المقرر المرتبط</label>
                      <select
                        value={tempExamCourse}
                        onChange={e => setTempExamCourse(e.target.value)}
                        className="w-full h-8 rounded-md border border-input bg-transparent px-2 text-xs font-bold shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        {storeCourses.map(c => (
                          <option key={c.id} value={c.name} className="bg-card text-foreground">{c.name}</option>
                        ))}
                        {storeCourses.length === 0 && <option value="عام">عام</option>}
                      </select>
                    </div>
                    <Button type="button" size="sm" className="h-8 w-8 p-0" onClick={addExam}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Built exams list */}
                {exams.length > 0 && (
                  <div className="border rounded-lg overflow-hidden bg-background/50 divide-y">
                    {exams.map((ex, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 text-xs">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-black bg-primary/5 text-primary text-[10px]">{ex.course}</Badge>
                          <span className="font-extrabold text-foreground">{ex.title}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground font-mono">{ex.date}</span>
                          <button
                            type="button"
                            onClick={() => removeExam(idx)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Button
              onClick={handleGenerate}
              className="w-full py-6 text-sm font-black bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90 text-white rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              <Sparkles className="ml-2 h-4 w-4" />
              توليد جدول المذاكرة بالذكاء الاصطناعي 🚀
            </Button>
          </div>
        ) : activeSchedule ? (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
                  <BookOpen className="text-primary h-6 w-6" />
                  {activeSchedule.title}
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  جدول مذاكرة تكيفي مُوزّع بالتكرار المتباعد — تاريخ البدء: {activeSchedule.generated_for}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsCreating(true)}
                  className="font-bold text-xs"
                >
                  توليد خطة جديدة
                </Button>
              </div>
            </div>

            {activeDays.length === 0 ? (
              <div className="text-center py-20 bg-card border rounded-xl">
                <p className="text-muted-foreground text-sm font-bold">لا توجد تفاصيل دراسية نشطة في هذا الجدول.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeDays.map((day: any, dayIdx: number) => {
                  const daySessions = day.sessions ?? []
                  const completedCount = daySessions.filter((_: any, sIdx: number) => 
                    completedSessions[`${activeSchedule.id}-${dayIdx}-${sIdx}`]
                  ).length
                  const isDayDone = daySessions.length > 0 && completedCount === daySessions.length

                  return (
                    <Card key={dayIdx} className={`overflow-hidden border transition-all ${
                      isDayDone ? 'border-green-200 dark:border-green-950/50 bg-green-50/10 dark:bg-green-950/5' : 'bg-card'
                    }`}>
                      <div className={`p-4 border-b flex items-center justify-between transition-colors ${
                        isDayDone ? 'bg-green-50/50 dark:bg-green-950/20' : 'bg-secondary/40'
                      }`}>
                        <div className="flex items-center gap-3">
                          <Calendar className={`h-4.5 w-4.5 ${isDayDone ? 'text-green-600' : 'text-primary'}`} />
                          <span className="font-black text-sm text-foreground">{day.date}</span>
                          <span className="text-xs text-muted-foreground font-extrabold">
                            (اليوم {dayIdx + 1})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={isDayDone ? 'default' : 'secondary'} className={`text-[10px] font-black ${
                            isDayDone ? 'bg-green-600 text-white' : 'text-muted-foreground'
                          }`}>
                            {isDayDone ? 'مكتمل بالكامل ✓' : `${completedCount} / ${daySessions.length} منجز`}
                          </Badge>
                        </div>
                      </div>
                      
                      <CardContent className="p-4 space-y-3">
                        {daySessions.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2 text-center">اليوم يوم راحة واستراحة محارب ☕</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {daySessions.map((session: any, sIdx: number) => {
                              const isSessionCompleted = !!completedSessions[`${activeSchedule.id}-${dayIdx}-${sIdx}`]
                              
                              // Determine badge colors based on session type
                              let typeColor = 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              if (session.type?.includes('مراجعة')) {
                                typeColor = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300'
                              } else if (session.type?.includes('دراسة جديدة') || session.type?.includes('جديدة')) {
                                typeColor = 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                              } else if (session.type?.includes('تدريب') || session.type?.includes('تطبيق')) {
                                typeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              }

                              return (
                                <div
                                  key={sIdx}
                                  onClick={() => toggleSessionComplete(activeSchedule.id, dayIdx, sIdx)}
                                  className={`flex items-start justify-between p-3 border rounded-xl transition-all cursor-pointer select-none group ${
                                    isSessionCompleted
                                      ? 'border-green-200 bg-green-50/20 dark:bg-green-950/10'
                                      : 'bg-card hover:bg-accent/40 border-border hover:border-muted-foreground/30 shadow-xs'
                                  }`}
                                >
                                  <div className="flex items-start gap-3 flex-1">
                                    <div className="mt-0.5">
                                      <CheckCircle2 className={`h-4.5 w-4.5 transition-all ${
                                        isSessionCompleted ? 'text-green-600 scale-110 fill-green-600/10' : 'text-muted-foreground/50 group-hover:text-green-600/70'
                                      }`} />
                                    </div>
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-xs font-black leading-none ${isSessionCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                          {session.course}
                                        </span>
                                        <Badge className={`text-[9px] font-bold px-1.5 py-0.5 border-none ${typeColor}`}>
                                          {session.type ?? 'جلسة'}
                                        </Badge>
                                      </div>
                                      <p className={`text-xs font-medium text-muted-foreground leading-normal ${isSessionCompleted ? 'line-through text-muted-foreground/60' : ''}`}>
                                        {session.topic}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span className="text-[10px] font-bold font-mono">{session.duration} د</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
