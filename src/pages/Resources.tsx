import * as React from 'react'
import { useAppStore, Resource } from '@/store/useAppStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { CitationPanel } from './Resources/CitationPanel'
import {
  Link as LinkIcon,
  Plus,
  Trash2,
  FileDown,
  FileUp,
  ExternalLink,
  Star,
  Bookmark,
  BookOpen,
  FolderMinus,
  Search
} from 'lucide-react'

export function Resources() {
  const { resources, courses, saveResource, deleteResource } = useAppStore()

  // Selected card for citation panel
  const [selectedResourceId, setSelectedResourceId] = React.useState<string | null>(null)

  // Modal
  const [modalOpen, setModalOpen] = React.useState(false)
  const [newRes, setNewRes] = React.useState({ title: '', url: '', category: 'book', tags: '', courseId: '', notes: '', rating: '5' })

  // Filters
  const [searchQuery, setSearchQuery] = React.useState('')
  const [categoryFilter, setCategoryFilter] = React.useState('all')
  const [courseFilter, setCourseFilter] = React.useState('all')
  const [showOnlyFavorites, setShowOnlyFavorites] = React.useState(false)

  // Handlers
  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRes.title || !newRes.url) return

    const id = crypto.randomUUID()
    // Parse tags to JSON array
    const tagsArray = newRes.tags.split(',').map(t => t.trim()).filter(Boolean)

    await saveResource({
      id,
      title: newRes.title,
      url: newRes.url,
      category: newRes.category,
      tags: JSON.stringify(tagsArray),
      course_id: newRes.courseId,
      notes: newRes.notes,
      rating: parseInt(newRes.rating, 10),
      is_favorite: 0
    })

    setNewRes({ title: '', url: '', category: 'book', tags: '', courseId: '', notes: '', rating: '5' })
    setModalOpen(false)
  }

  const handleDeleteResource = async (id: string) => {
    if (confirm('هل تريد حذف هذا المرجع؟')) {
      await deleteResource(id)
    }
  }

  const toggleFavorite = async (res: Resource) => {
    await saveResource({
      ...res,
      is_favorite: res.is_favorite === 1 ? 0 : 1
    })
  }

  // Open Link Externally
  const openExternalLink = (url: string) => {
    window.electronAPI.app.openExternal(url).catch(console.error)
  }

  // Import Bookmarks HTML via Cheerio parser
  const handleImportBookmarks = async () => {
    try {
      const filePaths = await window.electronAPI.app.selectFile({
        title: 'اختر ملف علامات المرجعية HTML المستخرج من المتصفح',
        filters: [{ name: 'ملفات علامات المرجعية (.html)', extensions: ['html'] }],
        properties: ['openFile']
      })

      if (filePaths && filePaths.length > 0) {
        const list = await window.electronAPI.files.parseBookmarks(filePaths[0])
        
        for (const item of list) {
          const id = crypto.randomUUID()
          await saveResource({
            id,
            title: item.title,
            url: item.url,
            category: item.category,
            tags: JSON.stringify(item.tags || []),
            course_id: '',
            notes: 'مستورد من علامات المتصفح المرجعية',
            rating: 5,
            is_favorite: 0
          })
        }
        alert(`تم بنجاح استيراد عدد ${list.length} من المراجع للدراسة!`)
      }
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'فشل استيراد العلامات المرجعية. يرجى التأكد من اختيار ملف HTML صالح.')
    }
  }

  // Export BibTeX
  const handleExportBibTeX = () => {
    if (resources.length === 0) return
    let bib = ''
    resources.forEach(r => {
      // Create clean bib key from title
      const cleanKey = r.title.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'key'
      bib += `@misc{${cleanKey},\n`
      bib += `  title = {${r.title}},\n`
      bib += `  howpublished = {\\url{${r.url}}},\n`
      bib += `  note = {${r.notes || ''}}\n`
      bib += `}\n\n`
    })

    const dataUri = 'data:text/plain;charset=utf-8,' + encodeURIComponent(bib)
    const exportAnchor = document.createElement('a')
    exportAnchor.setAttribute('href', dataUri)
    exportAnchor.setAttribute('download', 'scholar-os-references.bib')
    document.body.appendChild(exportAnchor)
    exportAnchor.click()
    document.body.removeChild(exportAnchor)
  }

  // Export Markdown List
  const handleExportMarkdown = () => {
    if (resources.length === 0) return
    let md = `# المراجع والمصادر الأكاديمية\n\n`
    resources.forEach(r => {
      md += `- [${r.title}](${r.url}) - ${r.category} | ${r.notes || ''}\n`
    })

    const dataUri = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(md)
    const exportAnchor = document.createElement('a')
    exportAnchor.setAttribute('href', dataUri)
    exportAnchor.setAttribute('download', 'scholar-os-references.md')
    document.body.appendChild(exportAnchor)
    exportAnchor.click()
    document.body.removeChild(exportAnchor)
  }

  // Filtered resources
  const filteredResources = React.useMemo(() => {
    let list = [...resources]

    if (showOnlyFavorites) {
      list = list.filter(r => r.is_favorite === 1)
    }

    if (categoryFilter !== 'all') {
      list = list.filter(r => r.category === categoryFilter)
    }

    if (courseFilter !== 'all') {
      list = list.filter(r => r.course_id === courseFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.url.toLowerCase().includes(q) ||
        r.notes.toLowerCase().includes(q)
      )
    }

    return list
  }, [resources, showOnlyFavorites, categoryFilter, courseFilter, searchQuery])

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto h-full overflow-y-auto scrollbar-thin">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">المراجع والمصادر الدراسية</h1>
          <p className="text-sm text-muted-foreground mt-1">احفظ روابط الكتب والأبحاث والمحاضرات الخارجية لتسهيل الوصول إليها</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleImportBookmarks} variant="outline" className="gap-1.5 size-sm md:size-default">
            <FileUp className="h-4 w-4" /> استيراد الإشارات المرجعية
          </Button>
          <Button onClick={handleExportBibTeX} variant="outline" className="gap-1.5 size-sm md:size-default">
            <FileDown className="h-4 w-4" /> تصدير BibTeX
          </Button>
          <Button onClick={handleExportMarkdown} variant="outline" className="gap-1.5 size-sm md:size-default">
            <FileDown className="h-4 w-4" /> تصدير كمستند
          </Button>
          <Button onClick={() => setModalOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> إضافة مرجع
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side Filters Card */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="py-4 border-b">
              <CardTitle className="text-xs font-black text-muted-foreground">خيارات الفرز والتصفية</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">البحث بالكلمات</label>
                <div className="relative">
                  <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pr-8"
                    placeholder="ابحث بالعنوان أو الرابط..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">التصنيف</label>
                <Select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                  <option value="all">كل التصنيفات</option>
                  <option value="book">كتاب</option>
                  <option value="article">مقال / ورقة علمية</option>
                  <option value="video">فيديو تعليمي</option>
                  <option value="course">دورة / موقع إلكتروني</option>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">المقرر الدراسي</label>
                <Select value={courseFilter} onChange={e => setCourseFilter(e.target.value)}>
                  <option value="all">كل المقررات</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>

              <div className="flex items-center gap-2 select-none">
                <input
                  type="checkbox"
                  id="fav_only"
                  className="rounded border-border cursor-pointer h-4 w-4 text-primary"
                  checked={showOnlyFavorites}
                  onChange={e => setShowOnlyFavorites(e.target.checked)}
                />
                <label htmlFor="fav_only" className="text-xs font-bold cursor-pointer">إظهار المفضلة فقط</label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center Grid of Resources */}
        <div className="lg:col-span-3">
          {filteredResources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-card rounded-xl border text-center p-6 text-muted-foreground">
              <LinkIcon className="h-14 w-14 opacity-30 mb-4" />
              <h4 className="font-bold">لا يوجد مراجع مطابقة للبحث</h4>
              <p className="text-xs mt-1 max-w-xs">أضف مراجع دراسية بالضغط على الزر بالأعلى، أو قم بتغيير فلاتر التصفية الجانبية.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredResources.map((res) => {
                const course = courses.find(c => c.id === res.course_id)
                let tagsList: string[] = []
                try {
                  tagsList = JSON.parse(res.tags || '[]')
                } catch (e) {
                  tagsList = (res.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean)
                }
                
                return (
                  <Card key={res.id} className="flex flex-col justify-between hover:shadow-lg transition-shadow duration-200">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {res.category === 'book' ? '📖 كتاب' :
                           res.category === 'article' ? '📄 مقال / بحث' :
                           res.category === 'video' ? '🎬 فيديو' : '🔗 موقع'}
                        </Badge>
                        <button
                          onClick={() => toggleFavorite(res)}
                          className="text-amber-500 hover:scale-110 transition-transform p-0.5 rounded"
                        >
                          <Star className={`h-4 w-4 ${res.is_favorite === 1 ? 'fill-amber-500' : ''}`} />
                        </button>
                      </div>
                      <CardTitle
                        onClick={() => openExternalLink(res.url)}
                        className="text-sm font-bold mt-2 cursor-pointer hover:text-primary transition-colors text-right line-clamp-1 leading-snug"
                        title={res.title}
                      >
                        {res.title}
                      </CardTitle>
                      <CardDescription className="text-[10px] break-all truncate max-w-full font-mono text-left block" dir="ltr">
                        {res.url}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="pb-3 text-xs space-y-2">
                      <p className="text-muted-foreground line-clamp-2 h-8 leading-relaxed">
                        {res.notes || 'لا توجد ملاحظات مضافة.'}
                      </p>
                      
                      {/* Tags list */}
                      {tagsList.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {tagsList.map((t: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-[9px] py-0 px-1.5">{t}</Badge>
                          ))}
                        </div>
                      )}

                      {/* Citation panel expanded */}
                      {selectedResourceId === res.id && (
                        <div className="mt-4 pt-4 border-t space-y-3" onClick={(e) => e.stopPropagation()}>
                          <CitationPanel resource={res} />
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="p-3 border-t bg-muted/15 flex justify-between text-xs">
                      {course ? (
                        <Badge variant="outline" style={{ borderColor: course.color, color: course.color }} className="text-[9px]">
                          {course.name}
                        </Badge>
                      ) : (
                        <span />
                      )}
                      
                      <div className="flex gap-2">
                        <Button size="sm" variant={selectedResourceId === res.id ? 'secondary' : 'ghost'} className="p-1 h-7 text-xs flex gap-1 font-bold" onClick={() => setSelectedResourceId(selectedResourceId === res.id ? null : res.id)}>
                          📚 اقتباس
                        </Button>
                        <Button size="sm" variant="ghost" className="p-1 h-7 text-xs flex gap-1" onClick={() => openExternalLink(res.url)}>
                          <ExternalLink className="h-3 w-3" /> زيارة الرابط
                        </Button>
                        <Button size="sm" variant="ghost" className="p-1 h-7 text-destructive" onClick={() => handleDeleteResource(res.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Resource Dialog Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogHeader>
          <DialogTitle>إضافة مرجع دراسي جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAddResource}>
          <DialogContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold">عنوان المرجع *</label>
              <Input
                required
                value={newRes.title}
                onChange={e => setNewRes({ ...newRes, title: e.target.value })}
                placeholder="مثال: كتاب هياكل البيانات للمبتدئين"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold">الرابط الإلكتروني (URL) *</label>
              <Input
                required
                type="url"
                value={newRes.url}
                onChange={e => setNewRes({ ...newRes, url: e.target.value })}
                placeholder="https://example.com/book"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold">تصنيف المرجع *</label>
                <Select value={newRes.category} onChange={e => setNewRes({ ...newRes, category: e.target.value })}>
                  <option value="book">كتاب</option>
                  <option value="article">مقال / ورقة علمية</option>
                  <option value="video">فيديو تعليمي</option>
                  <option value="course">موقع ويب / دورة</option>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold">المقرر الدراسي المرتبط</label>
                <Select value={newRes.courseId} onChange={e => setNewRes({ ...newRes, courseId: e.target.value })}>
                  <option value="">لا يوجد مقرر...</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold">الوسوم (مفصولة بفاصلة ,)</label>
                <Input
                  value={newRes.tags}
                  onChange={e => setNewRes({ ...newRes, tags: e.target.value })}
                  placeholder="مثال: برمجة, مراجعة, خوارزميات"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold">تقييم المرجع (1 - 5 نجوم)</label>
                <Select value={newRes.rating} onChange={e => setNewRes({ ...newRes, rating: e.target.value })}>
                  <option value="5">⭐⭐⭐⭐⭐ ممتاز (5)</option>
                  <option value="4">⭐⭐⭐⭐ جيد جداً (4)</option>
                  <option value="3">⭐⭐⭐ متوسط (3)</option>
                  <option value="2">⭐⭐ مقبول (2)</option>
                  <option value="1">⭐ ضعيف (1)</option>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold">ملاحظات حول المرجع</label>
              <Textarea
                value={newRes.notes}
                onChange={e => setNewRes({ ...newRes, notes: e.target.value })}
                placeholder="اكتب فكرة سريعة أو الفصل المخصص في هذا المرجع..."
              />
            </div>
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit">إضافة المرجع</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  )
}
