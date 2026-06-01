import * as React from 'react'
import { useAppStore, WikiPage, Course } from '@/store/useAppStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import { MermaidExtension } from './Tools/WikiEditor/extensions/MermaidExtension'
import {
  FileText,
  Plus,
  Trash2,
  Save,
  FileDown,
  Search,
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Quote,
  Table as TableIcon,
  ImageIcon,
  BookOpen,
  FolderPlus,
  GitFork
} from 'lucide-react'

export function Wiki() {
  const { wikiPages, courses, saveWikiPage, deleteWikiPage } = useAppStore()

  // Selected note state
  const [selectedPageId, setSelectedPageId] = React.useState<string | null>(null)
  const [noteTitle, setNoteTitle] = React.useState('')
  const [noteCourseId, setNoteCourseId] = React.useState('')

  // Search & Filter
  const [searchQuery, setSearchQuery] = React.useState('')
  const [courseFilter, setCourseFilter] = React.useState('all')

  const [saveStatus, setSaveStatus] = React.useState<'saved' | 'saving' | 'dirty'>('saved')

  // Find active page
  const activePage = wikiPages.find(p => p.id === selectedPageId)

  // Configure TipTap Editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Table.configure({
        resizable: true
      }),
      TableRow,
      TableCell,
      TableHeader,
      MermaidExtension
    ],
    content: '',
    onUpdate: ({ editor }) => {
      setSaveStatus('dirty')
    }
  })

  // Sync active page selection to editor
  React.useEffect(() => {
    if (activePage && editor) {
      editor.commands.setContent(activePage.content || '')
      setNoteTitle(activePage.title)
      setNoteCourseId(activePage.course_id || '')
      setSaveStatus('saved')
    } else if (editor) {
      editor.commands.setContent('')
      setNoteTitle('')
      setNoteCourseId('')
      setSaveStatus('saved')
    }
  }, [selectedPageId, editor, wikiPages])

  // Select first page if none selected
  React.useEffect(() => {
    if (!selectedPageId && wikiPages.length > 0) {
      setSelectedPageId(wikiPages[0].id)
    }
  }, [wikiPages])

  // 30-Second Auto Save Trigger
  React.useEffect(() => {
    const timer = setInterval(() => {
      if (saveStatus === 'dirty' && selectedPageId) {
        handleSave()
      }
    }, 30000)

    return () => clearInterval(timer)
  }, [saveStatus, selectedPageId, noteTitle, noteCourseId])

  const handleSave = async () => {
    if (!selectedPageId || !editor) return
    setSaveStatus('saving')
    try {
      const htmlContent = editor.getHTML()
      await saveWikiPage({
        id: selectedPageId,
        title: noteTitle.trim() || 'صفحة بدون عنوان',
        course_id: noteCourseId,
        content: htmlContent,
        parent_id: '',
        updated_at: new Date().toISOString()
      })
      setSaveStatus('saved')
    } catch (err) {
      console.error(err)
      setSaveStatus('dirty')
    }
  }

  const handleCreatePage = async () => {
    const id = crypto.randomUUID()
    const newPage: WikiPage = {
      id,
      title: 'ملاحظة جديدة',
      course_id: courses.length > 0 ? courses[0].id : '',
      content: '<p>اكتب ملاحظاتك هنا...</p>',
      parent_id: ''
    }

    await saveWikiPage(newPage)
    setSelectedPageId(id)
    setSaveStatus('saved')
  }

  const handleDeletePage = async () => {
    if (!selectedPageId) return
    if (confirm('هل أنت متأكد من حذف هذه الصفحة نهائياً؟')) {
      await deleteWikiPage(selectedPageId)
      setSelectedPageId(wikiPages.length > 0 ? wikiPages[0].id : null)
    }
  }

  // PDF Export
  const handleExportPDF = async () => {
    if (!editor || !selectedPageId) return
    try {
      const htmlContent = `
        <h1>${noteTitle}</h1>
        ${editor.getHTML()}
      `
      const filename = `${noteTitle.trim().replace(/\s+/g, '_')}_${Date.now()}.pdf`
      const res = await window.electronAPI.files.exportPDF({ htmlContent, filename })
      
      if (res.success) {
        alert(`تم تصدير الصفحة بنجاح كملف PDF وحفظها في الخزانة!\nالمسار: ${res.filePath}`)
      }
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'فشل تصدير الصفحة إلى ملف PDF')
    }
  }

  // Insert Local Image via electron app dialog select
  const handleInsertImage = async () => {
    if (!editor) return
    try {
      const paths = await window.electronAPI.app.selectFile({
        title: 'اختر صورة لإدراجها في الملاحظة',
        filters: [{ name: 'الصور', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
        properties: ['openFile']
      })

      if (paths && paths.length > 0) {
        // Read file contents as base64 and insert as data URI to keep file local and portable
        const base64Bytes = await window.electronAPI.files.readPDFBase64(paths[0])
        const mimeType = paths[0].toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
        editor.chain().focus().setImage({ src: `data:${mimeType};base64,${base64Bytes}` }).run()
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Insert table helper
  const handleInsertTable = () => {
    if (editor) {
      // Create a basic 3x3 table
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    }
  }

  // Filter & Search Pages List
  const filteredPages = React.useMemo(() => {
    let list = [...wikiPages]
    
    if (courseFilter !== 'all') {
      list = list.filter(p => p.course_id === courseFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q)
      )
    }

    return list
  }, [wikiPages, courseFilter, searchQuery])

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto h-full overflow-y-auto scrollbar-thin">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">الموسوعة والملاحظات الدراسية</h1>
          <p className="text-sm text-muted-foreground mt-1">دوّن محاضراتك، واكتب ملخصاتك، وصدرها كملفات PDF</p>
        </div>
        <Button onClick={handleCreatePage} className="gap-1.5">
          <Plus className="h-4 w-4" /> صفحة جديدة
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Pages directory Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="py-3.5 border-b">
              <CardTitle className="text-xs font-black text-muted-foreground flex items-center gap-1.5">
                <Search className="h-4 w-4" />
                <span>فرز وتصفية الملاحظات</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              <Input
                placeholder="ابحث في العناوين والمحتوى..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <Select value={courseFilter} onChange={e => setCourseFilter(e.target.value)}>
                <option value="all">كل المواد</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </CardContent>
          </Card>

          {/* List of notes */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {filteredPages.map(page => {
              const course = courses.find(c => c.id === page.course_id)
              return (
                <div
                  key={page.id}
                  onClick={() => setSelectedPageId(page.id)}
                  className={`p-3 rounded-xl border text-right cursor-pointer transition-all ${
                    selectedPageId === page.id
                      ? 'border-primary bg-primary/5 shadow-sm scale-102 font-bold'
                      : 'bg-card hover:bg-accent/40 border-border'
                  }`}
                >
                  <h4 className="text-xs truncate font-bold">{page.title}</h4>
                  <div className="flex justify-between items-center mt-2.5">
                    <Badge variant="outline" style={{ borderColor: course?.color, color: course?.color }} className="text-[9px] py-0 px-1.5">
                      {course ? course.code : 'عام'}
                    </Badge>
                    <span className="text-[9px] text-muted-foreground">
                      {page.updated_at ? new Date(page.updated_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }) : 'مسودة'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Note Editor Area */}
        <div className="lg:col-span-3 space-y-4">
          {selectedPageId && editor ? (
            <Card className="flex flex-col min-h-[550px] border-2">
              <CardHeader className="py-4 border-b bg-muted/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                {/* Save status, title and course link inputs */}
                <div className="flex-1 flex flex-col md:flex-row gap-3 w-full">
                  <Input
                    className="font-extrabold text-base bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-9 w-full md:max-w-xs"
                    value={noteTitle}
                    onChange={e => {
                      setNoteTitle(e.target.value)
                      setSaveStatus('dirty')
                    }}
                    placeholder="عنوان الملاحظة..."
                  />
                  <Select
                    className="w-full md:w-44 h-9 bg-transparent"
                    value={noteCourseId}
                    onChange={e => {
                      setNoteCourseId(e.target.value)
                      setSaveStatus('dirty')
                    }}
                  >
                    <option value="">اختر مادة مرتبطة...</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </div>
                <div className="flex gap-2 shrink-0">
                  <span className="self-center text-xs text-muted-foreground">
                    {saveStatus === 'saved' && '✓ تم الحفظ'}
                    {saveStatus === 'saving' && 'جاري الحفظ تلقائياً...'}
                    {saveStatus === 'dirty' && 'تغييرات غير محفوظة'}
                  </span>
                  <Button size="sm" variant="outline" className="p-2 h-8 w-8" onClick={handleSave} title="حفظ المسودة">
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="p-2 h-8 w-8" onClick={handleExportPDF} title="تصدير PDF">
                    <FileDown className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="p-2 h-8 w-8 text-destructive" onClick={handleDeletePage} title="حذف الصفحة">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              {/* Rich text Editor Toolbar */}
              <div className="flex flex-wrap gap-1 p-2 bg-muted/40 border-b select-none">
                <Button
                  size="sm"
                  variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className="p-1 h-7 w-7"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className="p-1 h-7 w-7"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={editor.isActive('heading', { level: 1 }) ? 'secondary' : 'ghost'}
                  onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  className="p-1 h-7 w-7"
                >
                  <Heading1 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'}
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  className="p-1 h-7 w-7"
                >
                  <Heading2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  className="p-1 h-7 w-7"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  className="p-1 h-7 w-7"
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={editor.isActive('blockquote') ? 'secondary' : 'ghost'}
                  onClick={() => editor.chain().focus().toggleBlockquote().run()}
                  className="p-1 h-7 w-7"
                >
                  <Quote className="h-4 w-4" />
                </Button>
                <div className="w-[1px] h-6 bg-border mx-1 self-center" />
                <Button size="sm" variant="ghost" onClick={handleInsertTable} className="p-1 h-7 w-7" title="جدول">
                  <TableIcon className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={handleInsertImage} className="p-1 h-7 w-7" title="صورة">
                  <ImageIcon className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => editor.chain().focus().insertMermaid().run()} className="p-1 h-7 w-7 text-primary" title="إدراج مخطط">
                  <GitFork className="h-4 w-4" />
                </Button>
              </div>

              {/* Editor Workspace Content */}
              <div className="flex-1 p-4 prose dark:prose-invert max-w-none text-sm text-right focus:outline-none min-h-[400px]">
                <EditorContent editor={editor} className="outline-none" />
              </div>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-card border rounded-xl text-center text-muted-foreground p-6 min-h-[500px]">
              <FileText className="h-16 w-16 opacity-30 mb-4" />
              <h3 className="text-lg font-bold">يرجى تحديد أو إنشاء ملاحظة</h3>
              <p className="text-xs max-w-xs mt-2">انقر على زر "صفحة جديدة" أو حدد أي مسودة ملاحظات من القائمة الجانبية للبدء في تدوين دروسك.</p>
              <Button onClick={handleCreatePage} className="mt-4 gap-1.5" size="sm">
                <Plus className="h-4 w-4" /> أنشئ صفحة جديدة الآن
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
