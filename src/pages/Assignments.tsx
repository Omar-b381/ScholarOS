import * as React from 'react'
import { useAppStore, Assignment, Course } from '@/store/useAppStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { KanbanBoard } from './Assignments/KanbanBoard'

import {
  FileSpreadsheet,
  Folder,
  Upload,
  Search,
  Eye,
  Trash2,
  Plus,
  Paperclip,
  CheckCircle,
  Clock,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  FolderOpen
} from 'lucide-react'

// Set pdf.js worker URL from CDN for smooth rendering
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

export function Assignments() {
  const {
    assignments,
    courses,
    saveAssignment,
    deleteAssignment
  } = useAppStore()

  // Tabs state
  const [activeTab, setActiveTab] = React.useState('assignments')

  // PDF Vault states
  const [pdfs, setPdfs] = React.useState<any[]>([])
  const [searchQuery, setSearchQuery] = React.useState('')
  const [previewPdfPath, setPreviewPdfPath] = React.useState<string | null>(null)
  const [previewPdfBytes, setPreviewPdfBytes] = React.useState<string | null>(null)

  // react-pdf renderer pages settings
  const [numPages, setNumPages] = React.useState<number | null>(null)
  const [pageNumber, setPageNumber] = React.useState<number>(1)
  const [zoomScale, setZoomScale] = React.useState<number>(1.0)

  // Assignments filter states
  const [courseFilter, setCourseFilter] = React.useState('all')
  const [statusFilter, setStatusFilter] = React.useState('all')

  // Assignment Modal
  const [assignmentModalOpen, setAssignmentModalOpen] = React.useState(false)
  const [editingAssignment, setEditingAssignment] = React.useState<any>(null)

  React.useEffect(() => {
    loadPDFsList()
  }, [])

  const loadPDFsList = async () => {
    try {
      const list = await window.electronAPI.files.listPDFs()
      setPdfs(list)
    } catch (err) {
      console.error('Failed to list PDFs', err)
    }
  }

  const loadAssignments = async () => {
    try {
      const list = await window.electronAPI.db.assignments.getAll()
      useAppStore.setState({ assignments: list })
    } catch (err) {
      console.error('Failed to reload assignments', err)
    }
  }

  // Filtered Assignments
  const filteredAssignments = React.useMemo(() => {
    let list = [...assignments]
    if (courseFilter !== 'all') {
      list = list.filter(a => a.course_id === courseFilter)
    }
    if (statusFilter !== 'all') {
      list = list.filter(a => a.status === statusFilter)
    }
    return list
  }, [assignments, courseFilter, statusFilter])

  // PDF upload
  const handleUploadPDF = async () => {
    try {
      const filePaths = await window.electronAPI.app.selectFile({
        title: 'اختر ملف PDF لرفعه إلى الخزانة',
        filters: [{ name: 'ملفات PDF', extensions: ['pdf'] }],
        properties: ['openFile']
      })

      if (filePaths && filePaths.length > 0) {
        const sourcePath = filePaths[0]
        const destName = sourcePath.split(/[\\/]/).pop() || 'document.pdf'
        
        await window.electronAPI.files.uploadPDF({ sourcePath, destName })
        loadPDFsList()
        alert('تم رفع الملف بنجاح إلى الخزانة الدراسية!')
      }
    } catch (err) {
      console.error(err)
      alert('فضل رفع ملف PDF المختار')
    }
  }

  // PDF delete
  const handleDeletePDF = async (filePath: string) => {
    // Standard delete or remove linked references if any
    alert('لحذف الملف نهائياً يرجى حذفه من مجلد المستندات الخاص بالبرنامج.')
  }

  // PDF In-App Preview triggering
  const triggerPDFPreview = async (pdfPath: string) => {
    try {
      setPreviewPdfPath(pdfPath)
      setPreviewPdfBytes(null)
      setPageNumber(1)
      setNumPages(null)

      const base64Bytes = await window.electronAPI.files.readPDFBase64(pdfPath)
      setPreviewPdfBytes(base64Bytes)
    } catch (err) {
      console.error('Failed to preview PDF', err)
      alert('فشل قراءة ملف الـ PDF لمعاينته.')
      setPreviewPdfPath(null)
    }
  }

  // PDF render callback
  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
    setPageNumber(1)
  }

  // Assignment Modal CRUD triggers
  const openAddAssignment = () => {
    setEditingAssignment({
      id: '',
      title: '',
      course_id: '',
      due_date: new Date().toISOString().substring(0, 16),
      status: 'pending',
      grade: '',
      notes: '',
      pdf_path: ''
    })
    setAssignmentModalOpen(true)
  }

  const openEditAssignment = (asg: Assignment) => {
    setEditingAssignment({
      ...asg,
      due_date: asg.due_date.substring(0, 16)
    })
    setAssignmentModalOpen(true)
  }

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingAssignment.title || !editingAssignment.course_id || !editingAssignment.due_date) return

    const id = editingAssignment.id || crypto.randomUUID()
    await saveAssignment({
      ...editingAssignment,
      id
    })
    setAssignmentModalOpen(false)
  }

  const handleDeleteAssignment = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الواجب؟')) {
      await deleteAssignment(id)
    }
  }

  // PDF Vault auto folders (organized by course)
  const courseFolderMap = React.useMemo(() => {
    const folders: Record<string, { courseName: string; color: string; files: any[] }> = {}
    
    // Unassigned folder
    folders['unassigned'] = {
      courseName: 'مستندات عامة',
      color: '#9ca3af',
      files: []
    }

    courses.forEach(c => {
      folders[c.id] = {
        courseName: c.name,
        color: c.color,
        files: []
      }
    })

    // Grouping pdfs based on whether they are linked to an assignment
    pdfs.forEach(pdf => {
      // Find assignment linked to this pdf
      const matchedAsg = assignments.find(a => a.pdf_path === pdf.path)
      if (matchedAsg && folders[matchedAsg.course_id]) {
        folders[matchedAsg.course_id].files.push(pdf)
      } else {
        folders['unassigned'].files.push(pdf)
      }
    })

    return folders
  }, [pdfs, courses, assignments])

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto h-full overflow-y-auto scrollbar-thin">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">الواجبات وخزانة المستندات</h1>
          <p className="text-sm text-muted-foreground mt-1">تتبع درجات الواجبات الدراسية وحفظ المراجع وملفات PDF</p>
        </div>
      </div>

      <Tabs defaultValue="assignments" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-[600px]">
          <TabsTrigger value="assignments">الواجبات الدراسية</TabsTrigger>
          <TabsTrigger value="kanban">لوحة كانبان</TabsTrigger>
          <TabsTrigger value="vault">خزانة الـ PDF</TabsTrigger>
        </TabsList>

        {/* TAB A: Assignments Table */}
        <TabsContent value="assignments" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle className="text-lg">تتبع الواجبات</CardTitle>
                <CardDescription>جدول بجميع الواجبات والمشروعات وحالة تسليمها</CardDescription>
              </div>
              <Button onClick={openAddAssignment} className="gap-1.5">
                <Plus className="h-4 w-4" /> إضافة واجب
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-4 items-center bg-muted/30 p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground">المادة:</span>
                  <Select className="w-40 h-8" value={courseFilter} onChange={e => setCourseFilter(e.target.value)}>
                    <option value="all">كل المواد</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground">الحالة:</span>
                  <Select className="w-40 h-8" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="all">كل الحالات</option>
                    <option value="pending">قيد الانتظار</option>
                    <option value="submitted">تم التسليم</option>
                    <option value="graded">تم التصحيح</option>
                  </Select>
                </div>
              </div>

              {filteredAssignments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-center">
                  <Clock className="h-10 w-10 opacity-30 mb-2" />
                  <p className="text-sm font-semibold">لا يوجد واجبات مطابقة للتصفية</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الواجب</TableHead>
                      <TableHead>المادة</TableHead>
                      <TableHead>تاريخ التسليم</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>الدرجة</TableHead>
                      <TableHead>مستند مرتبط</TableHead>
                      <TableHead className="text-left">العمليات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssignments.map((a) => {
                      const course = courses.find(c => c.id === a.course_id)
                      const isOverdue = new Date(a.due_date) < new Date() && a.status === 'pending'
                      
                      return (
                        <TableRow key={a.id}>
                          <TableCell className="font-bold">{a.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline" style={{ borderColor: course?.color, color: course?.color }}>
                              {course ? course.name : 'عام'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={isOverdue ? 'text-destructive font-bold' : ''}>
                              {new Date(a.due_date).toLocaleDateString('ar-EG', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                              {isOverdue && ' (متأخر)'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                a.status === 'graded' ? 'success' :
                                a.status === 'submitted' ? 'info' : 'warning'
                              }
                            >
                              {a.status === 'graded' ? 'تم التصحيح' :
                               a.status === 'submitted' ? 'تم التسليم' : 'قيد الانتظار'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono font-bold">
                            {a.grade ? a.grade : '-'}
                          </TableCell>
                          <TableCell>
                            {a.pdf_path ? (
                              <button
                                onClick={() => triggerPDFPreview(a.pdf_path)}
                                className="flex items-center gap-1.5 text-xs text-primary hover:underline text-right"
                              >
                                <Paperclip className="h-3 w-3" />
                                <span className="truncate max-w-[120px]">{a.pdf_path.split(/[\\/]/).pop()}</span>
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-left">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="ghost" onClick={() => openEditAssignment(a)}>
                                تعديل
                              </Button>
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteAssignment(a.id)}>
                                حذف
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB C: Kanban Board */}
        <TabsContent value="kanban" className="space-y-4 mt-6">
          <KanbanBoard assignments={assignments} onUpdate={loadAssignments} />
        </TabsContent>

        {/* TAB B: PDF Vault */}
        <TabsContent value="vault" className="space-y-4 mt-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-muted/20 p-4 rounded-xl border">
            {/* Search */}
            <div className="relative w-full max-w-sm">
              <Search className="absolute right-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
              <Input
                className="pr-10"
                placeholder="ابحث عن ملف بالاسم..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <Button onClick={handleUploadPDF} className="gap-1.5">
              <Upload className="h-4 w-4" /> رفع ملف PDF جديد
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Folders & Documents View */}
            <div className="space-y-6">
              {Object.keys(courseFolderMap).map((folderKey) => {
                const folder = courseFolderMap[folderKey]
                // Filter files inside this folder based on search query
                const filteredFiles = folder.files.filter(f =>
                  f.name.toLowerCase().includes(searchQuery.toLowerCase())
                )

                if (filteredFiles.length === 0 && folderKey !== 'unassigned') return null

                return (
                  <Card key={folderKey}>
                    <CardHeader className="py-4 border-b flex flex-row items-center gap-3">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: `${folder.color}15` }}>
                        <FolderOpen className="h-5 w-5" style={{ color: folder.color }} />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold">{folder.courseName}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">{filteredFiles.length} ملفات</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {filteredFiles.length === 0 ? (
                        <div className="p-4 text-xs text-muted-foreground text-center">لا توجد ملفات في هذا المجلد.</div>
                      ) : (
                        <div className="divide-y divide-border">
                          {filteredFiles.map((pdf, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-3.5 hover:bg-accent/30 transition-colors text-sm"
                            >
                              <div className="flex items-center gap-2 overflow-hidden max-w-[70%]">
                                <FileSpreadsheet className="h-4.5 w-4.5 text-red-500 shrink-0" />
                                <span className="font-semibold truncate">{pdf.name}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Button size="sm" variant="ghost" onClick={() => triggerPDFPreview(pdf.path)} className="gap-1 px-2.5 h-8">
                                  <Eye className="h-3.5 w-3.5" /> معاينة
                                </Button>
                                <Button size="sm" variant="ghost" className="text-destructive px-2 h-8" onClick={() => handleDeletePDF(pdf.path)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* In-App PDF Preview Screen */}
            <div>
              <Card className="h-[600px] flex flex-col sticky top-6">
                <CardHeader className="py-4 border-b">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Eye className="h-5 w-5 text-primary" />
                    <span>المعاين الداخلي للمستندات</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto bg-muted/40 p-4 flex justify-center items-start scrollbar-thin">
                  {previewPdfPath && previewPdfBytes ? (
                    <div className="flex flex-col items-center gap-4 w-full">
                      {/* Controller */}
                      <div className="flex flex-wrap gap-2 items-center justify-between w-full bg-card p-2 rounded-lg border shadow-sm text-xs sticky top-0 z-10">
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="p-1 h-7 w-7"
                            disabled={pageNumber <= 1}
                            onClick={() => setPageNumber(prev => Math.max(1, prev - 1))}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                          <span className="self-center">صفحة {pageNumber} من {numPages || '?'}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="p-1 h-7 w-7"
                            disabled={numPages ? pageNumber >= numPages : true}
                            onClick={() => setPageNumber(prev => Math.min(numPages || prev, prev + 1))}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="p-1 h-7 w-7" onClick={() => setZoomScale(prev => Math.max(0.5, prev - 0.1))}>
                            <ZoomOut className="h-4 w-4" />
                          </Button>
                          <span className="self-center font-mono">{Math.round(zoomScale * 100)}%</span>
                          <Button size="sm" variant="outline" className="p-1 h-7 w-7" onClick={() => setZoomScale(prev => Math.min(2.0, prev + 0.1))}>
                            <ZoomIn className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* PDF Pages Document */}
                      <div className="border bg-card rounded shadow-md overflow-hidden p-2">
                        <Document
                          file={{ data: Buffer.from(previewPdfBytes, 'base64') }}
                          onLoadSuccess={onDocumentLoadSuccess}
                          loading={<span className="text-xs text-muted-foreground">جاري تحميل المستند...</span>}
                          error={<span className="text-xs text-destructive">فشل تحميل ملف PDF</span>}
                        >
                          <Page pageNumber={pageNumber} scale={zoomScale} renderTextLayer={false} renderAnnotationLayer={false} />
                        </Document>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground text-center py-20">
                      <FileSpreadsheet className="h-16 w-16 opacity-30 mb-4" />
                      <h4 className="font-bold">معاينة المستند</h4>
                      <p className="text-xs max-w-[200px] mt-2">انقر على زر "معاينة" بجانب أي مستند PDF لفتحه وقراءته هنا مباشرة.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Assignment Add/Edit Modal */}
      {editingAssignment && (
        <Dialog open={assignmentModalOpen} onOpenChange={setAssignmentModalOpen}>
          <DialogHeader>
            <DialogTitle>
              {editingAssignment.id ? 'تعديل بيانات الواجب' : 'إضافة واجب دراسي جديد'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveAssignment}>
            <DialogContent className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold">عنوان الواجب *</label>
                <Input
                  required
                  value={editingAssignment.title}
                  onChange={e => setEditingAssignment({ ...editingAssignment, title: e.target.value })}
                  placeholder="مثال: الواجب الأول في الشبكات"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold">المادة الدراسية *</label>
                  <Select
                    required
                    value={editingAssignment.course_id}
                    onChange={e => setEditingAssignment({ ...editingAssignment, course_id: e.target.value })}
                  >
                    <option value="">اختر المادة...</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold">تاريخ الاستحقاق *</label>
                  <Input
                    required
                    type="datetime-local"
                    value={editingAssignment.due_date}
                    onChange={e => setEditingAssignment({ ...editingAssignment, due_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold">حالة التسليم</label>
                  <Select
                    value={editingAssignment.status}
                    onChange={e => setEditingAssignment({ ...editingAssignment, status: e.target.value as any })}
                  >
                    <option value="pending">قيد الانتظار</option>
                    <option value="submitted">تم التسليم</option>
                    <option value="graded">تم التصحيح ورصد الدرجة</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold">الدرجة المستحقة (رصد)</label>
                  <Input
                    placeholder="مثال: 95/100"
                    value={editingAssignment.grade}
                    onChange={e => setEditingAssignment({ ...editingAssignment, grade: e.target.value })}
                  />
                </div>
              </div>

              {/* Link PDF option */}
              <div className="space-y-1">
                <label className="text-xs font-bold">ربط مستند PDF من الخزانة</label>
                <Select
                  value={editingAssignment.pdf_path}
                  onChange={e => setEditingAssignment({ ...editingAssignment, pdf_path: e.target.value })}
                >
                  <option value="">لا يوجد ملف مرتبط...</option>
                  {pdfs.map((pdf, idx) => (
                    <option key={idx} value={pdf.path}>{pdf.name}</option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold">ملاحظات وتعليمات الواجب</label>
                <Textarea
                  value={editingAssignment.notes}
                  onChange={e => setEditingAssignment({ ...editingAssignment, notes: e.target.value })}
                  placeholder="تعليمات أو روابط التسليم..."
                />
              </div>
            </DialogContent>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAssignmentModalOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit">حفظ التعديلات</Button>
            </DialogFooter>
          </form>
        </Dialog>
      )}
    </div>
  )
}
