import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAppStore } from '@/store/useAppStore'
import {
  GraduationCap,
  Plus,
  Trash2,
  ExternalLink,
  BookOpen,
  CheckSquare,
  Square,
  PlayCircle,
  Award,
  Link,
  Clock,
  Sparkles,
  BookMarked,
  Search,
  CheckCircle2,
  ChevronLeft,
  Bot,
  Send,
  HelpCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react'

interface Lesson {
  id: string
  title: string
  duration?: string
  completed: boolean
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface QuizQuestion {
  question: string
  options: string[]
  answerIndex: number // 0-3
  explanation?: string
}

interface SelfStudyTrack {
  id: string
  title: string
  platform: string
  url?: string
  notes?: string
  color: string
  status: 'not_started' | 'in_progress' | 'completed'
  lessons: Lesson[]
  created_at: string
  tutorChatHistory?: ChatMessage[]
}

const PRESETS_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#06b6d4'  // cyan
]

export function SelfStudyPage() {
  const { setActivePage } = useAppStore()
  
  const [tracks, setTracks] = React.useState<SelfStudyTrack[]>([])
  const [selectedTrackId, setSelectedTrackId] = React.useState<string | null>(null)
  
  // AI Config settings
  const [aiProvider, setAiProvider] = React.useState('gemini')
  const [aiModel, setAiModel] = React.useState('gemini-1.5-flash')

  // Create Track Form State
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [createActiveTab, setCreateActiveTab] = React.useState('manual')
  const [newTitle, setNewTitle] = React.useState('')
  const [newPlatform, setNewPlatform] = React.useState('')
  const [newUrl, setNewUrl] = React.useState('')
  const [newNotes, setNewNotes] = React.useState('')
  const [newColor, setNewColor] = React.useState(PRESETS_COLORS[0])
  const [bulkLessonsText, setBulkLessonsText] = React.useState('') // line by line

  // AI Roadmap Generator State
  const [aiTopic, setAiTopic] = React.useState('')
  const [aiPlatform, setAiPlatform] = React.useState('')
  const [aiLevel, setAiLevel] = React.useState('beginner') // beginner, intermediate, advanced
  const [aiLessonsCount, setAiLessonsCount] = React.useState(10)
  const [aiGeneratingRoadmap, setAiGeneratingRoadmap] = React.useState(false)

  // AI Tutor Pane State
  const [isTutorOpen, setIsTutorOpen] = React.useState(false)
  const [tutorInput, setTutorInput] = React.useState('')
  const [tutorLoading, setTutorLoading] = React.useState(false)

  // AI Quiz State
  const [activeQuizLessonId, setActiveQuizLessonId] = React.useState<string | null>(null)
  const [quizQuestion, setQuizQuestion] = React.useState<QuizQuestion | null>(null)
  const [quizLoading, setQuizLoading] = React.useState(false)
  const [selectedAnswerIdx, setSelectedAnswerIdx] = React.useState<number | null>(null)
  const [isQuizSubmitted, setIsQuizSubmitted] = React.useState(false)

  // Add Lesson Form State
  const [tempLessonTitle, setTempLessonTitle] = React.useState('')
  const [tempLessonDuration, setTempLessonDuration] = React.useState('')

  // Search filter
  const [searchQuery, setSearchQuery] = React.useState('')

  const activeTrack = tracks.find(t => t.id === selectedTrackId)

  // Load tracks and AI settings on mount
  React.useEffect(() => {
    const loadData = async () => {
      try {
        if (window.electronAPI && window.electronAPI.settings) {
          const saved = await window.electronAPI.settings.get('selfStudyTracks')
          if (saved && Array.isArray(saved)) {
            setTracks(saved)
            if (saved.length > 0) {
              setSelectedTrackId(saved[0].id)
            }
          }
          const provider = await window.electronAPI.settings.get('settings.ai.provider')
          if (provider) setAiProvider(provider)
          const model = await window.electronAPI.settings.get('settings.ai.model')
          if (model) setAiModel(model)
        }
      } catch (err) {
        console.error('Failed to load initial settings data', err)
      }
    }
    loadData()
  }, [])

  // Save tracks helper
  const saveTracksToStore = async (updated: SelfStudyTrack[]) => {
    setTracks(updated)
    try {
      if (window.electronAPI && window.electronAPI.settings) {
        await window.electronAPI.settings.set('selfStudyTracks', updated)
      }
    } catch (err) {
      console.error('Failed to save self-study tracks', err)
    }
  }

  // Calculate stats
  const stats = React.useMemo(() => {
    const total = tracks.length
    const inProgress = tracks.filter(t => t.status === 'in_progress').length
    const completed = tracks.filter(t => t.status === 'completed').length
    
    let totalLessons = 0
    let completedLessons = 0
    tracks.forEach(t => {
      totalLessons += t.lessons.length
      completedLessons += t.lessons.filter(l => l.completed).length
    })

    return { total, inProgress, completed, totalLessons, completedLessons }
  }, [tracks])

  // Handle Create Track (Manual)
  const handleCreateTrack = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    const parsedLessons: Lesson[] = bulkLessonsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => ({
        id: crypto.randomUUID(),
        title: line,
        completed: false
      }))

    const newTrack: SelfStudyTrack = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      platform: newPlatform.trim() || 'دراسة ذاتية حرة',
      url: newUrl.trim() || undefined,
      notes: newNotes.trim() || undefined,
      color: newColor,
      status: parsedLessons.length > 0 ? 'in_progress' : 'not_started',
      lessons: parsedLessons,
      created_at: new Date().toISOString(),
      tutorChatHistory: []
    }

    const updated = [newTrack, ...tracks]
    await saveTracksToStore(updated)
    setSelectedTrackId(newTrack.id)

    // Reset Form
    setNewTitle('')
    setNewPlatform('')
    setNewUrl('')
    setNewNotes('')
    setNewColor(PRESETS_COLORS[0])
    setBulkLessonsText('')
    setIsCreateOpen(false)
  }

  // Handle Generate Track (AI Roadmap)
  const handleGenerateRoadmapAI = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!aiTopic.trim() || aiGeneratingRoadmap) return

    setAiGeneratingRoadmap(true)
    const platformStr = aiPlatform.trim() || 'منصات ومواقع دراسية'
    const levelTranslation: Record<string, string> = {
      beginner: 'مبتدئ (شرح المفاهيم من الصفر)',
      intermediate: 'متوسط (شرح مع تطبيقات عملية)',
      advanced: 'متقدم (مواضيع عميقة ومشاريع معقدة)'
    }

    const prompt = `أنت خبير تعليمي وتطوير ذاتي متميز. أريد دراسة مسار تعليمي مكثف حول: "${aiTopic.trim()}"
المنصة أو المصدر المستهدف: "${platformStr}"
مستوى الخبرة المطلوبة للمسار: "${levelTranslation[aiLevel] || aiLevel}"
الهدف: تقسيم هذا المسار إلى خطة تعليمية مقسمة لـ ${aiLessonsCount} فصلاً أو درساً مرتبين ترتيباً منطقياً.

المطلوب: إرجاع قائمة الفصول/الدروس كـ JSON Array صالحة ومباشرة فقط، بدون أي كلام تمهيدي أو نصوص إضافية أو علامات Markdown، فقط الكود كما يلي:
[
  "مقدمة وتعريف بـ...",
  "الدرس الثاني...",
  "الدرس الثالث..."
]`;

    try {
      const response = await window.electronAPI.ai.chat({
        provider: aiProvider,
        model: aiModel,
        systemPrompt: 'أنت مهندس تعليمي وخبير في تصميم المناهج الدراسية، ترجع المناهج دائماً كـ JSON array صالحة فقط.',
        messages: [{ role: 'user', content: prompt }]
      })

      // Parse JSON from codeblock or raw response
      const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim()
      const parsedLessonsList = JSON.parse(cleanJson) as string[]

      const generatedLessons: Lesson[] = parsedLessonsList.map(title => ({
        id: crypto.randomUUID(),
        title,
        completed: false
      }))

      const newTrack: SelfStudyTrack = {
        id: crypto.randomUUID(),
        title: aiTopic.trim(),
        platform: platformStr,
        notes: `مسار تعليمي ذكي تم توليده بالذكاء الاصطناعي لمستوى: ${levelTranslation[aiLevel] || aiLevel}.`,
        color: newColor,
        status: 'in_progress',
        lessons: generatedLessons,
        created_at: new Date().toISOString(),
        tutorChatHistory: [
          { role: 'assistant', content: `مرحباً بك! لقد قمت بتوليد مسار دراسي متكامل من ${generatedLessons.length} درساً حول موضوع "${aiTopic.trim()}". سأكون معلمك الخاص في هذا المسار، يمكنك سؤالي عن أي درس أو مفهوم هنا!` }
        ]
      }

      const updated = [newTrack, ...tracks]
      await saveTracksToStore(updated)
      setSelectedTrackId(newTrack.id)
      setIsTutorOpen(true) // Open Tutor chat automatically for the generated track

      // Reset
      setAiTopic('')
      setAiPlatform('')
      setAiLevel('beginner')
      setAiLessonsCount(10)
      setIsCreateOpen(false)
    } catch (err: any) {
      console.error(err)
      alert('فشل توليد المسار بالذكاء الاصطناعي. يرجى التحقق من إعدادات المفاتيح والاتصال.')
    } finally {
      setAiGeneratingRoadmap(false)
    }
  }

  // Handle Delete Track
  const handleDeleteTrack = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('هل أنت متأكد من حذف هذا المسار التعليمي وكل محتوياته؟')) return
    const updated = tracks.filter(t => t.id !== id)
    await saveTracksToStore(updated)
    if (selectedTrackId === id) {
      setSelectedTrackId(updated.length > 0 ? updated[0].id : null)
    }
  }

  // Handle Toggle Lesson Completion
  const handleToggleLesson = async (trackId: string, lessonId: string) => {
    const updated = tracks.map(t => {
      if (t.id === trackId) {
        const updatedLessons = t.lessons.map(l => 
          l.id === lessonId ? { ...l, completed: !l.completed } : l
        )
        const completedCount = updatedLessons.filter(l => l.completed).length
        let status: SelfStudyTrack['status'] = t.status
        if (updatedLessons.length > 0) {
          if (completedCount === updatedLessons.length) {
            status = 'completed'
          } else if (completedCount > 0) {
            status = 'in_progress'
          } else {
            status = 'not_started'
          }
        }
        return { ...t, lessons: updatedLessons, status }
      }
      return t
    })
    await saveTracksToStore(updated)
  }

  // Add Single Lesson to Active Track
  const handleAddLesson = async () => {
    if (!selectedTrackId || !tempLessonTitle.trim()) return
    
    const newLesson: Lesson = {
      id: crypto.randomUUID(),
      title: tempLessonTitle.trim(),
      duration: tempLessonDuration.trim() || undefined,
      completed: false
    }

    const updated = tracks.map(t => {
      if (t.id === selectedTrackId) {
        const updatedLessons = [...t.lessons, newLesson]
        const completedCount = updatedLessons.filter(l => l.completed).length
        const status: SelfStudyTrack['status'] = completedCount === updatedLessons.length ? 'completed' : 'in_progress'
        return { ...t, lessons: updatedLessons, status }
      }
      return t
    })

    await saveTracksToStore(updated)
    setTempLessonTitle('')
    setTempLessonDuration('')
  }

  // Delete Lesson from Active Track
  const handleDeleteLesson = async (lessonId: string) => {
    if (!selectedTrackId) return
    const updated = tracks.map(t => {
      if (t.id === selectedTrackId) {
        const updatedLessons = t.lessons.filter(l => l.id !== lessonId)
        const completedCount = updatedLessons.filter(l => l.completed).length
        let status: SelfStudyTrack['status'] = t.status
        if (updatedLessons.length > 0) {
          status = completedCount === updatedLessons.length ? 'completed' : 'in_progress'
        } else {
          status = 'not_started'
        }
        return { ...t, lessons: updatedLessons, status }
      }
      return t
    })
    await saveTracksToStore(updated)
  }

  // Update Notes for active track
  const handleUpdateNotes = async (text: string) => {
    if (!selectedTrackId) return
    const updated = tracks.map(t => 
      t.id === selectedTrackId ? { ...t, notes: text } : t
    )
    setTracks(updated)
    try {
      if (window.electronAPI && window.electronAPI.settings) {
        await window.electronAPI.settings.set('selfStudyTracks', updated)
      }
    } catch (e) {}
  }

  // Send message to AI Tutor
  const handleSendToTutor = async (e?: React.FormEvent, customMsg?: string) => {
    if (e) e.preventDefault()
    const textToSend = customMsg || tutorInput.trim()
    if (!textToSend || !selectedTrackId || !activeTrack || tutorLoading) return

    const currentHistory = activeTrack.tutorChatHistory || []
    const updatedHistory: ChatMessage[] = [...currentHistory, { role: 'user', content: textToSend }]

    // Optimistically update UI
    const tempTracks = tracks.map(t => 
      t.id === selectedTrackId ? { ...t, tutorChatHistory: updatedHistory } : t
    )
    setTracks(tempTracks)
    setTutorInput('')
    setTutorLoading(true)

    const systemPrompt = `أنت معلم وأستاذ ذكي خاص بموضوع التعلم الحر: "${activeTrack.title}" على منصة "${activeTrack.platform}". 
مهمتك شرح وتبسيط المفاهيم، الإجابة على أسئلة الطالب، إعطاء أمثلة توضيحية وشفرات برمجية واضحة إن لزم الأمر.
أجب دائماً باللغة العربية الفصحى وبشكل منسق ومنظم وبأعلى دقة أكاديمية ممكنة.`;

    try {
      const response = await window.electronAPI.ai.chat({
        provider: aiProvider,
        model: aiModel,
        systemPrompt,
        messages: updatedHistory
      })

      const finalHistory: ChatMessage[] = [...updatedHistory, { role: 'assistant', content: response }]
      const finalTracks = tracks.map(t => 
        t.id === selectedTrackId ? { ...t, tutorChatHistory: finalHistory } : t
      )
      await saveTracksToStore(finalTracks)
    } catch (err: any) {
      console.error(err)
      alert('فشل الحصول على إجابة من المعلم الذكي. يرجى التحقق من اتصال الإنترنت.')
    } finally {
      setTutorLoading(false)
    }
  }

  // Clear Tutor Chat history
  const handleClearTutorChat = async () => {
    if (!selectedTrackId || !confirm('هل تريد مسح سجل المحادثات مع هذا المعلم؟')) return
    const updated = tracks.map(t => 
      t.id === selectedTrackId ? { ...t, tutorChatHistory: [] } : t
    )
    await saveTracksToStore(updated)
  }

  // Generate Lesson Quiz
  const handleGenerateQuiz = async (lesson: Lesson) => {
    if (!activeTrack || quizLoading) return
    setActiveQuizLessonId(lesson.id)
    setQuizQuestion(null)
    setSelectedAnswerIdx(null)
    setIsQuizSubmitted(false)
    setQuizLoading(true)

    const prompt = `أنت معلم ذكي ومصمم اختبارات. أريد توليد سؤال اختيار من متعدد (MCQ) لقياس فهمي لدرس: "${lesson.title}" ضمن كورس: "${activeTrack.title}".
تأكد من صياغة السؤال والخيارات باللغة العربية الفصحى بشكل دقيق.

أرجع لي السؤال بتنسيق JSON حصرياً وصالح للاستعمال كما يلي، ولا تكتب أي نص تمهيدي أو Markdown blocks:
{
  "question": "السؤال هنا؟",
  "options": [
    "الخيار الأول",
    "الخيار الثاني",
    "الخيار الثالث",
    "الخيار الرابع"
  ],
  "answerIndex": 0,
  "explanation": "شرح مبسط للإجابة الصحيحة وسبب اختيارها."
}`;

    try {
      const response = await window.electronAPI.ai.chat({
        provider: aiProvider,
        model: aiModel,
        systemPrompt: 'أنت مصمم اختبارات ذكي، ترجع الأسئلة دائماً بصيغة JSON صالحة ومطابقة للهيكل المطلوب.',
        messages: [{ role: 'user', content: prompt }]
      })

      const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim()
      const parsedQuiz = JSON.parse(cleanJson) as QuizQuestion
      setQuizQuestion(parsedQuiz)
    } catch (err: any) {
      console.error(err)
      alert('فشل توليد السؤال. يرجى التحقق من الإعدادات والاتصال بالإنترنت.')
      setActiveQuizLessonId(null)
    } finally {
      setQuizLoading(false)
    }
  }

  // Open external URL
  const handleOpenUrl = (url?: string) => {
    if (url && window.electronAPI && window.electronAPI.app) {
      window.electronAPI.app.openExternal(url)
    }
  }

  // Filtered tracks
  const filteredTracks = React.useMemo(() => {
    if (!searchQuery.trim()) return tracks
    const q = searchQuery.toLowerCase()
    return tracks.filter(t => 
      t.title.toLowerCase().includes(q) || 
      t.platform.toLowerCase().includes(q)
    )
  }, [tracks, searchQuery])

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto h-full overflow-y-auto scrollbar-thin select-none" dir="rtl">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-black text-foreground flex items-center gap-2.5">
            <BookMarked className="h-8 w-8 text-primary animate-pulse" />
            <span>مسارات التعلم والتطوير الذاتي الحر</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            خطط وتتبع الكورسات الخارجية والمهارات الفنية، والكتب التعليمية بشكل مستقل ومدعوم بذكاء Scholar الأكاديمي
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateOpen(true)} className="gap-1.5 font-bold text-xs">
            <Plus className="h-4 w-4" /> إضافة مسار تعليمي
          </Button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border shadow-sm bg-card/60 backdrop-blur-md">
          <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-black text-muted-foreground">إجمالي المسارات</CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-foreground">{stats.total}</div>
            <p className="text-[10px] text-muted-foreground">مسارات مضافة ومخططة</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-card/60 backdrop-blur-md">
          <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-black text-muted-foreground">قيد الدراسة والتقدم</CardTitle>
            <PlayCircle className="h-4 w-4 text-amber-500 animate-spin-slow" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-foreground">{stats.inProgress}</div>
            <p className="text-[10px] text-muted-foreground">تتطلب استمراراً يومياً</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-card/60 backdrop-blur-md">
          <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-black text-muted-foreground">مسارات تم إنجازها</CardTitle>
            <Award className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-foreground">{stats.completed}</div>
            <p className="text-[10px] text-muted-foreground">تهانينا! حققت أهدافها</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-card/60 backdrop-blur-md">
          <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-black text-muted-foreground">إجمالي الدروس المنجزة</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-foreground">
              {stats.completedLessons} <span className="text-sm font-bold text-muted-foreground">/ {stats.totalLessons}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              معدل إنجاز {stats.totalLessons > 0 ? Math.round((stats.completedLessons / stats.totalLessons) * 100) : 0}% من المحتوى
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Tracks List Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border shadow-xs">
            <CardHeader className="p-3 border-b">
              <div className="relative">
                <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ابحث في مساراتك..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pr-8 text-xs font-bold"
                />
              </div>
            </CardHeader>
            <CardContent className="p-2 space-y-1.5 max-h-[550px] overflow-y-auto scrollbar-thin">
              {filteredTracks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-xs font-bold">
                  لا توجد مسارات مطابقة
                </div>
              ) : (
                filteredTracks.map(track => {
                  const completedLessons = track.lessons.filter(l => l.completed).length
                  const progressPct = track.lessons.length > 0 ? Math.round((completedLessons / track.lessons.length) * 100) : 0
                  const isSelected = track.id === selectedTrackId

                  return (
                    <div
                      key={track.id}
                      onClick={() => setSelectedTrackId(track.id)}
                      className={`p-3 rounded-xl border text-right cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-sm scale-102 font-bold'
                          : 'bg-card hover:bg-accent/40 border-border'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: track.color }} />
                        <Badge variant="secondary" className="text-[8px] px-1 py-0 border-none font-black bg-muted/60">
                          {track.platform}
                        </Badge>
                      </div>
                      <h4 className="text-xs truncate font-black mt-2">{track.title}</h4>
                      
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-[9px] text-muted-foreground">
                          <span>تقدم: {progressPct}%</span>
                          <span>{completedLessons} / {track.lessons.length} درس</span>
                        </div>
                        <Progress value={progressPct} className="h-1.5" style={{ '--progress-background': track.color } as any} />
                      </div>

                      <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-border/40">
                        <span className="text-[9px] text-muted-foreground">
                          {new Date(track.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                        </span>
                        <button
                          onClick={(e) => handleDeleteTrack(track.id, e)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Selected Track Details Workspace */}
        <div className="lg:col-span-3 space-y-4">
          {activeTrack ? (
            <div className="space-y-4">
              
              {/* Card Summary Header */}
              <Card className="border shadow-sm overflow-hidden" style={{ borderRightWidth: '4px', borderRightColor: activeTrack.color }}>
                <CardHeader className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-muted/10 border-b border-border/40">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge className="font-black border-none text-white text-[9px] px-1.5 py-0.5" style={{ backgroundColor: activeTrack.color }}>
                        {activeTrack.platform}
                      </Badge>
                      {activeTrack.status === 'completed' ? (
                        <Badge variant="outline" className="text-[9px] font-black border-emerald-500 text-emerald-500 bg-emerald-500/5">
                          مكتمل بالكامل ✓
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] font-black border-amber-500 text-amber-500 bg-amber-500/5">
                          قيد التقدم
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-xl font-black text-foreground mt-2">{activeTrack.title}</CardTitle>
                  </div>
                  
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant={isTutorOpen ? 'default' : 'outline'}
                      className="gap-1.5 text-xs font-bold border-primary/20"
                      onClick={() => setIsTutorOpen(!isTutorOpen)}
                    >
                      <Bot className="h-3.5 w-3.5" /> المعلم المساعد الذكي
                    </Button>
                    {activeTrack.url && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs font-bold"
                        onClick={() => handleOpenUrl(activeTrack.url)}
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> المصدر
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs font-bold text-primary border-primary/20 hover:bg-primary/5"
                      onClick={() => setActivePage('focus')}
                    >
                      <Clock className="h-3.5 w-3.5" /> جلسة تركيز
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Progress Ring / Bar Panel */}
                  <div className="md:col-span-1 border-b md:border-b-0 md:border-l border-border/50 pb-4 md:pb-0 md:pl-6 flex flex-col justify-center items-center text-center space-y-3">
                    <div className="relative flex items-center justify-center h-24 w-24">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" className="text-muted/15" fill="transparent" />
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke={activeTrack.color}
                          strokeWidth="8"
                          strokeDasharray={251.2}
                          strokeDashoffset={
                            251.2 - (251.2 * (activeTrack.lessons.length > 0 ? activeTrack.lessons.filter(l => l.completed).length / activeTrack.lessons.length : 0))
                          }
                          strokeLinecap="round"
                          fill="transparent"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-lg font-black text-foreground">
                          {activeTrack.lessons.length > 0 ? Math.round((activeTrack.lessons.filter(l => l.completed).length / activeTrack.lessons.length) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-black text-foreground">التقدم العام في المسار</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        أنجزت {activeTrack.lessons.filter(l => l.completed).length} من أصل {activeTrack.lessons.length} وحدة تعليمية
                      </p>
                    </div>
                  </div>

                  {/* Notes Panel */}
                  <div className="md:col-span-2 space-y-2 flex flex-col">
                    <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span>مفكرة المسار والملاحظات السريعة:</span>
                    </h4>
                    <textarea
                      value={activeTrack.notes || ''}
                      onChange={e => handleUpdateNotes(e.target.value)}
                      placeholder="اكتب أفكارك وملاحظاتك حول هذا الكورس، خطوات الدراسة، المشاكل التي تواجهها هنا..."
                      className="w-full flex-1 min-h-[90px] p-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary text-xs leading-relaxed text-foreground"
                    />
                  </div>

                </CardContent>
              </Card>

              {/* Tutor Panel & Lessons List Side-by-Side */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Lessons checklist column (takes 2 cols if tutor is closed, else 1) */}
                <div className={isTutorOpen ? 'lg:col-span-1.5 space-y-4' : 'lg:col-span-2 space-y-4'}>
                  
                  {/* Active Quiz Card (If any) */}
                  {activeQuizLessonId && (
                    <Card className="border-2 border-primary/20 bg-primary/[0.01] overflow-hidden">
                      <CardHeader className="p-4 py-3 bg-primary/5 flex flex-row items-center justify-between">
                        <CardTitle className="text-xs font-black text-primary flex items-center gap-1.5">
                          <HelpCircle className="h-4 w-4" />
                          <span>اختبار الفهم للدرس</span>
                        </CardTitle>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setActiveQuizLessonId(null)
                            setQuizQuestion(null)
                          }}
                          className="h-7 text-muted-foreground text-[10px] font-bold"
                        >
                          إغلاق الاختبار
                        </Button>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        {quizLoading ? (
                          <div className="py-8 text-center space-y-2 flex flex-col items-center">
                            <RefreshCw className="h-6 w-6 text-primary animate-spin" />
                            <span className="text-xs font-bold text-muted-foreground">جاري توليد سؤال ذكي للدرس...</span>
                          </div>
                        ) : quizQuestion ? (
                          <div className="space-y-3">
                            <h4 className="text-xs font-black text-foreground leading-relaxed">
                              {quizQuestion.question}
                            </h4>
                            
                            <div className="grid grid-cols-1 gap-2">
                              {quizQuestion.options.map((opt, oIdx) => {
                                const isSelected = selectedAnswerIdx === oIdx
                                const isCorrect = quizQuestion.answerIndex === oIdx
                                
                                let btnStyle = 'border-border bg-card'
                                if (isQuizSubmitted) {
                                  if (isCorrect) {
                                    btnStyle = 'border-emerald-500 bg-emerald-500/10 text-emerald-600 font-bold'
                                  } else if (isSelected) {
                                    btnStyle = 'border-destructive bg-destructive/10 text-destructive font-bold'
                                  }
                                } else if (isSelected) {
                                  btnStyle = 'border-primary bg-primary/5 font-bold'
                                }

                                return (
                                  <button
                                    key={oIdx}
                                    disabled={isQuizSubmitted}
                                    onClick={() => setSelectedAnswerIdx(oIdx)}
                                    className={`w-full p-2.5 rounded-lg border text-right text-xs transition-all ${btnStyle}`}
                                  >
                                    {opt}
                                  </button>
                                )
                              })}
                            </div>

                            {isQuizSubmitted && quizQuestion.explanation && (
                              <div className="p-3 bg-muted/40 border rounded-lg text-[10px] leading-relaxed text-muted-foreground flex items-start gap-1.5">
                                <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                <span>{quizQuestion.explanation}</span>
                              </div>
                            )}

                            {!isQuizSubmitted ? (
                              <Button
                                size="sm"
                                disabled={selectedAnswerIdx === null}
                                onClick={() => setIsQuizSubmitted(true)}
                                className="w-full text-xs font-bold mt-2"
                              >
                                تأكيد الإجابة
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleGenerateQuiz(activeTrack.lessons.find(l => l.id === activeQuizLessonId)!)}
                                className="w-full text-xs font-bold mt-2 gap-1.5"
                              >
                                <RefreshCw className="h-3.5 w-3.5" /> سؤال آخر للدرس
                              </Button>
                            )}

                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  )}

                  {/* Lessons checklist */}
                  <Card className="border shadow-xs flex flex-col max-h-[460px]">
                    <CardHeader className="p-4 border-b flex justify-between items-center py-3 bg-muted/10">
                      <CardTitle className="text-xs font-black text-foreground flex items-center gap-1.5">
                        <CheckSquare className="h-4 w-4 text-primary" />
                        <span>وحدات ودروس المسار ({activeTrack.lessons.length})</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-y-auto flex-1 scrollbar-thin">
                      {activeTrack.lessons.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground text-xs font-bold p-4">
                          لا توجد دروس مضافة لهذا المسار بعد.<br/>
                          استخدم النموذج المجاور لإضافة الدروس أو الوحدات لتبدأ تتبع تقدمك.
                        </div>
                      ) : (
                        <div className="divide-y divide-border/40">
                          {activeTrack.lessons.map((lesson) => (
                            <div
                              key={lesson.id}
                              className={`flex items-center justify-between p-3 hover:bg-accent/40 transition-colors select-none ${
                                lesson.completed ? 'bg-emerald-500/[0.02]' : ''
                              }`}
                            >
                              <div
                                onClick={() => handleToggleLesson(activeTrack.id, lesson.id)}
                                className="flex items-center gap-3 flex-1 cursor-pointer"
                              >
                                {lesson.completed ? (
                                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 fill-emerald-500/10 shrink-0" />
                                ) : (
                                  <Square className="h-4.5 w-4.5 text-muted-foreground shrink-0" />
                                )}
                                <span className={`text-xs font-semibold leading-relaxed ${
                                  lesson.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                                }`}>
                                  {lesson.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                {lesson.duration && (
                                  <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                                    {lesson.duration}
                                  </span>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-[9px] px-2 font-bold text-primary border border-primary/10 hover:bg-primary/5 gap-1"
                                  onClick={() => handleGenerateQuiz(lesson)}
                                >
                                  <HelpCircle className="h-3 w-3" /> اختبار
                                </Button>
                                <button
                                  onClick={() => handleDeleteLesson(lesson.id)}
                                  className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                </div>

                {/* AI Tutor Chat Drawer (Renders if open) */}
                {isTutorOpen && (
                  <Card className="lg:col-span-1 border shadow-xs flex flex-col h-[460px] bg-card/60 backdrop-blur-md">
                    <CardHeader className="p-4 border-b flex flex-row items-center justify-between py-3 bg-primary/5">
                      <CardTitle className="text-xs font-black text-primary flex items-center gap-1.5">
                        <Bot className="h-4 w-4 shrink-0" />
                        <span>معلمك المساعد: {activeTrack.title}</span>
                      </CardTitle>
                      <div className="flex gap-1.5">
                        <button
                          onClick={handleClearTutorChat}
                          title="مسح المحادثة"
                          className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </CardHeader>
                    
                    {/* Message Log */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin text-xs">
                      {(activeTrack.tutorChatHistory || []).length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground space-y-2">
                          <Bot className="h-8 w-8 text-primary mx-auto opacity-30" />
                          <p className="font-bold text-[10px]">مرحباً! أنا معلمك الذكي لهذا الكورس.</p>
                          <p className="text-[9px] max-w-[150px] mx-auto">اسألني أي سؤال لشرح المفاهيم أو تلخيص الدروس!</p>
                        </div>
                      ) : (
                        (activeTrack.tutorChatHistory || []).map((msg, idx) => (
                          <div
                            key={idx}
                            className={`flex flex-col max-w-[85%] rounded-xl p-2.5 ${
                              msg.role === 'user'
                                ? 'bg-primary text-primary-foreground self-start mr-auto text-left'
                                : 'bg-muted text-foreground self-end ml-auto text-right'
                            }`}
                          >
                            <span className="text-[9px] font-bold opacity-60 mb-1">
                              {msg.role === 'user' ? 'أنت' : 'المعلم الذكي'}
                            </span>
                            <span className="leading-relaxed font-medium whitespace-pre-wrap">{msg.content}</span>
                          </div>
                        ))
                      )}
                      
                      {tutorLoading && (
                        <div className="flex flex-col max-w-[85%] rounded-xl p-2.5 bg-muted text-foreground self-end ml-auto text-right">
                          <span className="text-[9px] font-bold opacity-60 mb-1">المعلم الذكي</span>
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 bg-primary rounded-full animate-bounce" />
                            <span className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                            <span className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Quick suggestion prompt chips */}
                    <div className="px-3 py-1.5 border-t border-border/40 bg-muted/20 flex flex-wrap gap-1">
                      <button
                        onClick={() => handleSendToTutor(undefined, 'شرح الدرس الحالي القادم لي بمفهوم مبسط')}
                        className="text-[9px] bg-card hover:bg-accent border px-2 py-0.5 rounded-full font-bold text-muted-foreground"
                      >
                        💡 شرح درس مبسط
                      </button>
                      <button
                        onClick={() => handleSendToTutor(undefined, 'ما هي المفاهيم الأساسية التي يجب أن أتقنها في هذا الكورس؟')}
                        className="text-[9px] bg-card hover:bg-accent border px-2 py-0.5 rounded-full font-bold text-muted-foreground"
                      >
                        🧭 المفاهيم الأساسية
                      </button>
                      <button
                        onClick={() => handleSendToTutor(undefined, 'اقترح لي مصادر وكتب خارجية ممتازة لتعميق فهمي')}
                        className="text-[9px] bg-card hover:bg-accent border px-2 py-0.5 rounded-full font-bold text-muted-foreground"
                      >
                        📚 مصادر إضافية
                      </button>
                    </div>

                    {/* Input form */}
                    <form onSubmit={handleSendToTutor} className="p-2 border-t border-border flex gap-1.5">
                      <Input
                        value={tutorInput}
                        onChange={e => setTutorInput(e.target.value)}
                        placeholder="اسأل معلم الكورس هنا..."
                        className="text-xs h-9 font-bold"
                        disabled={tutorLoading}
                      />
                      <Button type="submit" disabled={tutorLoading} size="sm" className="h-9 px-3">
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    </form>
                  </Card>
                )}

                {/* Add Lesson / Options Panel (takes 1 col) */}
                <div className="space-y-4">
                  
                  {/* Manual Single Lesson Card */}
                  <Card className="border shadow-xs h-fit">
                    <CardHeader className="p-4 border-b">
                      <CardTitle className="text-xs font-black text-foreground">إضافة درس فردي</CardTitle>
                      <CardDescription className="text-[10px] text-muted-foreground">أدخل تفاصيل الدرس لإدراجه في القائمة</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-muted-foreground">عنوان الدرس / الوحدة</label>
                        <Input
                          placeholder="مثال: مقدمة في React Hooks"
                          value={tempLessonTitle}
                          onChange={e => setTempLessonTitle(e.target.value)}
                          className="text-xs font-bold"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-muted-foreground">المدة / حجم الدرس (اختياري)</label>
                        <Input
                          placeholder="مثال: 15 دقيقة، الفصل الأول"
                          value={tempLessonDuration}
                          onChange={e => setTempLessonDuration(e.target.value)}
                          className="text-xs font-bold"
                        />
                      </div>
                      <Button onClick={handleAddLesson} className="w-full text-xs font-bold py-4">
                        إدراج الدرس بالقائمة
                      </Button>
                    </CardContent>
                  </Card>

                </div>

              </div>

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 bg-card border rounded-xl text-center text-muted-foreground p-6 min-h-[500px]">
              <BookMarked className="h-16 w-16 opacity-30 mb-4 text-primary animate-bounce" />
              <h3 className="text-lg font-bold">لا يوجد أي مسار دراسي محدد</h3>
              <p className="text-xs max-w-xs mt-2 leading-relaxed">
                ابدأ بتخطيط وتنظيم مسارات التعلم الحر الخارجية (كورسات Udemy، قوائم تشغيل YouTube، كتب متخصصة) يدوياً أو بواسطة توليدها بذكاء Scholar الاصطناعي.
              </p>
              <Button onClick={() => setIsCreateOpen(true)} className="mt-5 gap-1.5 font-bold" size="sm">
                <Plus className="h-4 w-4" /> أضف أول مسار دراسي الآن
              </Button>
            </div>
          )}
        </div>

      </div>

      {/* Create Track Dialog with Tabs (Manual vs AI Roadmap) */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-foreground flex items-center gap-1.5">
              <Plus className="h-5 w-5 text-primary" />
              <span>إنشاء مسار تعليمي جديد</span>
            </DialogTitle>
          </DialogHeader>
          
          <Tabs value={createActiveTab} defaultValue="manual" onValueChange={setCreateActiveTab} className="py-2">
            <TabsList className="grid grid-cols-2 w-full mb-3">
              <TabsTrigger value="manual" className="text-xs font-bold">إدخال يدوي</TabsTrigger>
              <TabsTrigger value="ai" className="text-xs font-bold flex gap-1 items-center">
                <Sparkles className="h-3 w-3 text-violet-500 animate-pulse" /> توليد بالذكاء الاصطناعي
              </TabsTrigger>
            </TabsList>

            {/* Manual Form */}
            <TabsContent value="manual">
              <form onSubmit={handleCreateTrack} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-muted-foreground">اسم المسار / الكورس</label>
                  <Input
                    placeholder="مثال: تعلم أساسيات علم البيانات"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    required
                    className="text-xs font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-muted-foreground">المنصة / المصدر</label>
                    <Input
                      placeholder="مثال: Udemy، كتاب ورقي، YouTube"
                      value={newPlatform}
                      onChange={e => setNewPlatform(e.target.value)}
                      className="text-xs font-bold"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-black text-muted-foreground">رابط الكورس (اختياري)</label>
                    <Input
                      placeholder="https://..."
                      value={newUrl}
                      onChange={e => setNewUrl(e.target.value)}
                      className="text-xs font-bold font-mono text-left"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Bulk Insert Lessons */}
                <div className="space-y-1">
                  <label className="text-xs font-black text-muted-foreground flex justify-between">
                    <span>قائمة الدروس الأولية (اختياري)</span>
                    <span className="text-[10px] text-muted-foreground">أدخل درس في كل سطر</span>
                  </label>
                  <textarea
                    placeholder="مقدمة في المسار&#10;شرح البنية الأساسية&#10;الفصل الأول: المفاهيم التقنية&#10;تطبيق عملي"
                    value={bulkLessonsText}
                    onChange={e => setBulkLessonsText(e.target.value)}
                    className="w-full min-h-[90px] p-2 rounded-md border border-input bg-transparent text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-muted-foreground">اختر لوناً مميزاً للمسار</label>
                  <div className="flex gap-2.5">
                    {PRESETS_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewColor(color)}
                        className={`h-7 w-7 rounded-full transition-all ${
                          newColor === color
                            ? 'ring-2 ring-primary ring-offset-2 scale-110'
                            : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <DialogFooter className="gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="text-xs font-bold">
                    إلغاء
                  </Button>
                  <Button type="submit" className="text-xs font-bold">
                    إنشاء المسار
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>

            {/* AI Generator Form */}
            <TabsContent value="ai">
              <form onSubmit={handleGenerateRoadmapAI} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-muted-foreground">ماذا تريد أن تتعلم؟ (الموضوع بالتفصيل)</label>
                  <Input
                    placeholder="مثال: أساسيات تعلم الآلة، أو تصميم الواجهات Figma"
                    value={aiTopic}
                    onChange={e => setAiTopic(e.target.value)}
                    required
                    className="text-xs font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-muted-foreground">المنصة المستهدفة</label>
                    <Input
                      placeholder="مثال: Coursera، YouTube"
                      value={aiPlatform}
                      onChange={e => setAiPlatform(e.target.value)}
                      className="text-xs font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-muted-foreground">مستوى المنهج المطلوب</label>
                    <select
                      value={aiLevel}
                      onChange={e => setAiLevel(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-transparent px-2 text-xs font-bold shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="beginner" className="bg-card text-foreground">مبتدئ (شرح من الصفر)</option>
                      <option value="intermediate" className="bg-card text-foreground">متوسط (تطبيقي ومشاريع)</option>
                      <option value="advanced" className="bg-card text-foreground">متقدم (عميق واحترافي)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 items-end">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-muted-foreground">عدد الدروس المقترح لتوليدها</label>
                    <Input
                      type="number"
                      min={3}
                      max={30}
                      value={aiLessonsCount}
                      onChange={e => setAiLessonsCount(parseInt(e.target.value) || 10)}
                      className="text-xs font-bold text-center"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-muted-foreground">لون المجلد التعبيري</label>
                    <div className="flex gap-2">
                      {PRESETS_COLORS.slice(0, 4).map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewColor(color)}
                          className={`h-6 w-6 rounded-full transition-all ${
                            newColor === color ? 'ring-2 ring-primary ring-offset-1 scale-105' : ''
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <DialogFooter className="gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="text-xs font-bold">
                    إلغاء
                  </Button>
                  <Button type="submit" disabled={aiGeneratingRoadmap} className="text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white">
                    {aiGeneratingRoadmap ? (
                      <>
                        <RefreshCw className="ml-1.5 h-3.5 w-3.5 animate-spin" /> جاري التوليد...
                      </>
                    ) : (
                      <>
                        <Sparkles className="ml-1.5 h-3.5 w-3.5" /> توليد المنهج الدراسي 🚀
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

    </div>
  )
}
