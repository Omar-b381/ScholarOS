import * as React from 'react'
import { useAppStore, ChatSession, Course, MindMap, WikiPage } from '@/store/useAppStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Transformer } from 'markmap-lib'
import { Markmap } from 'markmap-view'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  Bot,
  MessageSquare,
  Network,
  Layers,
  Send,
  Trash2,
  Paperclip,
  Copy,
  RotateCcw,
  Download,
  Plus,
  RefreshCw,
  Award,
  BookOpen,
  ArrowRight,
  BookOpenCheck,
  Check,
  Zap,
  CalendarDays,
  FileText
} from 'lucide-react'

const SYSTEM_PROMPT_TEMPLATE = `أنت مساعد دراسي ذكي وأكاديمي متفوق في تطبيق ScholarOS. 
ساعد الطالب في الإجابة عن أسئلته العلمية، وتنظيم وقته، وفهم الموضوعات الصعبة.
معلومات الطالب الحالية لتقديم سياق مناسب له:
- التخصص: {major}
- الجامعة: {university}
- الفصل الدراسي: {semester}
- المقررات الحالية: {courses}
- المعدل التراكمي الكلي الحالي: {gpa}/4.00

أجب دائماً باللغة العربية بأسلوب واضح ومفيد ومرتب.`

export function AI() {
  const {
    courses,
    grades,
    profile,
    chatSessions,
    mindMaps,
    wikiPages,
    saveChatSession,
    deleteChatSession,
    saveMindMap,
    deleteMindMap,
    saveWikiPage,
    saveEvent
  } = useAppStore()

  const [activeSubTab, setActiveSubTab] = React.useState('chat')

  // GPA calculation for system prompt context
  const totalCredits = grades.reduce((sum, g) => sum + g.credit_hours, 0)
  const weightedPoints = grades.reduce((sum, g) => sum + (g.grade_value * g.credit_hours), 0)
  const currentGPA = totalCredits > 0 ? parseFloat((weightedPoints / totalCredits).toFixed(2)) : 0.0

  // AI Configurations loaded on init
  const [provider, setProvider] = React.useState('gemini')
  const [model, setModel] = React.useState('gemini-1.5-flash')
  const [sessionTitle, setSessionTitle] = React.useState('')
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null)
  
  // Chat messaging states
  const [chatInput, setChatInput] = React.useState('')
  const [chatLoading, setChatLoading] = React.useState(false)
  const [attachments, setAttachments] = React.useState<{ data: string; mimeType: string; name: string }[]>([])

  // Active Chat Session messages list
  const activeSession = chatSessions.find(s => s.id === activeSessionId)
  const messagesList = React.useMemo(() => {
    if (!activeSession) return []
    try {
      return JSON.parse(activeSession.messages || '[]')
    } catch {
      return []
    }
  }, [activeSession])

  React.useEffect(() => {
    // Set active session if available
    if (!activeSessionId && chatSessions.length > 0) {
      setActiveSessionId(chatSessions[0].id)
    }
    // Fetch provider settings
    window.electronAPI.settings.get('settings.ai.provider').then((p) => {
      if (p) setProvider(p)
    }).catch(console.error)
    window.electronAPI.settings.get('settings.ai.model').then((m) => {
      if (m) setModel(m)
    }).catch(console.error)
  }, [chatSessions])

  // Select provider callback
  const handleProviderChange = async (pVal: string) => {
    setProvider(pVal)
    // Default models mapper
    const defaults: Record<string, string> = {
      openai: 'gpt-4o',
      anthropic: 'claude-3-5-sonnet',
      gemini: 'gemini-1.5-flash',
      groq: 'llama-3.1-70b',
      ollama: 'llama3',
      openrouter: 'openrouter/auto',
      custom: 'custom-model'
    }
    const mVal = defaults[pVal] || ''
    setModel(mVal)
    await window.electronAPI.settings.set('settings.ai.provider', pVal)
    await window.electronAPI.settings.set('settings.ai.model', mVal)
  }

  // Save Chat Session Helper
  const updateSessionMessages = async (updatedMsgs: any[]) => {
    if (!activeSessionId) return
    const current = chatSessions.find(s => s.id === activeSessionId)
    await saveChatSession({
      id: activeSessionId,
      title: current ? current.title : 'محادثة جديدة',
      provider: provider,
      model: model,
      messages: JSON.stringify(updatedMsgs),
      updated_at: new Date().toISOString()
    })
  }

  // Create new chat session
  const handleCreateSession = async () => {
    const id = crypto.randomUUID()
    await saveChatSession({
      id,
      title: `محادثة جديدة ${new Date().toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}`,
      provider: provider,
      model: model,
      messages: '[]'
    })
    setActiveSessionId(id)
  }

  // Image Attachment Upload (copied to base64)
  const handleAttachFile = async () => {
    try {
      const paths = await window.electronAPI.app.selectFile({
        title: 'اختر صورة لرفعها للمحادثة',
        filters: [{ name: 'الصور', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
        properties: ['openFile']
      })
      if (paths && paths.length > 0) {
        const filePath = paths[0]
        const base64 = await window.electronAPI.files.readPDFBase64(filePath)
        const mime = filePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
        const name = filePath.split(/[\\/]/).pop() || 'image.jpg'
        setAttachments(prev => [...prev, { data: base64, mimeType: mime, name }])
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Chat Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!chatInput.trim() && attachments.length === 0) || !activeSessionId || chatLoading) return

    const userText = chatInput.trim()
    const currentMsgs = [...messagesList]

    // Construct user message item
    const userMsg: any = { role: 'user', content: userText }
    if (attachments.length > 0) {
      userMsg.attachments = attachments.map(a => ({ name: a.name, mimeType: a.mimeType }))
    }

    currentMsgs.push(userMsg)
    setMessagesListLocally(currentMsgs)
    setChatInput('')
    setChatLoading(true)

    // Assemble system prompt injecting student details
    const coursesStr = courses.map(c => `${c.name} (${c.code})`).join(', ')
    const systemPrompt = SYSTEM_PROMPT_TEMPLATE
      .replace('{major}', profile.major)
      .replace('{university}', profile.university)
      .replace('{semester}', profile.semester)
      .replace('{courses}', coursesStr || 'لا توجد مواد مسجلة')
      .replace('{gpa}', currentGPA.toFixed(2))

    try {
      // API call via Electron IPC
      const response = await window.electronAPI.ai.chat({
        provider,
        model,
        systemPrompt,
        messages: currentMsgs.map(m => ({ role: m.role, content: m.content })),
        files: attachments.map(a => ({ data: a.data, mimeType: a.mimeType }))
      })

      const updatedMsgs = [...currentMsgs, { role: 'assistant', content: response }]
      await updateSessionMessages(updatedMsgs)
      setAttachments([])
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'فشل الاتصال بـ AI. يرجى التحقق من اتصال الإنترنت ومفتاح الـ API.')
    } finally {
      setChatLoading(false)
    }
  }

  // Local state helper to refresh rendering immediately
  const setMessagesListLocally = (msgs: any[]) => {
    if (activeSession) {
      activeSession.messages = JSON.stringify(msgs)
    }
    // Refresh react triggers
    setChatInput('')
  }

  const handleDeleteSession = async (id: string) => {
    if (confirm('هل تريد حذف جلسة المحادثة هذه؟')) {
      await deleteChatSession(id)
      if (activeSessionId === id) {
        setActiveSessionId(chatSessions.length > 0 ? chatSessions[0].id : null)
      }
    }
  }

  // Export Chat Session as Markdown file
  const handleExportChatMarkdown = () => {
    if (messagesList.length === 0) return
    let md = `# محادثة دراسية - ${activeSession?.title || 'جديدة'}\n`
    md += `التاريخ: ${new Date().toLocaleDateString('ar-EG')}\n\n`
    messagesList.forEach((m: any) => {
      const roleName = m.role === 'user' ? 'الطالب' : 'المساعد الذكي'
      md += `### 👤 ${roleName}:\n${m.content}\n\n`
    })

    const dataUri = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(md)
    const exportAnchor = document.createElement('a')
    exportAnchor.setAttribute('href', dataUri)
    exportAnchor.setAttribute('download', `chat_history_${Date.now()}.md`)
    document.body.appendChild(exportAnchor)
    exportAnchor.click()
    document.body.removeChild(exportAnchor)
  }

  // MIND MAP GENERATOR STATES
  const [mindMapPrompt, setMindMapPrompt] = React.useState('')
  const [mindMapLoading, setMindMapLoading] = React.useState(false)
  const [selectedCourseMap, setSelectedCourseMap] = React.useState('')
  const [activeMindMap, setActiveMindMap] = React.useState<MindMap | null>(null)
  
  const svgRef = React.useRef<SVGSVGElement | null>(null)

  // Render Markmap trigger
  React.useEffect(() => {
    if (activeSubTab === 'mindmap' && activeMindMap && svgRef.current) {
      try {
        const transformer = new Transformer()
        const { root } = transformer.transform(activeMindMap.markdown_content)
        svgRef.current.innerHTML = ''
        Markmap.create(svgRef.current, undefined, root)
      } catch (err) {
        console.error('Failed to render markmap', err)
      }
    }
  }, [activeMindMap, activeSubTab])

  // Generate new mind map from input text
  const handleGenerateMindMap = async (customPrompt?: string) => {
    const promptText = customPrompt || mindMapPrompt
    if (!promptText.trim() || mindMapLoading) return

    setMindMapLoading(true)
    try {
      const finalPrompt = `قم بإنشاء خريطة مفاهيم تفصيلية ومرتبة على شكل هيكل تنظيمي بلغة Markdown (Markdown outline) فقط حول الموضوع التالي:
"${promptText}"
استخدم العناوين مثل # و ## و ### لتنظيم الفروع. لا تكتب أي نصوص تقديمية أو خاتمة، فقط هيكل الـ Markdown المكتوب باللغة العربية.`

      const response = await window.electronAPI.ai.chat({
        provider,
        model,
        systemPrompt: 'أنت خبير في إنشاء الخرائط الذهنية المفاهيمية وتحويل الشروحات إلى هياكل Markdown.',
        messages: [{ role: 'user', content: finalPrompt }]
      })

      const id = crypto.randomUUID()
      const newMap: MindMap = {
        id,
        title: promptText.slice(0, 30),
        markdown_content: response,
        svg_content: '',
        course_id: selectedCourseMap
      }

      await saveMindMap(newMap)
      setActiveMindMap(newMap)
      setMindMapPrompt('')
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'فشل الاتصال بـ AI لتوليد الخريطة.')
    } finally {
      setMindMapLoading(false)
    }
  }

  // Generate mind map from Syllabus topics
  const handleGenerateFromSyllabus = () => {
    if (!selectedCourseMap) {
      alert('يرجى اختيار مقرر دراسي أولاً.')
      return
    }
    const course = courses.find(c => c.id === selectedCourseMap)
    if (!course) return
    const syllabusList = JSON.parse(course.syllabus || '[]')
    if (syllabusList.length === 0) {
      alert('لا توجد مواضيع مضافة في خطة هذا المقرر. يرجى كتابتها أولاً في إدارة المواد.')
      return
    }

    const topicsText = syllabusList.map((t: any) => t.name).join(', ')
    const prompt = `خريطة مفاهيم لمقرر ${course.name} (${course.code}) والمواضيع الأساسية: ${topicsText}`
    handleGenerateMindMap(prompt)
  }

  const handleDeleteMindMap = async (id: string) => {
    if (confirm('هل تريد حذف خريطة المفاهيم هذه؟')) {
      await deleteMindMap(id)
      setActiveMindMap(null)
    }
  }

  // AI FLASHCARD GENERATOR STATES
  const { flashcards, saveFlashcard, deleteFlashcard } = useAppStore()
  const [flashcardLoading, setFlashcardLoading] = React.useState(false)
  const [selectedWikiPage, setSelectedWikiPage] = React.useState('')
  const [customTextFlashcard, setCustomTextFlashcard] = React.useState('')
  
  // AI Study Planner & Reminders States
  const [plannerCourseId, setPlannerCourseId] = React.useState('')
  const [plannerExamDate, setPlannerExamDate] = React.useState('')
  const [plannerHoursPerDay, setPlannerHoursPerDay] = React.useState('3')
  const [plannerOutput, setPlannerOutput] = React.useState('')
  const [plannerLoading, setPlannerLoading] = React.useState(false)

  // Generate Smart Study Plan
  const handleGenerateStudyPlan = async () => {
    if (!plannerCourseId) {
      alert('يرجى اختيار مقرر دراسي أولاً.')
      return
    }

    const course = courses.find(c => c.id === plannerCourseId)
    if (!course) return

    setPlannerLoading(true)
    setPlannerOutput('')

    try {
      const syllabusList = JSON.parse(course.syllabus || '[]')
      const topicsText = syllabusList.map((t: any) => `- ${t.name}`).join('\n')

      const prompt = `أنت مستشار أكاديمي خبير. ضع لي خطة دراسية تفصيلية ومحكمة وموزعة بالحصص والأيام للاستعداد للاختبار النهائي لمقرر "${course.name} (${course.code})".
تاريخ الاختبار المستهدف: ${plannerExamDate || 'غير محدد'}
عدد ساعات المذاكرة اليومية المتاحة: ${plannerHoursPerDay} ساعات.

المواضيع والخطط المطلوب تغطيتها في المقرر:
${topicsText || 'غير محددة في المنهج'}

المطلوب:
1. توزيع مواضيع الدراسة على خطة زمنية واضحة ومكثفة حتى موعد الاختبار.
2. تحديد نصائح خاصة وأساليب استذكار فعالة لهذا المقرر.
3. كتابة الخطة الدراسية بالكامل باللغة العربية الفصحى وبتنسيق Markdown منسق جداً باستخدام العناوين والجداول والقوائم.`

      const response = await window.electronAPI.ai.chat({
        provider,
        model,
        systemPrompt: 'أنت مستشار أكاديمي خبير في تخطيط المناهج وجدولتها لطلاب الجامعات.',
        messages: [{ role: 'user', content: prompt }]
      })

      setPlannerOutput(response)
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'فشل توليد الخطة الدراسية من المساعد.')
    } finally {
      setPlannerLoading(false)
    }
  }

  // Save generated plan as a Wiki Page note
  const handleSavePlanToWiki = async () => {
    if (!plannerOutput) return
    const course = courses.find(c => c.id === plannerCourseId)
    const title = `خطة دراسة: ${course ? course.name : 'مقرر دراسي'}`
    const id = crypto.randomUUID()

    try {
      // Basic markdown to html wrapping
      const htmlContent = plannerOutput
        .replace(/\n/g, '<br />')
        .replace(/### (.*)/g, '<h3>$1</h3>')
        .replace(/## (.*)/g, '<h2>$1</h2>')
        .replace(/# (.*)/g, '<h1>$1</h1>')

      await saveWikiPage({
        id,
        title,
        course_id: plannerCourseId,
        content: `<div>${htmlContent}</div>`,
        parent_id: ''
      })

      alert('تم حفظ الخطة الدراسية بنجاح كصفحة ملاحظات جديدة في الموسوعة (Wiki)!')
    } catch (err: any) {
      console.error(err)
      alert('فشل حفظ الصفحة ببيانات المفكرة.')
    }
  }

  // Auto-schedule daily study review tasks to Calendar events database
  const handleSchedulePlanToCalendar = async () => {
    if (!plannerOutput) return
    const course = courses.find(c => c.id === plannerCourseId)
    const courseName = course ? course.name : 'مراجعة'

    try {
      const now = new Date()
      // Schedule 5 daily study events starting from tomorrow
      for (let i = 1; i <= 5; i++) {
        const eventId = crypto.randomUUID()
        const studyDate = new Date()
        studyDate.setDate(now.getDate() + i)
        
        // Form datetime strings YYYY-MM-DDTHH:MM
        const yyyy = studyDate.getFullYear()
        const mm = String(studyDate.getMonth() + 1).padStart(2, '0')
        const dd = String(studyDate.getDate()).padStart(2, '0')
        
        const startStr = `${yyyy}-${mm}-${dd}T16:00`
        const endStr = `${yyyy}-${mm}-${dd}T18:00`

        await saveEvent({
          id: eventId,
          title: `جلسة مذاكرة ذكية: ${courseName} (الجزء ${i})`,
          type: 'Lecture',
          start_date: startStr,
          end_date: endStr,
          course_id: plannerCourseId,
          description: `جلسة مراجعة مجدولة تلقائياً بواسطة مساعد الدراسة الذكي لمذاكرة مقرر ${courseName}.`,
          color: '#3b82f6',
          all_day: 0
        })
      }

      alert('تمت جدولة 5 جلسات مراجعة ومذاكرة يومية مكثفة بنجاح في تقويمك الدراسي تلقائياً!')
    } catch (err: any) {
      console.error(err)
      alert('فشل إضافة تذكيرات المذاكرة إلى التقويم.')
    }
  }

  // Flashcard reviewer states
  const [reviewList, setReviewList] = React.useState<any[]>([])
  const [activeReviewIdx, setActiveReviewIdx] = React.useState(0)
  const [flipCard, setFlipCard] = React.useState(false)

  // Load due flashcards on active reviews tab
  const loadDueFlashcards = async () => {
    try {
      const nowStr = new Date().toISOString()
      const list = await window.electronAPI.db.flashcards.getDue(nowStr)
      setReviewList(list)
      setActiveReviewIdx(0)
      setFlipCard(false)
    } catch (err) {
      console.error(err)
    }
  }

  // Generate flashcards from content
  const handleGenerateFlashcards = async () => {
    let sourceText = customTextFlashcard.trim()
    let wikiId = ''

    if (selectedWikiPage) {
      const page = wikiPages.find(p => p.id === selectedWikiPage)
      if (page) {
        // Strip html tags
        sourceText = page.content.replace(/<[^>]*>/g, '')
        wikiId = page.id
      }
    }

    if (!sourceText || flashcardLoading) return

    setFlashcardLoading(false)
    setFlashcardLoading(true)
    try {
      const prompt = `اقرأ النص التالي وقم بإنشاء بطاقات استذكار تعليمية (Q&A flashcards) لمساعدتي في المذاكرة.
قم بصياغة الأسئلة والأجوبة باللغة العربية الفصحى.
أرجع النتيجة بتنسيق JSON مصفوفة فقط كما يلي، ولا تكتب أي نصوص أخرى:
[
  {
    "question": "السؤال هنا؟",
    "answer": "الإجابة هنا بالتفصيل."
  }
]

النص المصدري:
"${sourceText.slice(0, 2000)}"`

      const response = await window.electronAPI.ai.chat({
        provider,
        model,
        systemPrompt: 'أنت مصمم بطاقات استذكار ومناهج تعليمية متفوق، ترجع البيانات دائماً بتنسيق JSON صالح.',
        messages: [{ role: 'user', content: prompt }]
      })

      // Parse JSON from codeblock or raw response
      const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim()
      const parsed = JSON.parse(cleanJson) as { question: string; answer: string }[]

      for (const card of parsed) {
        const id = crypto.randomUUID()
        await saveFlashcard({
          id,
          question: card.question,
          answer: card.answer,
          source_page_id: wikiId,
          ease_factor: 2.5,
          interval: 1,
          repetitions: 0,
          next_review: new Date().toISOString()
        })
      }

      alert(`تم بنجاح توليد وحفظ عدد ${parsed.length} من بطاقات الاستذكار!`)
      setCustomTextFlashcard('')
      setSelectedWikiPage('')
      loadDueFlashcards()
    } catch (err: any) {
      console.error(err)
      alert('فشل تحليل أو توليد بطاقات استذكار صالحة من المساعد.')
    } finally {
      setFlashcardLoading(false)
    }
  }

  // SM-2 Review Algorithm scoring: q (0 - 5)
  const submitSM2Score = async (card: any, q: number) => {
    let { ease_factor, interval, repetitions } = card
    const now = new Date()

    if (q >= 3) {
      if (repetitions === 0) {
        interval = 1
      } else if (repetitions === 1) {
        interval = 6
      } else {
        interval = Math.round(interval * ease_factor)
      }
      repetitions++
    } else {
      repetitions = 0
      interval = 1
    }

    // New ease factor
    ease_factor = ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    ease_factor = Math.max(1.3, ease_factor)

    // Calculate next review date
    const nextReviewDate = new Date()
    nextReviewDate.setDate(now.getDate() + interval)

    await saveFlashcard({
      ...card,
      ease_factor,
      interval,
      repetitions,
      next_review: nextReviewDate.toISOString()
    })

    // Advance to next card
    setFlipCard(false)
    setTimeout(() => {
      setActiveReviewIdx(prev => prev + 1)
    }, 200)
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto h-full overflow-y-auto scrollbar-thin">
      {/* Header */}
      <div className="border-b pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <Bot className="h-8 w-8 text-primary shrink-0" />
            <span>المساعد الأكاديمي الذكي</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">توليد خرائط مفاهيم ذهنية وبطاقات استذكار مكررة بمساعدة ذكاء الآلة</p>
        </div>
        
        {/* Model quick selections */}
        <div className="flex gap-2">
          <Select className="w-36 h-8 text-xs bg-transparent" value={provider} onChange={e => handleProviderChange(e.target.value)}>
            <option value="gemini">Google Gemini</option>
            <option value="openai">OpenAI GPT</option>
            <option value="anthropic">Anthropic Claude</option>
            <option value="groq">Groq SDK</option>
            <option value="ollama">Ollama (محلي)</option>
            <option value="openrouter">OpenRouter</option>
            <option value="custom">مزود مخصص (Custom)</option>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="chat" value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="grid w-full grid-cols-4 max-w-[650px]">
          <TabsTrigger value="chat">مساعد المحادثة</TabsTrigger>
          <TabsTrigger value="mindmap">خرائط المفاهيم</TabsTrigger>
          <TabsTrigger value="flashcards">بطاقات الاستذكار</TabsTrigger>
          <TabsTrigger value="planner">خطط الدراسة والتذكيرات</TabsTrigger>
        </TabsList>

        {/* TAB 1: Chat Assistant */}
        <TabsContent value="chat" className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
          {/* History Sidebar */}
          <div className="lg:col-span-1 space-y-3">
            <div className="flex justify-between items-center px-1">
              <h3 className="font-bold text-xs text-muted-foreground flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span>جلسات المحادثة</span>
              </h3>
              <Button size="sm" variant="ghost" className="p-1 h-7 w-7" onClick={handleCreateSession} title="محادثة جديدة">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {chatSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => setActiveSessionId(session.id)}
                  className={`p-3 rounded-xl border text-right cursor-pointer flex justify-between items-center transition-all ${
                    activeSessionId === session.id
                      ? 'border-primary bg-primary/5 shadow-sm font-bold'
                      : 'bg-card hover:bg-accent/40 border-border'
                  }`}
                >
                  <span className="truncate text-xs text-foreground pr-1 max-w-[80%]">{session.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteSession(session.id)
                    }}
                    className="text-muted-foreground hover:text-destructive opacity-70 hover:opacity-100 p-0.5 rounded transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Chat main workspace */}
          <div className="lg:col-span-3 flex flex-col h-[520px] bg-card border rounded-2xl overflow-hidden">
            {/* Session Header */}
            <div className="p-3 border-b bg-muted/10 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-mono">{model}</Badge>
              </div>
              {messagesList.length > 0 && (
                <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={handleExportChatMarkdown}>
                  <Download className="h-3.5 w-3.5" /> تصدير كمستند
                </Button>
              )}
            </div>

            {/* Messages box */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
              {messagesList.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center py-20">
                  <Bot className="h-14 w-14 opacity-30 mb-3" />
                  <h4 className="font-extrabold text-sm text-foreground">ابدأ المحادثة الدراسية</h4>
                  <p className="text-xs max-w-xs mt-2 leading-relaxed">اسأل المساعد الذكي عن أي قاعدة برمجية، أو ترجمة مصطلحات، أو تبسيط نظريات معقدة.</p>
                </div>
              ) : (
                messagesList.map((msg: any, idx: number) => {
                  const isUser = msg.role === 'user'
                  return (
                    <div key={idx} className={`flex items-start gap-3 ${isUser ? 'justify-start' : 'justify-end'}`}>
                      <div className={`p-3 rounded-2xl max-w-[80%] text-sm leading-relaxed border ${
                        isUser
                          ? 'bg-primary text-primary-foreground border-transparent rounded-tr-none'
                          : 'bg-accent/20 text-foreground border-border rounded-tl-none'
                      }`}>
                        {/* Display attachments if user message has them */}
                        {msg.attachments && (
                          <div className="flex gap-2 mb-2 bg-black/15 p-2 rounded border border-transparent">
                            {msg.attachments.map((a: any, i: number) => (
                              <Badge key={i} variant="secondary" className="text-[10px]">🖼️ {a.name}</Badge>
                            ))}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  )
                })
              )}
              {chatLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                  <Zap className="h-4 w-4 text-primary animate-spin" />
                  <span>المساعد الذكي يفكر ويكتب...</span>
                </div>
              )}
            </div>

            {/* Send forms */}
            <form onSubmit={handleSendMessage} className="p-3 border-t bg-muted/20 flex gap-2 items-center">
              <Button type="button" variant="outline" className="p-2 h-9 w-9" onClick={handleAttachFile} title="أرفق صورة">
                <Paperclip className="h-4.5 w-4.5" />
              </Button>
              <Input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="اكتب رسالتك للمساعد الذكي هنا..."
                disabled={chatLoading || !activeSessionId}
              />
              <Button type="submit" disabled={chatLoading || !activeSessionId}>
                <Send className="h-4 w-4" />
              </Button>
            </form>

            {/* Attachments preview */}
            {attachments.length > 0 && (
              <div className="p-2 bg-muted/40 border-t flex gap-2">
                {attachments.map((a, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 py-1 px-2.5">
                    <span>🖼️ {a.name}</span>
                    <button type="button" className="text-red-500 font-bold ml-1" onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}>×</button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 2: Mind Map Generator */}
        <TabsContent value="mindmap" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Generator Form panel */}
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Network className="h-5 w-5 text-primary" />
                    <span>توليد خريطة مفاهيم جديدة</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">ربط خريطة المفاهيم بمقرر دراسي</label>
                    <Select value={selectedCourseMap} onChange={e => setSelectedCourseMap(e.target.value)}>
                      <option value="">لا توجد مادة...</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">موضوع الخريطة المفاهيمية</label>
                    <Textarea
                      rows={4}
                      value={mindMapPrompt}
                      onChange={e => setMindMapPrompt(e.target.value)}
                      placeholder="اكتب شرحاً مختصراً للموضوع أو الصق ملخصاً لتوليد خريطة هيكلية مغطاة بالكامل..."
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleGenerateMindMap()}
                      disabled={!mindMapPrompt.trim() || mindMapLoading}
                      className="flex-1"
                    >
                      {mindMapLoading ? 'جاري التوليد...' : 'توليد خريطة'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleGenerateFromSyllabus}
                      disabled={!selectedCourseMap || mindMapLoading}
                    >
                      من الخطة الدراسية للمقرر
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Saved Mindmaps */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-muted-foreground px-1">الخرائط المحفوظة محلياً</h4>
                {mindMaps.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground px-1">لا توجد خرائط مفاهيم محفوظة.</p>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {mindMaps.map(map => (
                      <div
                        key={map.id}
                        onClick={() => setActiveMindMap(map)}
                        className={`p-3 rounded-lg border cursor-pointer flex justify-between items-center text-xs text-right transition-all ${
                          activeMindMap?.id === map.id ? 'border-primary bg-primary/5 font-bold' : 'bg-card hover:bg-accent/40'
                        }`}
                      >
                        <span className="truncate pr-1 max-w-[80%]">{map.title}</span>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteMindMap(map.id) }} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mind Map Canvas Visualizer SVG */}
            <div className="lg:col-span-2">
              <Card className="h-[520px] flex flex-col">
                <CardHeader className="py-3.5 border-b">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Network className="h-5 w-5 text-primary animate-pulse" />
                    <span>لوحة رسم الخرائط المفاهيمية التفاعلية</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-4 bg-muted/20 relative overflow-hidden flex items-center justify-center">
                  {activeMindMap ? (
                    <svg
                      ref={svgRef}
                      className="w-full h-full border bg-card rounded-xl shadow-inner cursor-move"
                    />
                  ) : (
                    <div className="text-center py-20 text-muted-foreground flex flex-col items-center justify-center">
                      <Network className="h-16 w-16 opacity-30 mb-3" />
                      <h4 className="font-bold">لوحة الرسم خالية</h4>
                      <p className="text-xs max-w-xs mt-2 leading-relaxed">اكتب موضوعاً أو حدد مادة بالجانب الأيسر، لتوليد مخطط هيكلي تفاعلي تكبير وتصغير تفريعاته.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: Flashcard generator & reviewer trainer */}
        <TabsContent value="flashcards" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Flashcards Generator */}
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" />
                    <span>توليد بطاقات استذكار AI</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">استيراد نص من المفكرة (Wiki)</label>
                    <Select value={selectedWikiPage} onChange={e => setSelectedWikiPage(e.target.value)}>
                      <option value="">لا يوجد، سأكتب نصاً مخصصاً...</option>
                      {wikiPages.map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </Select>
                  </div>

                  {!selectedWikiPage && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-muted-foreground">النص المصدري للبطاقات</label>
                      <Textarea
                        rows={4}
                        value={customTextFlashcard}
                        onChange={e => setCustomTextFlashcard(e.target.value)}
                        placeholder="الصق فصلاً أو ملخصاً دراسياً لتوليد أزواج من الأسئلة والأجوبة..."
                      />
                    </div>
                  )}

                  <Button
                    onClick={handleGenerateFlashcards}
                    disabled={(!selectedWikiPage && !customTextFlashcard.trim()) || flashcardLoading}
                    className="w-full"
                  >
                    {flashcardLoading ? 'جاري التوليد وترتيب الأسئلة...' : 'توليد بطاقات المذاكرة'}
                  </Button>
                </CardContent>
              </Card>

              {/* Total flashcards count */}
              <div className="p-3 bg-muted/40 rounded-xl border border-border text-xs flex justify-between items-center font-semibold">
                <span>إجمالي بطاقات المذاكرة المخزنة:</span>
                <Badge variant="outline" className="font-bold text-primary border-primary">{flashcards.length} بطاقات</Badge>
              </div>
            </div>

            {/* Flashcard Review Trainer UI */}
            <div className="lg:col-span-2">
              <Card className="h-[460px] flex flex-col justify-between">
                <CardHeader className="py-3 border-b flex flex-row justify-between items-center">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BookOpenCheck className="h-5 w-5 text-primary" />
                    <span>جلسة المذاكرة والتكرار المتباعد (SM-2)</span>
                  </CardTitle>
                  <Button size="sm" variant="ghost" onClick={loadDueFlashcards} className="gap-1 text-xs">
                    <RefreshCw className="h-3.5 w-3.5" /> تحديث المتراكم
                  </Button>
                </CardHeader>

                <CardContent className="flex-1 flex items-center justify-center p-6 bg-muted/20 relative">
                  {reviewList.length > 0 && activeReviewIdx < reviewList.length ? (
                    <div className="w-full max-w-md perspective-1000">
                      {/* Flip card block container */}
                      <div
                        onClick={() => setFlipCard(!flipCard)}
                        className={`relative w-full h-64 bg-card text-card-foreground border rounded-2xl shadow-xl cursor-pointer transform-style-3d transition-transform duration-500 flex items-center justify-center p-6 text-center ${
                          flipCard ? 'rotate-y-180' : ''
                        }`}
                      >
                        {/* Front Side: Question */}
                        <div className="absolute inset-0 backface-hidden flex flex-col items-center justify-center p-6 space-y-4">
                          <Badge variant="warning">السؤال</Badge>
                          <p className="font-extrabold text-base md:text-lg leading-relaxed text-foreground select-none">
                            {reviewList[activeReviewIdx].question}
                          </p>
                          <span className="text-[10px] text-muted-foreground">انقر لقلب البطاقة ورؤية الإجابة</span>
                        </div>

                        {/* Back Side: Answer */}
                        <div className="absolute inset-0 backface-hidden rotate-y-180 flex flex-col items-center justify-center p-6 space-y-4 overflow-y-auto">
                          <Badge variant="success">الإجابة</Badge>
                          <p className="font-semibold text-sm leading-relaxed text-muted-foreground select-none">
                            {reviewList[activeReviewIdx].answer}
                          </p>
                          <span className="text-[10px] text-primary">انقر لقلب السؤال مجدداً</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-20 text-muted-foreground flex flex-col items-center justify-center">
                      <Check className="h-16 w-16 text-green-500/80 mb-3 animate-pulse" />
                      <h4 className="font-black text-foreground">أنت مستعد تماماً!</h4>
                      <p className="text-xs max-w-xs mt-2">لا توجد بطاقات استذكار مستحقة للمراجعة حالياً. تفقد هذه اللوحة لاحقاً طبقاً لجدولة SM-2 التكرارية.</p>
                    </div>
                  )}
                </CardContent>

                {/* Trainer footer scores selectors */}
                {reviewList.length > 0 && activeReviewIdx < reviewList.length && (
                  <div className="p-4 border-t bg-card flex flex-col gap-3">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>البطاقة الحالية: {activeReviewIdx + 1} من {reviewList.length}</span>
                      <span>سجل التقدم متباعد دورياً</span>
                    </div>

                    {flipCard && (
                      <div className="grid grid-cols-6 gap-1 bg-muted/30 p-2 rounded-xl border border-border">
                        {[0, 1, 2, 3, 4, 5].map((score) => {
                          const labels: Record<number, string> = {
                            0: 'نسيت تماماً (0)',
                            1: 'صعب جداً (1)',
                            2: 'غير متأكد (2)',
                            3: 'تذكرته بصعوبة (3)',
                            4: 'جيد (4)',
                            5: 'سهل جداً (5)'
                          }
                          return (
                            <Button
                              key={score}
                              size="sm"
                              variant={score >= 3 ? 'default' : 'outline'}
                              onClick={() => submitSM2Score(reviewList[activeReviewIdx], score)}
                              className="text-[9px] py-1 px-0.5 h-8 truncate font-bold"
                              title={labels[score]}
                            >
                              {score}
                            </Button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 4: AI Study Planner & Reminders */}
        <TabsContent value="planner" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form controls */}
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BookOpenCheck className="h-5 w-5 text-primary" />
                    <span>توليد خطة دراسية ذكية</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">اختر المقرر الدراسي *</label>
                    <Select value={plannerCourseId} onChange={e => setPlannerCourseId(e.target.value)}>
                      <option value="">اختر مادة للخطط الدراسية...</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">تاريخ الاختبار النهائي المستهدف</label>
                    <Input
                      type="date"
                      value={plannerExamDate}
                      onChange={e => setPlannerExamDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">عدد الساعات اليومية للمذاكرة</label>
                    <Select value={plannerHoursPerDay} onChange={e => setPlannerHoursPerDay(e.target.value)}>
                      <option value="1">1 ساعة</option>
                      <option value="2">2 ساعتين</option>
                      <option value="3">3 ساعات</option>
                      <option value="4">4 ساعات</option>
                      <option value="5">5 ساعات أو أكثر</option>
                    </Select>
                  </div>

                  <Button
                    onClick={handleGenerateStudyPlan}
                    disabled={!plannerCourseId || plannerLoading}
                    className="w-full gap-1.5"
                  >
                    <Zap className="h-4 w-4 text-amber-400" />
                    <span>{plannerLoading ? 'جاري رسم الخطة الدراسية...' : 'توليد الخطة الذكية'}</span>
                  </Button>
                </CardContent>
              </Card>

              {plannerOutput && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-black text-primary">إجراءات سريعة للخطة</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button onClick={handleSavePlanToWiki} variant="outline" className="w-full text-xs font-bold gap-1.5 border-primary/20 bg-background text-primary hover:bg-primary/5">
                      <FileText className="h-4 w-4" /> حفظ كمسودة في المفكرة
                    </Button>
                    <Button onClick={handleSchedulePlanToCalendar} variant="outline" className="w-full text-xs font-bold gap-1.5 border-primary/20 bg-background text-primary hover:bg-primary/5">
                      <CalendarDays className="h-4 w-4" /> جدولة جلسات مراجعة في التقويم
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Output Workspace */}
            <div className="lg:col-span-2">
              <Card className="h-[520px] flex flex-col">
                <CardHeader className="py-3.5 border-b">
                  <CardTitle className="text-sm">الخطة الدراسية المقترحة</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-4 overflow-y-auto scrollbar-thin prose dark:prose-invert max-w-none text-xs leading-relaxed text-right">
                  {plannerOutput ? (
                    <div className="whitespace-pre-wrap select-text">{plannerOutput}</div>
                  ) : (
                    <div className="text-center py-20 text-muted-foreground flex flex-col items-center justify-center h-full">
                      <BookOpen className="h-16 w-16 opacity-30 mb-3" />
                      <h4 className="font-bold">الخطة الدراسية فارغة</h4>
                      <p className="text-xs max-w-xs mt-2 leading-relaxed">اختر مقرراً دراسياً من القائمة اليسرى لكي يقوم المساعد الأكاديمي ببناء جدول مذاكرة مكثف وتوليد تذكيرات تلقائية مجدولة.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
