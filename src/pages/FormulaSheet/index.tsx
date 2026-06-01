import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import 'katex/dist/katex.min.css'
import katex from 'katex'

interface Formula { id: string; label: string; latex: string }

export function FormulaSheetPage() {
  const [sheets, setSheets] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [formulas, setFormulas] = useState<Formula[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [newLatex, setNewLatex] = useState('')
  const [preview, setPreview] = useState('')
  const [title, setTitle] = useState('')

  useEffect(() => {
    window.electronAPI.formulas_getAll().then(setSheets)
  }, [])

  useEffect(() => {
    if (!newLatex.trim()) {
      setPreview('')
      return
    }
    try {
      setPreview(katex.renderToString(newLatex, { throwOnError: false, displayMode: true }))
    } catch {
      setPreview('')
    }
  }, [newLatex])

  function selectSheet(sheet: any) {
    setSelected(sheet)
    setFormulas(JSON.parse(sheet.formulas ?? '[]'))
    setTitle(sheet.title)
  }

  async function newSheet() {
    const s = await window.electronAPI.formulas_save({ title: 'ورقة معادلات جديدة', formulas: '[]' })
    setSheets(prev => [s, ...prev])
    selectSheet(s)
  }

  async function addFormula() {
    if (!newLabel || !newLatex) return
    const f: Formula = { id: Date.now().toString(), label: newLabel, latex: newLatex }
    const updated = [...formulas, f]
    setFormulas(updated)
    setNewLabel('')
    setNewLatex('')
    await window.electronAPI.formulas_save({
      id: selected.id,
      title,
      formulas: JSON.stringify(updated),
      course_id: selected.course_id,
    })
    // Refresh list
    const list = await window.electronAPI.formulas_getAll()
    setSheets(list)
  }

  async function removeFormula(id: string) {
    const updated = formulas.filter(f => f.id !== id)
    setFormulas(updated)
    await window.electronAPI.formulas_save({
      id: selected.id,
      title,
      formulas: JSON.stringify(updated)
    })
  }

  async function deleteSheet(id: string) {
    if (confirm('هل أنت متأكد من حذف ورقة المعادلات هذه نهائياً؟')) {
      await window.electronAPI.formulas_delete(id)
      setSelected(null)
      setFormulas([])
      const list = await window.electronAPI.formulas_getAll()
      setSheets(list)
    }
  }

  async function exportPDF() {
    if (!selected) return
    try {
      const path = await window.electronAPI.formulas_exportPDF(selected.id)
      alert(`تم تصدير ورقة المعادلات بنجاح كملف PDF وحفظها في مجلد مستندات البرنامج!\nالمسار: ${path}`)
    } catch (e: any) {
      alert('فشل تصدير ورقة المعادلات: ' + e.message)
    }
  }

  return (
    <div className="flex h-full max-w-7xl mx-auto border rounded-2xl overflow-hidden bg-card shadow-sm select-none" dir="rtl">
      {/* Sidebar — sheet list */}
      <div className="w-60 border-l flex flex-col gap-3 p-4 bg-muted/20">
        <Button size="sm" className="w-full font-bold" onClick={newSheet}>+ ورقة معادلات جديدة</Button>
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {sheets.length === 0 ? (
            <p className="text-[10px] text-muted-foreground text-center py-10">لا توجد أوراق معادلات مضافة بعد.</p>
          ) : (
            sheets.map(s => (
              <button key={s.id}
                type="button"
                className={`text-right text-xs font-bold p-3 rounded-xl w-full hover:bg-accent/40 transition-all border ${
                  selected?.id === s.id ? 'bg-primary/5 border-primary text-primary shadow-sm scale-102 font-black' : 'border-transparent'
                }`}
                onClick={() => selectSheet(s)}>
                📖 {s.title}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main area */}
      {selected ? (
        <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto scrollbar-thin">
          <div className="flex items-center justify-between border-b pb-4">
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={() => window.electronAPI.formulas_save({
                id: selected.id,
                title,
                formulas: JSON.stringify(formulas)
              })}
              className="text-lg font-black border-none bg-transparent p-0 w-auto shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder="اسم ورقة المعادلات..."
            />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={exportPDF} className="font-bold">
                تصدير PDF 📄
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive font-bold hover:bg-destructive/5" onClick={() => deleteSheet(selected.id)}>
                حذف الورقة
              </Button>
            </div>
          </div>

          {/* Formula list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formulas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-center col-span-2 bg-muted/10 border border-dashed rounded-2xl p-6">
                <p className="text-xs font-bold">ورقة المعادلات فارغة</p>
                <p className="text-[10px] text-muted-foreground mt-1">ابدأ بإدخال أول معادلة أو صيغة رياضية/فيزيائية من خلال النموذج بالأسفل.</p>
              </div>
            ) : (
              formulas.map(f => (
                <div key={f.id} className="border rounded-2xl p-4 bg-card flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow group relative">
                  <div className="space-y-1">
                    <p className="text-xs font-black text-primary">{f.label}</p>
                    <div
                      className="text-center py-4 bg-muted/10 rounded-xl mt-2 select-all overflow-x-auto"
                      dangerouslySetInnerHTML={{
                        __html: katex.renderToString(f.latex, { throwOnError: false, displayMode: true })
                      }}
                    />
                  </div>
                  <Button size="sm" variant="ghost"
                    className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-destructive hover:bg-destructive/5 self-end mt-2 transition-opacity"
                    onClick={() => removeFormula(f.id)}>
                    حذف المعادلة
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Add formula */}
          <div className="border rounded-2xl p-5 bg-card shadow-sm space-y-4">
            <p className="text-sm font-black text-foreground">إضافة معادلة جديدة للورقة ✏️</p>
            <div className="space-y-3">
              <Input placeholder="اسم المعادلة... مثال: قانون أينشتاين للنسبية"
                value={newLabel} onChange={e => setNewLabel(e.target.value)} />
              <Input placeholder="كود LaTeX... مثال: E = mc^2"
                value={newLatex} onChange={e => setNewLatex(e.target.value)}
                dir="ltr" className="font-mono text-sm" />
            </div>
            
            {preview && (
              <div className="border rounded-xl p-4 bg-secondary/30 text-center shadow-inner mt-4">
                <p className="text-[10px] text-muted-foreground mb-2 text-right">معاينة المعادلة قبل الإضافة:</p>
                <div dangerouslySetInnerHTML={{ __html: preview }} className="overflow-x-auto py-2" />
              </div>
            )}

            <Button onClick={addFormula} className="w-full font-bold">
              إضافة المعادلة للورقة
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-center p-6 py-24">
          <span className="text-6xl mb-4 animate-bounce">🔬</span>
          <p className="text-sm font-bold">باني أوراق المعادلات الرياضية KaTeX</p>
          <p className="text-xs max-w-xs mt-2 text-muted-foreground">أنشئ أوراق المعادلات الفيزيائية والرياضية والكيميائية الخاصة بموادك، وقم بتصديرها لاحقاً كملفات PDF جاهزة للمذاكرة.</p>
          <Button onClick={newSheet} className="mt-4 font-bold" size="sm">أنشئ ورقتك الأولى الآن</Button>
        </div>
      )}
    </div>
  )
}
