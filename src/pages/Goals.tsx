import * as React from 'react'
import { useAppStore, Goal, Grade, Course } from '@/store/useAppStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import {
  Target,
  Plus,
  Trash2,
  TrendingUp,
  Award,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRightLeft
} from 'lucide-react'

export function Goals() {
  const {
    goals,
    grades,
    courses,
    saveGoal,
    deleteGoal,
    saveGrade,
    deleteGrade
  } = useAppStore()

  // Modals state
  const [goalModalOpen, setGoalModalOpen] = React.useState(false)
  const [gradeModalOpen, setGradeModalOpen] = React.useState(false)

  // Forms states
  const [newGoal, setNewGoal] = React.useState({ title: '', targetGpa: '4.00', deadline: '', milestones: '' })
  const [newGrade, setNewGrade] = React.useState({ courseId: '', semester: '', gradeValue: '4.00', creditHours: '3' })

  // Active goal selected for milestone tracking
  const [selectedGoalId, setSelectedGoalId] = React.useState<string | null>(null)

  // Milestone input for selected goal
  const [newMilestoneText, setNewMilestoneText] = React.useState('')

  const activeGoal = goals.find(g => g.id === selectedGoalId) || goals[0]

  // === Grade Predictor States ===
  const [predCourseId, setPredCourseId] = React.useState('')
  const [predInputs, setPredInputs] = React.useState<any[]>([])
  const [newComp, setNewComp] = React.useState('')
  const [newWeight, setNewWeight] = React.useState('20')
  const [newScore, setNewScore] = React.useState('')
  const [newMax, setNewMax] = React.useState('100')

  React.useEffect(() => {
    if (!selectedGoalId && goals.length > 0) {
      setSelectedGoalId(goals[0].id)
    }
  }, [goals])

  React.useEffect(() => {
    if (predCourseId) {
      window.electronAPI.grades_getInputs(predCourseId).then(setPredInputs).catch(console.error)
    } else {
      setPredInputs([])
    }
  }, [predCourseId])

  const handleSaveGradeInput = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!predCourseId || !newComp || !newWeight || !newScore) return

    await window.electronAPI.grades_saveInput({
      course_id: predCourseId,
      component: newComp,
      weight: parseFloat(newWeight),
      score: parseFloat(newScore),
      max_score: parseFloat(newMax)
    })
    
    setNewComp('')
    setNewScore('')
    // Reload
    const list = await window.electronAPI.grades_getInputs(predCourseId)
    setPredInputs(list)
  }

  const handleDeleteGradeInput = async (id: string) => {
    if (confirm('هل تريد حذف هذا التقييم الدراسي؟')) {
      await window.electronAPI.grades_deleteInput(id)
      const list = await window.electronAPI.grades_getInputs(predCourseId)
      setPredInputs(list)
    }
  }

  const getGpaLetter = (pct: number) => {
    if (pct >= 95) return { letter: 'A+ (امتياز مرتفع)', gpa: 4.00, color: 'text-green-600 font-extrabold' }
    if (pct >= 90) return { letter: 'A (امتياز)', gpa: 3.75, color: 'text-green-500 font-extrabold' }
    if (pct >= 85) return { letter: 'B+ (جيد جداً مرتفع)', gpa: 3.50, color: 'text-blue-600 font-bold' }
    if (pct >= 80) return { letter: 'B (جيد جداً)', gpa: 3.00, color: 'text-blue-500 font-bold' }
    if (pct >= 75) return { letter: 'C+ (جيد مرتفع)', gpa: 2.50, color: 'text-yellow-600 font-semibold' }
    if (pct >= 70) return { letter: 'C (جيد)', gpa: 2.00, color: 'text-yellow-500 font-semibold' }
    if (pct >= 65) return { letter: 'D+ (مقبول مرتفع)', gpa: 1.50, color: 'text-orange-600' }
    if (pct >= 60) return { letter: 'D (مقبول)', gpa: 1.00, color: 'text-orange-500' }
    return { letter: 'F (راسب)', gpa: 0.00, color: 'text-red-500 font-black' }
  }

  // Cumulative GPA Calculations
  const totalCredits = grades.reduce((sum, g) => sum + g.credit_hours, 0)
  const weightedPoints = grades.reduce((sum, g) => sum + (g.grade_value * g.credit_hours), 0)
  const cumulativeGPA = totalCredits > 0 ? parseFloat((weightedPoints / totalCredits).toFixed(2)) : 0.0

  // Group grades by semester for GPA Trend Chart
  const semesterGPATrend = React.useMemo(() => {
    const semMap: Record<string, { totalPoints: number; totalHours: number }> = {}
    grades.forEach(g => {
      if (!semMap[g.semester]) {
        semMap[g.semester] = { totalPoints: 0, totalHours: 0 }
      }
      semMap[g.semester].totalPoints += (g.grade_value * g.credit_hours)
      semMap[g.semester].totalHours += g.credit_hours
    })

    // Sort semesters by name/order
    return Object.keys(semMap).map(sem => {
      const info = semMap[sem]
      const gpa = info.totalHours > 0 ? parseFloat((info.totalPoints / info.totalHours).toFixed(2)) : 0.0
      return {
        semester: sem,
        GPA: gpa
      }
    })
  }, [grades])

  // Handlers
  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGoal.title) return
    const id = crypto.randomUUID()
    
    // Parse milestones from newlines
    const rawMilestones = newGoal.milestones.split('\n').filter(m => m.trim())
    const milestoneArray = rawMilestones.map(m => ({
      id: crypto.randomUUID(),
      title: m.trim(),
      completed: false
    }))

    await saveGoal({
      id,
      title: newGoal.title,
      target_gpa: parseFloat(newGoal.targetGpa),
      current_gpa: cumulativeGPA,
      deadline: newGoal.deadline,
      milestones: JSON.stringify(milestoneArray),
      status: 'active'
    })

    setNewGoal({ title: '', targetGpa: '4.00', deadline: '', milestones: '' })
    setGoalModalOpen(false)
    setSelectedGoalId(id)
  }

  const handleDeleteGoal = async (id: string) => {
    if (confirm('هل تريد حذف هذا الهدف الأكاديمي؟')) {
      await deleteGoal(id)
      if (selectedGoalId === id) {
        setSelectedGoalId(goals.length > 0 ? goals[0].id : null)
      }
    }
  }

  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGrade.courseId || !newGrade.semester) return
    const id = crypto.randomUUID()

    await saveGrade({
      id,
      course_id: newGrade.courseId,
      semester: newGrade.semester,
      grade_value: parseFloat(newGrade.gradeValue),
      credit_hours: parseInt(newGrade.creditHours, 10)
    })

    setNewGrade({ courseId: '', semester: newGrade.semester, gradeValue: '4.00', creditHours: '3' })
    setGradeModalOpen(false)
  }

  const handleDeleteGrade = async (id: string) => {
    if (confirm('هل تريد حذف هذه المادة المرصودة من السجل؟')) {
      await deleteGrade(id)
    }
  }

  // Milestone Actions
  const toggleMilestone = async (milestoneId: string) => {
    if (!activeGoal) return
    const list = JSON.parse(activeGoal.milestones || '[]')
    const updated = list.map((m: any) => m.id === milestoneId ? { ...m, completed: !m.completed } : m)
    
    // Check if all milestones completed
    const allDone = updated.length > 0 && updated.every((m: any) => m.completed)

    await saveGoal({
      ...activeGoal,
      milestones: JSON.stringify(updated),
      status: allDone ? 'completed' : 'active'
    })
  }

  const addMilestone = async () => {
    if (!activeGoal || !newMilestoneText.trim()) return
    const list = JSON.parse(activeGoal.milestones || '[]')
    list.push({
      id: crypto.randomUUID(),
      title: newMilestoneText.trim(),
      completed: false
    })

    await saveGoal({
      ...activeGoal,
      milestones: JSON.stringify(list)
    })
    setNewMilestoneText('')
  }

  const deleteMilestone = async (milestoneId: string) => {
    if (!activeGoal) return
    const list = JSON.parse(activeGoal.milestones || '[]')
    const updated = list.filter((m: any) => m.id !== milestoneId)

    await saveGoal({
      ...activeGoal,
      milestones: JSON.stringify(updated)
    })
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto h-full overflow-y-auto scrollbar-thin">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">الأهداف والمعدل التراكمي</h1>
          <p className="text-sm text-muted-foreground mt-1">تتبع درجات الفصول الدراسية وحساب معدلك ورسم أهدافك الجامعية</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setGradeModalOpen(true)} variant="outline" className="gap-1.5">
            <Plus className="h-4 w-4" /> رصد درجة
          </Button>
          <Button onClick={() => setGoalModalOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> إضافة هدف أكاديمي
          </Button>
        </div>
      </div>

      {/* GPA Overview Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GPA overview numbers */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              <span>ملخص المعدل الدراسي</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 flex-1 flex flex-col justify-center">
            <div className="text-center">
              <span className="text-5xl font-black text-primary">{cumulativeGPA.toFixed(2)}</span>
              <p className="text-xs text-muted-foreground mt-2">المعدل التراكمي الكلي</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center border-t pt-4 text-xs">
              <div>
                <span className="font-extrabold text-base">{totalCredits}</span>
                <p className="text-muted-foreground mt-1">الساعات المكتسبة</p>
              </div>
              <div>
                <span className="font-extrabold text-base">{grades.length}</span>
                <p className="text-muted-foreground mt-1">المقررات المرصودة</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* GPA trend Recharts LineChart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span>منحنى تقدم المعدل التراكمي</span>
            </CardTitle>
            <CardDescription>أداء الفصول الدراسية</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px]">
            {semesterGPATrend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                يرجى رصد درجات لبعض الفصول الدراسية لرسم المنحنى.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={semesterGPATrend} margin={{ top: 10, left: 10, right: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="semester" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <YAxis domain={[0, 4.0]} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <Tooltip />
                  <Line type="monotone" dataKey="GPA" stroke="hsl(var(--primary))" strokeWidth={3} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Goals Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Goals Selection Sidebar */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="font-bold text-sm text-muted-foreground px-1">الأهداف الأكاديمية</h3>
          {goals.length === 0 ? (
            <div className="p-6 bg-card border rounded-xl text-center text-xs text-muted-foreground">
              لا توجد أهداف مضافة. أضف هدفك الأكاديمي (مثال: الحصول على معدل 3.8).
            </div>
          ) : (
            <div className="space-y-2.5">
              {goals.map(g => {
                const milestonesList = JSON.parse(g.milestones || '[]')
                const completedCount = milestonesList.filter((m: any) => m.completed).length
                const pct = milestonesList.length > 0 ? Math.round((completedCount / milestonesList.length) * 100) : 0

                return (
                  <div
                    key={g.id}
                    onClick={() => setSelectedGoalId(g.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                      selectedGoalId === g.id
                        ? 'border-primary bg-primary/5 shadow-sm scale-102'
                        : 'bg-card hover:bg-accent/40 border-border'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-sm text-foreground">{g.title}</h4>
                      <Badge variant={g.status === 'completed' ? 'success' : 'default'}>
                        {g.status === 'completed' ? 'منجز' : 'نشط'}
                      </Badge>
                    </div>
                    <div className="mt-3.5 space-y-1.5">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>الهدف: {g.target_gpa.toFixed(2)} معدل</span>
                        <span>{pct}% منجز</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Selected Goal Milestones & checklists */}
        <div className="lg:col-span-2 space-y-6">
          {activeGoal ? (
            <Card>
              <CardHeader className="flex flex-row justify-between items-start border-b pb-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <span>{activeGoal.title}</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-1.5 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Award className="h-3.5 w-3.5" />
                      <span>المعدل المستهدف: {activeGoal.target_gpa.toFixed(2)}</span>
                    </span>
                    {activeGoal.deadline && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>الحد الأقصى: {new Date(activeGoal.deadline).toLocaleDateString('ar-EG')}</span>
                      </span>
                    )}
                  </CardDescription>
                </div>
                <Button size="sm" variant="destructive" className="gap-1" onClick={() => handleDeleteGoal(activeGoal.id)}>
                  <Trash2 className="h-3.5 w-3.5" /> حذف الهدف
                </Button>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-muted-foreground">خطوات تحقيق الهدف (المراحل)</h4>
                  {/* Add Milestone form */}
                  <div className="flex gap-2">
                    <Input
                      value={newMilestoneText}
                      onChange={e => setNewMilestoneText(e.target.value)}
                      placeholder="أضف مرحلة أو خطوة جديدة..."
                      onKeyDown={e => e.key === 'Enter' && addMilestone()}
                    />
                    <Button onClick={addMilestone} size="sm">إضافة خطوة</Button>
                  </div>

                  {/* Checklist */}
                  <div className="space-y-2 pt-2">
                    {JSON.parse(activeGoal.milestones || '[]').length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">لا توجد مراحل مسجلة لهذا الهدف.</p>
                    ) : (
                      JSON.parse(activeGoal.milestones || '[]').map((milestone: any) => (
                        <div
                          key={milestone.id}
                          className="flex items-center justify-between p-2.5 rounded-lg border bg-accent/15 hover:bg-accent/30 transition-colors"
                        >
                          <div
                            onClick={() => toggleMilestone(milestone.id)}
                            className="flex items-center gap-3 cursor-pointer text-xs font-semibold select-none flex-1"
                          >
                            <input
                              type="checkbox"
                              className="rounded border-border cursor-pointer h-4 w-4 text-primary shrink-0"
                              checked={milestone.completed}
                              onChange={() => {}} // Controlled via parent click
                            />
                            <span className={milestone.completed ? 'line-through text-muted-foreground' : ''}>
                              {milestone.title}
                            </span>
                          </div>
                          <button
                            onClick={() => deleteMilestone(milestone.id)}
                            className="text-muted-foreground hover:text-destructive p-1 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex items-center justify-center p-10 bg-card border rounded-xl text-center text-muted-foreground text-xs">
              يرجى اختيار هدف أكاديمي من القائمة أو إضافة هدف لعرض التفاصيل.
            </div>
          )}
        </div>
      </div>

      {/* Grades Registry Log Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <span>سجل المقررات المرصودة</span>
          </CardTitle>
          <CardDescription>الدرجات المسجلة في السجل الأكاديمي لحساب المعدل التراكمي</CardDescription>
        </CardHeader>
        <CardContent>
          {grades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Award className="h-10 w-10 opacity-30 mb-2" />
              <p className="text-xs">لم يتم رصد أي مقررات أو درجات أكاديمية بعد.</p>
              <Button onClick={() => setGradeModalOpen(true)} className="mt-3 gap-1.5" size="sm">
                <Plus className="h-4 w-4" /> رصد أول مقرر دراسي
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المقرر</TableHead>
                  <TableHead>الفصل الدراسي</TableHead>
                  <TableHead>الساعات المعتمدة</TableHead>
                  <TableHead>الدرجة (من 4.0)</TableHead>
                  <TableHead className="text-left">العمليات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map(g => {
                  const course = courses.find(c => c.id === g.course_id)
                  return (
                    <TableRow key={g.id}>
                      <TableCell className="font-bold">
                        {course ? `${course.name} (${course.code})` : 'مقرر مستقر'}
                      </TableCell>
                      <TableCell>{g.semester}</TableCell>
                      <TableCell>{g.credit_hours} ساعات</TableCell>
                      <TableCell className="font-mono font-bold text-primary">{g.grade_value.toFixed(2)}</TableCell>
                      <TableCell className="text-left">
                        <Button size="sm" variant="ghost" className="text-destructive p-1" onClick={() => handleDeleteGrade(g.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Grade Predictor Card */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary animate-pulse" />
              <span>حاسبة المعدل المتوقع ومحاكي الدرجات (Grade Predictor) 🎓</span>
            </CardTitle>
            <CardDescription>أدخل توزيع أوزان درجات موادك (مثال: نصفي 30%، نهائي 50%) لمعرفة توقعات معدلك التراكمي</CardDescription>
          </div>
          <div className="w-56">
            <Select value={predCourseId} onChange={e => setPredCourseId(e.target.value)}>
              <option value="">اختر المقرّر...</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {predCourseId ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form and list */}
              <div className="lg:col-span-2 space-y-4">
                <form onSubmit={handleSaveGradeInput} className="grid grid-cols-4 gap-3 bg-muted/20 p-3 rounded-xl border items-end">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground">التقييم (مثال: Midterm)</label>
                    <Input required placeholder="نصفي، واجب، نهائي..." value={newComp} onChange={e => setNewComp(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground">الوزن الكلي (%)</label>
                    <Input type="number" required placeholder="مثال: 30" value={newWeight} onChange={e => setNewWeight(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground">الدرجة الحاصل عليها</label>
                    <Input type="number" step="0.1" required placeholder="مثال: 28" value={newScore} onChange={e => setNewScore(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground">الدرجة الكبرى للتقييم</label>
                    <Input type="number" required placeholder="مثال: 30" value={newMax} onChange={e => setNewMax(e.target.value)} />
                  </div>
                  <Button type="submit" className="col-span-4 mt-2 font-bold" size="sm">إضافة عنصر الدرجة</Button>
                </form>

                {/* Elements list */}
                {predInputs.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">لم يتم إضافة تقييمات لهذا المقرر بعد. ابدأ بإدخالها بالأعلى.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>التقييم</TableHead>
                        <TableHead>الوزن</TableHead>
                        <TableHead>الدرجة المستحقة</TableHead>
                        <TableHead>النسبة الحاصل عليها</TableHead>
                        <TableHead className="text-left">العمليات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {predInputs.map(input => {
                        const pct = input.max_score > 0 ? (input.score / input.max_score) * 100 : 0
                        const contrib = (input.score / input.max_score) * input.weight
                        return (
                          <TableRow key={input.id}>
                            <TableCell className="font-bold text-xs">{input.component}</TableCell>
                            <TableCell className="text-xs">{input.weight}%</TableCell>
                            <TableCell className="text-xs font-mono">{input.score} / {input.max_score}</TableCell>
                            <TableCell className="text-xs font-mono font-bold text-primary">{contrib.toFixed(1)}% من {input.weight}%</TableCell>
                            <TableCell className="text-left">
                              <Button size="sm" variant="ghost" className="text-destructive p-1" onClick={() => handleDeleteGradeInput(input.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Prediction results */}
              <div className="lg:col-span-1 border rounded-xl p-4 bg-muted/10 space-y-4 flex flex-col justify-center text-center">
                {(() => {
                  const totalWeight = predInputs.reduce((sum, i) => sum + i.weight, 0)
                  const totalEarned = predInputs.reduce((sum, i) => sum + ((i.score / i.max_score) * i.weight), 0)
                  const normalizedPct = totalWeight > 0 ? (totalEarned / totalWeight) * 100 : 0
                  const prediction = getGpaLetter(normalizedPct)

                  return (
                    <>
                      <div>
                        <span className="text-xs font-bold text-muted-foreground">مجموع أوزان التقييمات المدخلة</span>
                        <p className="text-2xl font-black text-foreground">{totalWeight}% من 100%</p>
                      </div>
                      <div className="border-t pt-3">
                        <span className="text-xs font-bold text-muted-foreground">النسبة المكتسبة التقديرية</span>
                        <p className="text-3xl font-black text-primary">{totalEarned.toFixed(1)}%</p>
                      </div>
                      <div className="border-t pt-3">
                        <span className="text-xs font-bold text-muted-foreground">الدرجة والـ GPA المتوقع</span>
                        <p className={`text-xl font-black ${prediction.color} mt-1`}>{prediction.letter}</p>
                        <p className="text-xs font-black text-muted-foreground mt-1">النقاط المقابلة: {prediction.gpa.toFixed(2)}</p>
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground text-xs">
              يرجى تحديد مقرر دراسي من القائمة المنسدلة بالأعلى للبدء في تتبع درجاتك الفردية ومحاكاتها.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Goal Add Modal */}
      <Dialog open={goalModalOpen} onOpenChange={setGoalModalOpen}>
        <DialogHeader>
          <DialogTitle>إضافة هدف أكاديمي جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAddGoal}>
          <DialogContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold">عنوان الهدف *</label>
              <Input
                required
                value={newGoal.title}
                onChange={e => setNewGoal({ ...newGoal, title: e.target.value })}
                placeholder="مثال: الحصول على معدل امتياز"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold">المعدل المستهدف (من 4.0) *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.0"
                  max="4.0"
                  required
                  value={newGoal.targetGpa}
                  onChange={e => setNewGoal({ ...newGoal, targetGpa: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold">تاريخ الانتهاء</label>
                <Input
                  type="date"
                  value={newGoal.deadline}
                  onChange={e => setNewGoal({ ...newGoal, deadline: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold">مراحل تحقيق الهدف (اكتب كل مرحلة في سطر جديد)</label>
              <Textarea
                rows={4}
                value={newGoal.milestones}
                onChange={e => setNewGoal({ ...newGoal, milestones: e.target.value })}
                placeholder="المرحلة الأولى: التحضير للامتحانات مبكراً&#10;المرحلة الثانية: حل جميع الأسئلة السابقة&#10;المرحلة الثالثة: حضور جميع المحاضرات"
              />
            </div>
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setGoalModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit">حفظ الهدف</Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Grade Add Modal */}
      <Dialog open={gradeModalOpen} onOpenChange={setGradeModalOpen}>
        <DialogHeader>
          <DialogTitle>رصد مادة دراسية في السجل الأكاديمي</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAddGrade}>
          <DialogContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold">المقرر الدراسي *</label>
                <Select
                  required
                  value={newGrade.courseId}
                  onChange={e => setNewGrade({ ...newGrade, courseId: e.target.value })}
                >
                  <option value="">اختر مادة...</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold">الفصل الدراسي *</label>
                <Input
                  required
                  value={newGrade.semester}
                  onChange={e => setNewGrade({ ...newGrade, semester: e.target.value })}
                  placeholder="مثال: خريف 2026 أو الفصل الأول"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold">الدرجة المرصودة (GPA من 4.0) *</label>
                <Select
                  value={newGrade.gradeValue}
                  onChange={e => setNewGrade({ ...newGrade, gradeValue: e.target.value })}
                >
                  <option value="4.00">A+ ممتاز مرتفع (4.00)</option>
                  <option value="3.75">A ممتاز (3.75)</option>
                  <option value="3.50">B+ جيد جداً مرتفع (3.50)</option>
                  <option value="3.00">B جيد جداً (3.00)</option>
                  <option value="2.50">C+ جيد مرتفع (2.50)</option>
                  <option value="2.00">C جيد (2.00)</option>
                  <option value="1.50">D+ مقبول مرتفع (1.50)</option>
                  <option value="1.00">D مقبول (1.00)</option>
                  <option value="0.00">F راسب (0.00)</option>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold">عدد الساعات المعتمدة *</label>
                <Select
                  value={newGrade.creditHours}
                  onChange={e => setNewGrade({ ...newGrade, creditHours: e.target.value })}
                >
                  <option value="1">1 ساعة</option>
                  <option value="2">2 ساعتين</option>
                  <option value="3">3 ساعات</option>
                  <option value="4">4 ساعات</option>
                  <option value="5">5 ساعات</option>
                </Select>
              </div>
            </div>
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setGradeModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" onClick={handleAddGrade}>رصد الدرجة</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  )
}
