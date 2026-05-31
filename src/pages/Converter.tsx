import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  FileText,
  Merge,
  Scissors,
  FileImage,
  ImageIcon,
  Settings,
  ArrowRight,
  Plus,
  Trash2,
  CheckCircle,
  FileUp,
  ExternalLink
} from 'lucide-react'

export function Converter() {
  // Merge PDF States
  const [mergeFiles, setMergeFiles] = React.useState<string[]>([])
  const [mergeResult, setMergeResult] = React.useState<string | null>(null)

  // Split PDF States
  const [splitFile, setSplitFile] = React.useState<string | null>(null)
  const [splitRange, setSplitRange] = React.useState('1-2')
  const [splitResult, setSplitResult] = React.useState<string[] | null>(null)

  // Images to PDF States
  const [imagesList, setImagesList] = React.useState<string[]>([])
  const [imagesPdfResult, setImagesPdfResult] = React.useState<string | null>(null)

  // Image converter states
  const [targetImage, setTargetImage] = React.useState<string | null>(null)
  const [imgFormat, setImgFormat] = React.useState('webp')
  const [imgWidth, setImgWidth] = React.useState('')
  const [imgQuality, setImgQuality] = React.useState('80')
  const [imageConvertResult, setImageConvertResult] = React.useState<string | null>(null)

  const [isLoading, setIsLoading] = React.useState(false)

  // Handlers
  const handleSelectMergeFiles = async () => {
    try {
      const paths = await window.electronAPI.app.selectFile({
        title: 'اختر ملفات PDF لدمجها',
        filters: [{ name: 'ملفات PDF', extensions: ['pdf'] }],
        properties: ['openFile', 'multiSelections']
      })
      if (paths) {
        setMergeFiles(prev => [...prev, ...paths])
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleMergePDFs = async () => {
    if (mergeFiles.length < 2) return
    setIsLoading(true)
    setMergeResult(null)
    try {
      const res = await window.electronAPI.files.mergePDFs(mergeFiles)
      if (res.success) {
        setMergeResult(res.filePath)
        setMergeFiles([])
      }
    } catch (err: any) {
      alert(err.message || 'فشل دمج ملفات الـ PDF المحددة')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectSplitFile = async () => {
    try {
      const paths = await window.electronAPI.app.selectFile({
        title: 'اختر ملف PDF لتقسيمه',
        filters: [{ name: 'ملفات PDF', extensions: ['pdf'] }],
        properties: ['openFile']
      })
      if (paths && paths.length > 0) {
        setSplitFile(paths[0])
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSplitPDF = async () => {
    if (!splitFile || !splitRange) return
    setIsLoading(true)
    setSplitResult(null)
    try {
      const res = await window.electronAPI.files.splitPDF({
        pdfPath: splitFile,
        ranges: splitRange
      })
      if (res.success) {
        setSplitResult(res.files)
        setSplitFile(null)
      }
    } catch (err: any) {
      alert(err.message || 'فشل تقسيم ملف الـ PDF')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectImages = async () => {
    try {
      const paths = await window.electronAPI.app.selectFile({
        title: 'اختر الصور لجمعها في ملف PDF',
        filters: [{ name: 'الصور', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
        properties: ['openFile', 'multiSelections']
      })
      if (paths) {
        setImagesList(prev => [...prev, ...paths])
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleConvertImagesToPdf = async () => {
    if (imagesList.length === 0) return
    setIsLoading(true)
    setImagesPdfResult(null)
    try {
      const res = await window.electronAPI.files.convertImagesToPDF(imagesList)
      if (res.success) {
        setImagesPdfResult(res.filePath)
        setImagesList([])
      }
    } catch (err: any) {
      alert(err.message || 'فشل تحويل الصور إلى PDF')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectImageForConvert = async () => {
    try {
      const paths = await window.electronAPI.app.selectFile({
        title: 'اختر صورة لتغيير صيغتها أو ضغطها',
        filters: [{ name: 'الصور', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
        properties: ['openFile']
      })
      if (paths && paths.length > 0) {
        setTargetImage(paths[0])
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleConvertImage = async () => {
    if (!targetImage) return
    setIsLoading(true)
    setImageConvertResult(null)
    try {
      const res = await window.electronAPI.files.convertImage({
        imagePath: targetImage,
        format: imgFormat,
        width: imgWidth ? parseInt(imgWidth, 10) : undefined,
        quality: imgQuality ? parseInt(imgQuality, 10) : undefined
      })
      if (res.success) {
        setImageConvertResult(res.filePath)
        setTargetImage(null)
      }
    } catch (err: any) {
      alert(err.message || 'فشل معالجة الصورة المطلوبة')
    } finally {
      setIsLoading(false)
    }
  }

  const openResultFile = (path: string) => {
    window.electronAPI.files.openPDF(path).catch(console.error)
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto h-full overflow-y-auto scrollbar-thin">
      {/* Header */}
      <div className="border-b pb-4">
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight font-black">الأدوات: محول الملفات والصور</h1>
        <p className="text-sm text-muted-foreground mt-1">دمج وتقسيم مستندات PDF، تحويل الصور وضغطها محلياً بأمان وبسرعة</p>
      </div>

      <Tabs defaultValue="pdf-tools">
        <TabsList className="grid w-full grid-cols-3 max-w-[500px]">
          <TabsTrigger value="pdf-tools">دمج وتقسيم PDF</TabsTrigger>
          <TabsTrigger value="images-pdf">الصور إلى PDF</TabsTrigger>
          <TabsTrigger value="image-compress">ضغط وتحويل الصور</TabsTrigger>
        </TabsList>

        {/* TAB 1: Merge & Split PDF */}
        <TabsContent value="pdf-tools" className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Merge PDFs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Merge className="h-5 w-5 text-primary" />
                <span>دمج ملفات PDF</span>
              </CardTitle>
              <CardDescription>اختر عدة مستندات PDF لدمجها في مستند واحد مرتب</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" className="w-full gap-1.5" onClick={handleSelectMergeFiles}>
                  <FileUp className="h-4 w-4" /> اختر ملفات الـ PDF
                </Button>
              </div>

              {/* Selected Files List */}
              {mergeFiles.length > 0 && (
                <div className="border rounded-lg max-h-48 overflow-y-auto divide-y divide-border">
                  {mergeFiles.map((file, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2.5 text-xs text-right">
                      <span className="truncate max-w-[80%] font-semibold font-mono" dir="ltr">
                        {file.split(/[\\/]/).pop()}
                      </span>
                      <button
                        onClick={() => setMergeFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="text-destructive hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                className="w-full"
                disabled={mergeFiles.length < 2 || isLoading}
                onClick={handleMergePDFs}
              >
                {isLoading ? 'جاري الدمج...' : 'دمج الملفات المحددة'}
              </Button>

              {/* Success Result Link */}
              {mergeResult && (
                <div className="p-3 bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg border border-green-500/20 text-xs flex justify-between items-center">
                  <span className="font-semibold">تم دمج الملف بنجاح!</span>
                  <Button size="sm" variant="link" className="h-auto p-0 flex items-center gap-1" onClick={() => openResultFile(mergeResult)}>
                    <span>فتح الملف</span>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Split PDF */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Scissors className="h-5 w-5 text-primary" />
                <span>تقسيم ملف PDF</span>
              </CardTitle>
              <CardDescription>استخرج صفحات معينة من ملف PDF</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Button variant="outline" className="w-full gap-1.5" onClick={handleSelectSplitFile}>
                  <FileUp className="h-4 w-4" />
                  <span>{splitFile ? splitFile.split(/[\\/]/).pop() : 'اختر ملف PDF المصدري'}</span>
                </Button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">نطاق الصفحات المراد استخراجها</label>
                <Input
                  value={splitRange}
                  onChange={e => setSplitRange(e.target.value)}
                  placeholder="مثال: 1-3, 5 (الصفحات من 1 إلى 3، والصفحة 5)"
                />
              </div>

              <Button
                className="w-full"
                disabled={!splitFile || !splitRange || isLoading}
                onClick={handleSplitPDF}
              >
                {isLoading ? 'جاري التقسيم...' : 'تقسيم واستخراج الصفحات'}
              </Button>

              {/* Split Result links */}
              {splitResult && (
                <div className="space-y-2">
                  <div className="p-2.5 bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg border text-xs">
                    تم تقسيم واستخراج الملفات بنجاح في مجلد المستندات!
                  </div>
                  {splitResult.map((file, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 rounded border bg-card text-xs">
                      <span className="truncate max-w-[80%] font-mono" dir="ltr">{file.split(/[\\/]/).pop()}</span>
                      <Button size="sm" variant="link" className="p-0 h-auto" onClick={() => openResultFile(file)}>فتح</Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Images to PDF */}
        <TabsContent value="images-pdf" className="mt-6 max-w-xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileImage className="h-5 w-5 text-primary" />
                <span>تحويل وتجميع الصور إلى ملف PDF</span>
              </CardTitle>
              <CardDescription>اختر عدة صور لجمعها وترتيبها في صفحات مستند PDF واحد</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full gap-1.5" onClick={handleSelectImages}>
                <Plus className="h-4 w-4" /> اختر الصور
              </Button>

              {/* List of images */}
              {imagesList.length > 0 && (
                <div className="border rounded-lg divide-y divide-border max-h-48 overflow-y-auto">
                  {imagesList.map((img, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2.5 text-xs">
                      <span className="truncate max-w-[85%] font-mono" dir="ltr">{img.split(/[\\/]/).pop()}</span>
                      <button onClick={() => setImagesList(prev => prev.filter((_, i) => i !== idx))} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                className="w-full"
                disabled={imagesList.length === 0 || isLoading}
                onClick={handleConvertImagesToPdf}
              >
                {isLoading ? 'جاري التحويل وتوليد الـ PDF...' : 'توليد ملف PDF من الصور المحددة'}
              </Button>

              {imagesPdfResult && (
                <div className="p-3 bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg border border-green-500/20 text-xs flex justify-between items-center">
                  <span>تم توليد ملف PDF بنجاح!</span>
                  <Button size="sm" variant="link" className="p-0 h-auto flex items-center gap-1" onClick={() => openResultFile(imagesPdfResult)}>
                    <span>فتح الملف الناتج</span>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Image compress and convert */}
        <TabsContent value="image-compress" className="mt-6 max-w-xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                <span>تحويل وضغط الصور</span>
              </CardTitle>
              <CardDescription>تغيير أبعاد وضغط حجم الصور محلياً مع الحفاظ على الجودة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full gap-1.5 text-right" onClick={handleSelectImageForConvert}>
                <FileUp className="h-4 w-4" />
                <span>{targetImage ? targetImage.split(/[\\/]/).pop() : 'اختر صورة المصدر'}</span>
              </Button>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">صيغة التحويل</label>
                  <Select value={imgFormat} onChange={e => setImgFormat(e.target.value)}>
                    <option value="webp">WEBP (حديث ومضغوط)</option>
                    <option value="jpeg">JPG / JPEG</option>
                    <option value="png">PNG (جودة عالية شفافة)</option>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">العرض بالبكسل (اختياري)</label>
                  <Input
                    type="number"
                    placeholder="مثال: 800"
                    value={imgWidth}
                    onChange={e => setImgWidth(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">نسبة الجودة (10 - 100)</label>
                  <Input
                    type="number"
                    value={imgQuality}
                    onChange={e => setImgQuality(e.target.value)}
                  />
                </div>
              </div>

              <Button
                className="w-full"
                disabled={!targetImage || isLoading}
                onClick={handleConvertImage}
              >
                {isLoading ? 'جاري تحويل ومعالجة الصورة...' : 'معالجة وتحويل الصورة'}
              </Button>

              {imageConvertResult && (
                <div className="p-3 bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg border border-green-500/20 text-xs flex justify-between items-center">
                  <span>تمت معالجة الصورة وحفظها بنجاح!</span>
                  <Button size="sm" variant="link" className="p-0 h-auto flex items-center gap-1" onClick={() => openResultFile(imageConvertResult)}>
                    <span>فتح الصورة</span>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
