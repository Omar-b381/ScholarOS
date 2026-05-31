import * as React from 'react'
import { useAppStore, Event } from '@/store/useAppStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import {
  CalendarDays,
  Plus,
  FileDown,
  FileUp,
  Clock,
  BookOpen,
  Filter,
  CheckCircle,
  RefreshCw
} from 'lucide-react'

const EVENT_TYPES_AR = {
  Exam: 'اختبار',
  Assignment: 'تسليم واجب',
  Lecture: 'محاضرة',
  Personal: 'شخصي'
}

export function Calendar() {
  const { events, courses, assignments, saveEvent, deleteEvent, importICS } = useAppStore()

  // FullCalendar component reference
  const calendarRef = React.useRef<any>(null)

  // Modals state
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editingEvent, setEditingEvent] = React.useState<any>(null)
  const [isSyncing, setIsSyncing] = React.useState(false)

  // Day View Modal States
  const [dayViewOpen, setDayViewOpen] = React.useState(false)
  const [selectedDayEvents, setSelectedDayEvents] = React.useState<any[]>([])
  const [selectedDayAssignments, setSelectedDayAssignments] = React.useState<any[]>([])
  const [selectedDayStr, setSelectedDayStr] = React.useState('')
  const [selectedDayRawStr, setSelectedDayRawStr] = React.useState('')

  // Filters
  const [typeFilter, setTypeFilter] = React.useState<string>('all')
  const [courseFilter, setCourseFilter] = React.useState<string>('all')

  // Load events formatted for FullCalendar
  const formattedEvents = React.useMemo(() => {
    let list = [...events]

    if (typeFilter !== 'all') {
      list = list.filter(e => e.type === typeFilter)
    }

    if (courseFilter !== 'all') {
      list = list.filter(e => e.course_id === courseFilter)
    }

    return list.map(e => ({
      id: e.id,
      title: e.title,
      start: e.start_date,
      end: e.end_date || e.start_date,
      color: e.color,
      allDay: e.all_day === 1,
      extendedProps: {
        type: e.type,
        course_id: e.course_id,
        description: e.description
      }
    }))
  }, [events, typeFilter, courseFilter])

  const handleDateClick = (arg: any) => {
    // Fetch all events on this day
    const dayEvs = events.filter(e => e.start_date.startsWith(arg.dateStr))
    // Fetch all assignments due on this day
    const dayAss = assignments.filter(a => a.due_date.startsWith(arg.dateStr))

    const dateOpt: any = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    const dateStrArabic = new Date(arg.dateStr + 'T00:00:00').toLocaleDateString('ar-EG', dateOpt)

    setSelectedDayEvents(dayEvs)
    setSelectedDayAssignments(dayAss)
    setSelectedDayStr(dateStrArabic)
    setSelectedDayRawStr(arg.dateStr)
    setDayViewOpen(true)
  }

  const handleEventClick = (arg: any) => {
    const e = events.find(item => item.id === arg.event.id)
    if (!e) return

    setEditingEvent({
      ...e,
      // Format to datetime-local values (YYYY-MM-DDTHH:MM)
      start_date: e.start_date.substring(0, 16),
      end_date: e.end_date ? e.end_date.substring(0, 16) : e.start_date.substring(0, 16)
    })
    setModalOpen(true)
  }

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEvent.title || !editingEvent.start_date) return

    const colorMap: Record<string, string> = {
      Exam: '#ef4444',
      Assignment: '#f59e0b',
      Lecture: '#3b82f6',
      Personal: '#10b981'
    }

    const id = editingEvent.id || crypto.randomUUID()
    await saveEvent({
      ...editingEvent,
      id,
      color: colorMap[editingEvent.type] || '#3b82f6',
      all_day: editingEvent.all_day ? 1 : 0
    })

    setModalOpen(false)
  }

  const handleDeleteEvent = async () => {
    if (editingEvent?.id) {
      if (confirm('هل تريد حذف هذا الحدث؟')) {
        await deleteEvent(editingEvent.id)
        setModalOpen(false)
      }
    }
  }

  // ICS Export
  const handleExportICS = () => {
    let icsContent = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//ScholarOS//Calendar Export//AR\nCALSCALE:GREGORIAN\n'
    
    events.forEach(e => {
      const start = new Date(e.start_date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      const end = new Date(e.end_date || e.start_date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      icsContent += 'BEGIN:VEVENT\n'
      icsContent += `UID:${e.id}\n`
      icsContent += `DTSTART:${start}\n`
      icsContent += `DTEND:${end}\n`
      icsContent += `SUMMARY:${e.title}\n`
      icsContent += `DESCRIPTION:${e.description || ''}\n`
      icsContent += 'END:VEVENT\n'
    })
    icsContent += 'END:VCALENDAR'

    const dataUri = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(icsContent)
    const exportAnchor = document.createElement('a')
    exportAnchor.setAttribute('href', dataUri)
    exportAnchor.setAttribute('download', 'scholar-os-calendar.ics')
    document.body.appendChild(exportAnchor)
    exportAnchor.click()
    document.body.removeChild(exportAnchor)
  }

  // ICS Import
  const handleImportICS = async () => {
    try {
      const filePaths = await window.electronAPI.app.selectFile({
        title: 'استيراد ملف تقويم .ics',
        filters: [{ name: 'ملفات التقويم (.ics)', extensions: ['ics'] }],
        properties: ['openFile']
      })

      if (filePaths && filePaths.length > 0) {
        // Read file contents inside main process
        const count = await importICS(filePaths[0])
        alert(`تم بنجاح استيراد عدد ${count} من الأحداث إلى تقويمك!`)
      }
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'حدث خطأ أثناء استيراد الملف')
    }
  }

  // Google Calendar Sync Action
  const handleGoogleCalendarSync = async () => {
    setIsSyncing(true)
    try {
      const res = await window.electronAPI.googleCalendar.sync()
      alert(res.message)
      if (res.success) {
        // Refresh local data to show newly imported events!
        await useAppStore.getState().loadAllData()
      }
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'فشل الاتصال مع تقويم Google.')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto h-full overflow-y-auto scrollbar-thin">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">التقويم والأجندة الدراسية</h1>
          <p className="text-sm text-muted-foreground mt-1">تتبع مواعيد الاختبارات والتسليمات والمحاضرات</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleGoogleCalendarSync} variant="outline" className="gap-1.5 border-primary/20 text-primary hover:bg-primary/5" disabled={isSyncing}>
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'جاري المزامنة...' : 'مزامنة مع Google Calendar'}</span>
          </Button>
          <Button onClick={handleImportICS} variant="outline" className="gap-1.5 size-sm md:size-default">
            <FileUp className="h-4 w-4" /> استيراد ics
          </Button>
          <Button onClick={handleExportICS} variant="outline" className="gap-1.5 size-sm md:size-default">
            <FileDown className="h-4 w-4" /> تصدير ics
          </Button>
          <Button
            onClick={() => {
              setEditingEvent({
                id: '',
                title: '',
                type: 'Lecture',
                start_date: new Date().toISOString().substring(0, 16),
                end_date: new Date().toISOString().substring(0, 16),
                course_id: '',
                description: '',
                color: '#3b82f6',
                all_day: 0
              })
              setModalOpen(true)
            }}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" /> إضافة حدث
          </Button>
        </div>
      </div>

      {/* Filters and main calendar grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left filter side card */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                <span>تصفية الأحداث</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">نوع الحدث</label>
                <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                  <option value="all">كل الأنواع</option>
                  <option value="Lecture">محاضرات</option>
                  <option value="Exam">اختبارات</option>
                  <option value="Assignment">تسليم واجبات</option>
                  <option value="Personal">شخصي</option>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">المادة الدراسية</label>
                <Select value={courseFilter} onChange={e => setCourseFilter(e.target.value)}>
                  <option value="all">كل المواد</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Color Guides Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground">دليل الألوان</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded bg-[#ef4444]" />
                <span className="font-semibold">اختبارات ومياجر</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded bg-[#f59e0b]" />
                <span className="font-semibold">تسليم واجبات ومشاريع</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded bg-[#3b82f6]" />
                <span className="font-semibold">محاضرات وحصص</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded bg-[#10b981]" />
                <span className="font-semibold">مواعيد شخصية</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar widget container */}
        <Card className="lg:col-span-3 p-4">
          <div className="calendar-container scrollbar-thin">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              direction="rtl"
              locale="ar"
              headerToolbar={{
                start: 'prev,next today',
                center: 'title',
                end: 'dayGridMonth,timeGridWeek,timeGridDay'
              }}
              buttonText={{
                today: 'اليوم',
                month: 'شهر',
                week: 'أسبوع',
                day: 'يوم'
              }}
              events={formattedEvents}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              height="auto"
              editable={false}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={true}
            />
          </div>
        </Card>
      </div>

      {/* Day View Dialog Modal */}
      <Dialog open={dayViewOpen} onOpenChange={setDayViewOpen}>
        <DialogContent className="max-w-md w-full max-h-[85vh] flex flex-col p-6 text-right" dir="rtl">
          <DialogHeader className="border-b pb-3 mb-2 flex flex-row items-center gap-3 justify-start">
            <div className="bg-primary/10 p-2.5 rounded-full text-primary">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div className="text-right">
              <DialogTitle className="text-base font-black text-foreground">جدول ومهام اليوم</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">{selectedDayStr}</p>
            </div>
          </DialogHeader>

          {/* List content container */}
          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1 scrollbar-thin max-h-[50vh]">
            {/* Events section */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-primary flex items-center gap-1.5 border-b pb-1">
                <Clock className="h-3.5 w-3.5" />
                <span>الفعاليات والمواعيد الأكاديمية ({selectedDayEvents.length})</span>
              </h4>

              {selectedDayEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4 bg-muted/5 rounded border border-dashed">
                  لا توجد محاضرات أو اختبارات مجدولة لهذا اليوم.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {selectedDayEvents.map(ev => (
                    <div
                      key={ev.id}
                      className="p-3 border rounded-lg hover:border-primary/30 transition-all hover:bg-primary/5 flex items-start justify-between gap-3 group relative overflow-hidden"
                    >
                      <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary" style={{ backgroundColor: ev.color }} />
                      <div className="space-y-1 pr-1.5 text-right flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-foreground">{ev.title}</span>
                          <Badge className="text-[9px] py-0 px-1.5" variant="secondary" style={{ backgroundColor: `${ev.color}15`, color: ev.color, borderColor: `${ev.color}30` }}>
                            {EVENT_TYPES_AR[ev.type as keyof typeof EVENT_TYPES_AR] || ev.type}
                          </Badge>
                        </div>
                        {ev.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{ev.description}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground font-semibold">
                          {ev.all_day === 1 ? 'حدث طوال اليوم' : `${new Date(ev.start_date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })} - ${new Date(ev.end_date || ev.start_date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`}
                        </p>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-xs text-primary h-7 px-2 shrink-0 self-center"
                        onClick={() => {
                          setDayViewOpen(false)
                          setEditingEvent({
                            ...ev,
                            start_date: ev.start_date.substring(0, 16),
                            end_date: ev.end_date ? ev.end_date.substring(0, 16) : ev.start_date.substring(0, 16)
                          })
                          setModalOpen(true)
                        }}
                      >
                        تعديل
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assignments section */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-black text-amber-600 flex items-center gap-1.5 border-b pb-1">
                <CheckCircle className="h-3.5 w-3.5 text-amber-600" />
                <span>الواجبات والتسليمات المطلوبة ({selectedDayAssignments.length})</span>
              </h4>

              {selectedDayAssignments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4 bg-muted/5 rounded border border-dashed">
                  لا توجد تسليمات واجبات مطلوبة اليوم.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {selectedDayAssignments.map(ass => (
                    <div
                      key={ass.id}
                      className="p-3 border rounded-lg hover:border-amber-500/30 transition-all hover:bg-amber-500/5 flex items-start justify-between gap-3 group relative overflow-hidden"
                    >
                      <div className="absolute right-0 top-0 bottom-0 w-1 bg-amber-500" />
                      <div className="space-y-1 pr-1.5 text-right flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-foreground">{ass.title}</span>
                          <Badge className="text-[9px] py-0 px-1.5" variant={ass.status === 'completed' ? 'default' : 'outline'}>
                            {ass.status === 'completed' ? 'مكتمل' : 'معلق'}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-semibold">
                          آخر موعد للتسليم: {new Date(ass.due_date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      <span className="text-[10px] text-muted-foreground self-center italic shrink-0">
                        راجع صفحة الواجبات
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer actions */}
          <DialogFooter className="border-t pt-3 mt-2 flex flex-row justify-between items-center w-full gap-2">
            <Button
              type="button"
              className="gap-1.5 flex-1"
              onClick={() => {
                setDayViewOpen(false)
                const startStr = `${selectedDayRawStr}T10:00`
                const endStr = `${selectedDayRawStr}T11:00`
                setEditingEvent({
                  id: '',
                  title: '',
                  type: 'Lecture',
                  start_date: startStr,
                  end_date: endStr,
                  course_id: '',
                  description: '',
                  color: '#3b82f6',
                  all_day: 0
                })
                setModalOpen(true)
              }}
            >
              <Plus className="h-4 w-4" /> إضافة حدث جديد اليوم
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDayViewOpen(false)}
              className="px-4"
            >
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Event Dialog Modal */}
      {editingEvent && (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogHeader>
            <DialogTitle>
              {editingEvent.id ? 'تفاصيل وتعديل الحدث' : 'إضافة حدث جديد'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEvent}>
            <DialogContent className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold">عنوان الحدث *</label>
                <Input
                  required
                  value={editingEvent.title}
                  onChange={e => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  placeholder="مثال: اختبار الفاينال العملي"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold">نوع الحدث *</label>
                  <Select
                    value={editingEvent.type}
                    onChange={e => setEditingEvent({ ...editingEvent, type: e.target.value })}
                  >
                    <option value="Lecture">محاضرة</option>
                    <option value="Exam">اختبار</option>
                    <option value="Assignment">تسليم واجب</option>
                    <option value="Personal">شخصي</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold">مادة مرتبطة (اختياري)</label>
                  <Select
                    value={editingEvent.course_id}
                    onChange={e => setEditingEvent({ ...editingEvent, course_id: e.target.value })}
                  >
                    <option value="">لا توجد مادة...</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold">تاريخ ووقت البدء *</label>
                  <Input
                    required
                    type="datetime-local"
                    value={editingEvent.start_date}
                    onChange={e => setEditingEvent({ ...editingEvent, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold">تاريخ ووقت الانتهاء *</label>
                  <Input
                    required
                    type="datetime-local"
                    value={editingEvent.end_date}
                    onChange={e => setEditingEvent({ ...editingEvent, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 py-1 select-none">
                <input
                  type="checkbox"
                  id="all_day"
                  className="rounded border-border cursor-pointer h-4 w-4 text-primary"
                  checked={editingEvent.all_day === 1}
                  onChange={e => setEditingEvent({ ...editingEvent, all_day: e.target.checked ? 1 : 0 })}
                />
                <label htmlFor="all_day" className="text-xs font-bold cursor-pointer">حدث طوال اليوم</label>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold">وصف الموعد</label>
                <Textarea
                  value={editingEvent.description}
                  onChange={e => setEditingEvent({ ...editingEvent, description: e.target.value })}
                  placeholder="ملاحظات حول مكان الموعد أو موضوع المحاضرة..."
                />
              </div>
            </DialogContent>
            <DialogFooter>
              <div className="flex justify-between w-full">
                {editingEvent.id ? (
                  <Button type="button" variant="destructive" onClick={handleDeleteEvent}>
                    حذف الحدث
                  </Button>
                ) : (
                  <div />
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                    إلغاء
                  </Button>
                  <Button type="submit">حفظ</Button>
                </div>
              </div>
            </DialogFooter>
          </form>
        </Dialog>
      )}
    </div>
  )
}
