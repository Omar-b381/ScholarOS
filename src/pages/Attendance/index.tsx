import { useState, useEffect } from 'react'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

const STATUS_MAP = {
  present: { label: 'حضور',  color: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' },
  absent:  { label: 'غياب',  color: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' },
  excused: { label: 'عذر',   color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300' },
} as const

export function AttendancePage() {
  const [courses, setCourses] = useState<any[]>([])
  const [courseId, setCourseId] = useState('')
  const [stats, setStats] = useState<any>(null)
  const [records, setRecords] = useState<any[]>([])
  const [today] = useState(new Date().toISOString().slice(0, 10))

  useEffect(() => {
    window.electronAPI.db.courses.getAll().then(setCourses)
  }, [])

  useEffect(() => {
    if (!courseId) return
    loadData()
  }, [courseId])

  async function loadData() {
    const [recs, s] = await Promise.all([
      window.electronAPI.attendance_getAll(courseId),
      window.electronAPI.attendance_getStats(courseId),
    ])
    setRecords(recs)
    setStats(s)
  }

  async function markToday(status: 'present' | 'absent' | 'excused') {
    await window.electronAPI.attendance_save({
      course_id: courseId,
      date: today,
      status,
    })
    loadData()
  }

  return (
    <div className="p-6 flex flex-col gap-6 max-w-3xl mx-auto h-full overflow-y-auto scrollbar-thin" dir="rtl">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">تتبع الحضور والغياب 📋</h1>
          <p className="text-xs text-muted-foreground mt-1">سجل حضورك للمحاضرات وتابع نسبة الغياب المقبولة</p>
        </div>
        <div className="w-56">
          <Select value={courseId} onChange={e => setCourseId(e.target.value)}>
            <option value="">اختر المادة...</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
      </div>

      {courseId && stats ? (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'نسبة الحضور', value: `${stats.percentage}%`,
                color: stats.warning ? 'text-destructive font-black' : 'text-green-600 font-black' },
              { label: 'حضور',  value: stats.present },
              { label: 'غياب',  value: stats.absent  },
              { label: 'عذر',   value: stats.excused },
            ].map(s => (
              <div key={s.label} className="bg-card border rounded-xl p-4 text-center shadow-sm">
                <p className={`text-2xl font-black ${s.color ?? 'text-foreground'}`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Warning banner */}
          {stats.warning && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl text-red-700 dark:text-red-400 text-sm font-bold animate-pulse">
              <span className="text-lg">⚠️</span>
              <span>تحذير: نسبة حضورك {stats.percentage}% — الحد الأدنى المطلوب 75% لتجنب الحرمان!</span>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>تقدم نسبة حضور المادة</span>
              <span className="font-bold">{stats.percentage}%</span>
            </div>
            <Progress value={stats.percentage} className="h-3" />
          </div>

          {/* Today's mark */}
          <div className="flex flex-col gap-3 p-4 border rounded-xl bg-card shadow-sm">
            <p className="text-sm font-bold">تسجيل حضور اليوم — {today}</p>
            <div className="grid grid-cols-3 gap-3">
              <Button className="bg-green-600 hover:bg-green-700 text-white font-bold"
                onClick={() => markToday('present')}>✓ حضور</Button>
              <Button className="bg-red-500 hover:bg-red-600 text-white font-bold"
                onClick={() => markToday('absent')}>✗ غياب</Button>
              <Button className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold"
                onClick={() => markToday('excused')}>~ عذر</Button>
            </div>
          </div>

          {/* History table */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-black text-muted-foreground">سجل الحضور والغياب السابق</p>
            {records.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                لا توجد سجلات بعد — ابدأ بتسجيل حضور اليوم
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {records.map(r => (
                  <div key={r.id}
                    className="flex items-center justify-between p-3 border rounded-xl bg-card hover:shadow-sm transition-shadow">
                    <span className="text-xs font-bold text-foreground">{r.date}</span>
                    <Badge className={STATUS_MAP[r.status as keyof typeof STATUS_MAP]?.color}>
                      {STATUS_MAP[r.status as keyof typeof STATUS_MAP]?.label}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-center bg-card border rounded-xl p-6">
          <span className="text-5xl mb-4">📋</span>
          <p className="text-sm font-bold">يرجى تحديد مقرر دراسي لعرض سجل الحضور</p>
          <p className="text-xs max-w-xs mt-2 text-muted-foreground">اختر المادة المرتبطة من القائمة المنسدلة بالأعلى لتتمكن من رصد غياباتك وحساب نسب الحرمان.</p>
        </div>
      )}
    </div>
  )
}
