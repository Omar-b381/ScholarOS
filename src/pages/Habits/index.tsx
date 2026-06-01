import { useState, useEffect } from 'react'
import HeatMap from 'react-heatmap-grid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

const PRESET_HABITS = [
  { title: 'مذاكرة يومية',       icon: '📚', color: '#6d28d9' },
  { title: 'مراجعة الملاحظات',   icon: '📝', color: '#0f6e56' },
  { title: 'حل تمارين',          icon: '✏️', color: '#993c1d' },
  { title: 'قراءة مرجع علمي',    icon: '📖', color: '#185fa5' },
  { title: 'مراجعة البطاقات',    icon: '🃏', color: '#854f0b' },
]

function getLastNDates(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (n - 1 - i))
    return d.toISOString().slice(0, 10)
  })
}

export function HabitsPage() {
  const [habits, setHabits] = useState<any[]>([])
  const [logs, setLogs] = useState<Record<string, Record<string, boolean>>>({})
  const [newTitle, setNewTitle] = useState('')
  const [open, setOpen] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const last30 = getLastNDates(30)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    try {
      const hs = await window.electronAPI.habits_getAll()
      setHabits(hs)
      const logMap: Record<string, Record<string, boolean>> = {}
      for (const h of hs) {
        const rows = await window.electronAPI.habits_getHeatmap(h.id, 90)
        logMap[h.id] = {}
        for (const r of rows) {
          logMap[h.id][r.date] = r.completed === 1
        }
      }
      setLogs(logMap)
    } catch (err) {
      console.error(err)
    }
  }

  async function toggleToday(habitId: string) {
    const current = logs[habitId]?.[today] ?? false
    await window.electronAPI.habits_log(habitId, today, !current)
    setLogs(prev => ({
      ...prev,
      [habitId]: { ...(prev[habitId] ?? {}), [today]: !current },
    }))
  }

  async function addHabit(title: string, icon = '📌', color = '#6d28d9') {
    await window.electronAPI.habits_save({ title, icon, color, target_days: 7 })
    setNewTitle('')
    setOpen(false)
    loadAll()
  }

  async function deleteHabit(id: string) {
    if (confirm('هل تريد حذف هذه العادة نهائياً؟')) {
      await window.electronAPI.habits_delete(id)
      loadAll()
    }
  }

  // Build heatmap data for a habit (last 30 days, 5 weeks × 6 cols)
  function buildHeatmapData(habitId: string) {
    const data = Array.from({ length: 5 }, (_, w) =>
      Array.from({ length: 6 }, (_, d) => {
        const idx = w * 6 + d
        const date = last30[idx]
        return date ? (logs[habitId]?.[date] ? 1 : 0) : null
      }).filter(v => v !== null)
    )
    return { data }
  }

  return (
    <div className="p-6 flex flex-col gap-6 max-w-4xl mx-auto h-full overflow-y-auto scrollbar-thin" dir="rtl">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">متتبع العادات اليومية 🎯</h1>
          <p className="text-xs text-muted-foreground mt-1">حافظ على استمراريتك وراقب إنجازك الأكاديمي اليومي</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>+ إضافة عادة</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>
          <DialogTitle>إضافة عادة جديدة</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="flex flex-col gap-4 pt-2">
            <p className="text-xs font-bold text-muted-foreground">اختر من العادات الأكاديمية المقترحة:</p>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_HABITS.map(p => (
                <button key={p.title}
                  type="button"
                  className="flex items-center gap-3 p-3 border rounded-xl hover:bg-accent/40 bg-card text-right transition-colors"
                  onClick={() => addHabit(p.title, p.icon, p.color)}>
                  <span className="text-xl">{p.icon}</span>
                  <span className="text-xs font-bold">{p.title}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2 pt-4 border-t">
              <Input
                placeholder="أو اكتب عادة مخصصة..."
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
              />
              <Button onClick={() => newTitle && addHabit(newTitle)}>إضافة</Button>
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
        </DialogFooter>
      </Dialog>

      {habits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-center bg-card border rounded-xl p-6">
          <span className="text-5xl mb-4">🎯</span>
          <p className="text-sm font-bold">لا توجد عادات مضافة بعد</p>
          <p className="text-xs max-w-xs mt-2 text-muted-foreground">أضف بعض العادات الأكاديمية مثل (مراجعة المحاضرات اليومية أو حل التمارين) للبدء في تتبع أدائك الدراسي.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {habits.map(h => {
            const doneToday = logs[h.id]?.[today] ?? false
            const streak = last30.reduce((s, d) => logs[h.id]?.[d] ? s + 1 : 0, 0)
            const { data } = buildHeatmapData(h.id)

            return (
              <div key={h.id} className="border rounded-xl p-5 bg-card flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl bg-secondary p-2 rounded-xl">{h.icon}</span>
                    <div>
                      <p className="font-bold text-sm text-foreground">{h.title}</p>
                      <p className="text-xs text-muted-foreground font-semibold">
                        شعلة النشاط المتواصل: {streak} أيام 🔥
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={doneToday ? 'default' : 'outline'}
                      className={doneToday ? 'bg-green-600 hover:bg-green-700 text-white font-bold' : 'font-semibold'}
                      onClick={() => toggleToday(h.id)}
                    >
                      {doneToday ? '✓ أنجزت اليوم' : 'سجّل اليوم'}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/5 text-xs font-bold"
                      onClick={() => deleteHabit(h.id)}>حذف</Button>
                  </div>
                </div>

                {/* Heatmap — آخر 30 يوم */}
                <div className="overflow-x-auto p-1 bg-muted/20 border rounded-xl flex justify-center">
                  <div className="min-w-[280px]">
                    <HeatMap
                      xLabels={Array.from({ length: 6 }, (_, i) => `${i + 1}`)}
                      yLabels={['', '', '', '', '']}
                      data={data}
                      squares
                      height={28}
                      onClick={() => {}}
                      cellStyle={(_bg: any, value: any) => ({
                        background: value === 1 ? h.color : 'hsl(var(--muted)/0.4)',
                        borderRadius: '4px',
                        margin: '2px',
                      })}
                      cellRender={() => null}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
