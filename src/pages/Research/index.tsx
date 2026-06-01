import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

export function ResearchPage() {
  const [query, setQuery] = useState('')
  const [papers, setPapers] = useState<any[]>([])
  const [books, setBooks] = useState<any[]>([])
  const [savedBooks, setSavedBooks] = useState<any[]>([])
  const [doi, setDoi] = useState('')
  const [doiData, setDoiData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadSavedBooks()
  }, [])

  async function loadSavedBooks() {
    try {
      const list = await window.electronAPI.research_getSavedBooks()
      setSavedBooks(list || [])
    } catch (err) {
      console.error(err)
    }
  }

  async function searchPapers() {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await window.electronAPI.research_searchPapers(query)
      if (res && res.error) {
        setError(res.error)
      } else {
        setPapers((res && res.papers) || [])
      }
    } catch (err) {
      console.error(err)
      setError('خطأ في الاتصال بالشبكة')
    }
    setLoading(false)
  }

  async function searchBooks() {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await window.electronAPI.research_searchBooks(query)
      if (res && res.error) {
        setError(res.error)
      } else {
        setBooks((res && res.books) || [])
      }
    } catch (err) {
      console.error(err)
      setError('خطأ في الاتصال بقاعدة بيانات الكتب')
    }
    setLoading(false)
  }

  async function lookupDOI() {
    if (!doi.trim()) return
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await window.electronAPI.research_fetchByDOI(doi.trim())
      setDoiData(res.error ? null : res.data)
      if (res.error) setError(res.error)
    } catch (err) {
      console.error(err)
      setError('حدث خطأ في الاتصال بمخدم DOI')
    }
    setLoading(false)
  }

  async function saveBook(book: any) {
    setError('')
    setSuccess('')
    try {
      await window.electronAPI.research_saveBook({
        isbn: book.isbn || '',
        title: book.title,
        author: book.author || '',
        year: String(book.year || ''),
        cover_url: book.coverUrl || '',
        ol_key: book.olKey || '',
        course_id: '',
        notes: 'مستورد من البحث الأكاديمي المفتوح',
      })
      setSuccess(`تم حفظ كتاب "${book.title}" بنجاح في خزنتك الدراسية!`)
      loadSavedBooks()
    } catch (err) {
      console.error(err)
      setError('فشل حفظ المرجع في خزانة الكتب')
    }
  }

  function openExternal(url: string) {
    if (window.electronAPI?.app?.openExternal) {
      window.electronAPI.app.openExternal(url).catch(console.error)
    }
  }

  return (
    <div className="p-6 flex flex-col gap-6 max-w-4xl mx-auto h-full overflow-y-auto scrollbar-thin" dir="rtl">
      <div className="flex flex-col border-b pb-4">
        <h1 className="text-2xl font-extrabold text-foreground">البحث الأكاديمي والمراجع 🎓</h1>
        <p className="text-xs text-muted-foreground mt-1">ابحث عن أوراق علمية، كتب، وجلب تلقائي للاستشهادات من خلال المعرف الرقمي DOI</p>
      </div>

      {/* Search Input Bar */}
      <div className="flex gap-2 bg-card p-3 border rounded-xl shadow-sm">
        <Input
          placeholder="ابحث بالكلمات المفتاحية... مثال: Machine Learning, Quantum Computing"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') searchPapers()
          }}
          className="flex-1 text-sm font-semibold"
        />
        <Button onClick={searchPapers} disabled={loading} className="font-bold">
          {loading ? 'بحث...' : 'بحث أوراق 📄'}
        </Button>
        <Button variant="outline" onClick={searchBooks} disabled={loading} className="font-bold">
          بحث كتب 📚
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs rounded-xl border border-red-200 dark:border-red-900/50 font-bold">
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 text-xs rounded-xl border border-green-200 dark:border-green-900/50 font-bold">
          ✓ {success}
        </div>
      )}

      <Tabs defaultValue="papers" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="papers">أوراق علمية ({papers.length})</TabsTrigger>
          <TabsTrigger value="books">كتب المقترحة ({books.length})</TabsTrigger>
          <TabsTrigger value="saved">الكتب المحفوظة ({savedBooks.length})</TabsTrigger>
          <TabsTrigger value="doi">معرف DOI</TabsTrigger>
        </TabsList>

        {/* Papers list */}
        <TabsContent value="papers" className="space-y-3">
          {papers.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center bg-card border rounded-xl p-6">
              <span className="text-4xl mb-3">📄</span>
              <p className="text-sm font-bold">البحث في الأبحاث والمسودات العلمية</p>
              <p className="text-xs text-muted-foreground max-w-xs mt-2">ابحث بالأعلى لعرض أحدث الأبحاث العلمية الموثقة من Semantic Scholar مع روابط التحميل المباشرة.</p>
            </div>
          )}
          {papers.map(p => (
            <div key={p.id} className="border rounded-xl p-4 bg-card flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <p className="font-bold text-sm leading-snug text-foreground text-right">{p.title}</p>
                <Badge variant="outline" className="shrink-0 text-[10px] font-extrabold border-primary/20 text-primary">
                  {p.citations} اقتباس
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground font-semibold">{p.authors} — {p.year}</p>
              {p.abstract && (
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed bg-muted/20 p-2 rounded-lg">{p.abstract}</p>
              )}
              <div className="flex gap-2 mt-1">
                {p.pdfUrl && (
                  <Button size="sm" variant="outline" className="text-xs font-bold"
                    onClick={() => openExternal(p.pdfUrl)}>
                    📥 تحميل PDF مجاناً
                  </Button>
                )}
                {p.doi && (
                  <Button size="sm" variant="ghost" className="text-xs font-bold"
                    onClick={() => openExternal(`https://doi.org/${p.doi}`)}>
                    🔗 فتح DOI
                  </Button>
                )}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* Books search list */}
        <TabsContent value="books" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {books.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center bg-card border rounded-xl p-6 col-span-2">
              <span className="text-4xl mb-3">📚</span>
              <p className="text-sm font-bold">البحث عن كتب ومراجع أكاديمية</p>
              <p className="text-xs text-muted-foreground max-w-xs mt-2">ابحث بالأعلى باللغة الإنجليزية للوصول لأكثر من ملايين الكتب المجانية في مكتبة المفتوحة Open Library وحفظها محلياً.</p>
            </div>
          )}
          {books.map((b, i) => (
            <div key={i} className="border rounded-xl p-4 bg-card flex gap-4 shadow-sm hover:shadow-md transition-shadow">
              {b.coverUrl ? (
                <img src={b.coverUrl} alt={b.title}
                  className="w-14 h-20 object-cover rounded-lg shrink-0 shadow-sm border" />
              ) : (
                <div className="w-14 h-20 bg-muted/40 rounded-lg shrink-0 flex items-center justify-center text-xs text-muted-foreground font-bold">
                  لا غلاف
                </div>
              )}
              <div className="flex flex-col gap-1 flex-1">
                <p className="text-xs font-bold leading-snug line-clamp-2 text-foreground">{b.title}</p>
                <p className="text-[10px] text-muted-foreground font-semibold truncate">{b.author}</p>
                <p className="text-[10px] text-muted-foreground font-semibold">{b.year}</p>
                <Button size="sm" variant="outline" className="text-xs mt-auto w-fit font-bold"
                  onClick={() => saveBook(b)}>
                  ⭐ حفظ في المراجع
                </Button>
              </div>
            </div>
          ))}
        </TabsContent>

        {/* Local Saved Books (Feature 7) */}
        <TabsContent value="saved" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savedBooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center bg-card border rounded-xl p-6 col-span-2">
              <span className="text-4xl mb-3">⭐</span>
              <p className="text-sm font-bold">خزانة الكتب الأكاديمية فارغة</p>
              <p className="text-xs text-muted-foreground max-w-xs mt-2">ابحث عن المراجع من علامة تبويب "كتب" واضغط على حفظ لتخزينها محلياً وتنظيمها.</p>
            </div>
          ) : (
            savedBooks.map((b, i) => (
              <div key={i} className="border rounded-xl p-4 bg-card flex gap-4 shadow-sm">
                {b.cover_url ? (
                  <img src={b.cover_url} alt={b.title}
                    className="w-14 h-20 object-cover rounded-lg shrink-0 shadow-sm border" />
                ) : (
                  <div className="w-14 h-20 bg-muted/40 rounded-lg shrink-0 flex items-center justify-center text-xs text-muted-foreground font-bold">
                    كتاب
                  </div>
                )}
                <div className="flex flex-col gap-1 flex-1">
                  <p className="text-xs font-black leading-snug line-clamp-2 text-foreground">{b.title}</p>
                  <p className="text-[10px] text-muted-foreground font-bold truncate">{b.author}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold">سنة النشر: {b.year}</p>
                  {b.isbn && (
                    <Badge variant="outline" className="text-[9px] font-mono w-fit bg-muted/20" dir="ltr">
                      ISBN: {b.isbn}
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        {/* DOI lookup */}
        <TabsContent value="doi" className="space-y-4">
          <div className="flex gap-2 bg-card p-3 border rounded-xl shadow-sm">
            <Input
              placeholder="أدخل معرف الـ DOI الرقمي للورقة... مثال: 10.1038/nature12373"
              value={doi}
              onChange={e => setDoi(e.target.value)}
              dir="ltr"
              className="flex-1 font-mono text-sm font-semibold"
            />
            <Button onClick={lookupDOI} disabled={loading} className="font-bold">جلب البيانات</Button>
          </div>
          {doiData && (
            <div className="border rounded-xl p-5 bg-card flex flex-col gap-3 shadow-sm">
              <p className="font-bold text-sm text-foreground text-right">{doiData.title}</p>
              <p className="text-xs text-muted-foreground font-bold">{doiData.authors}</p>
              <p className="text-xs text-muted-foreground font-bold bg-muted/30 p-2.5 rounded-lg w-fit">
                📚 المطبوعة: {doiData.journal} — {doiData.year}
              </p>
              {doiData.abstract && (
                <div className="text-xs text-muted-foreground mt-2 leading-relaxed bg-accent/5 border p-3 rounded-xl max-h-[150px] overflow-y-auto">
                  {doiData.abstract}
                </div>
              )}
              {doiData.url && (
                <Button size="sm" variant="outline" className="w-fit font-bold"
                  onClick={() => openExternal(doiData.url)}>
                  🔗 زيارة موقع الناشر الأصلي
                </Button>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
