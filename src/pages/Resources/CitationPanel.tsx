import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

interface CitationInput {
  title: string
  url?: string
  author?: string
  year?: number
  journal?: string
  doi?: string
}

const FORMAT_LABELS: Record<string, string> = {
  apa:    'APA (السادس)',
  mla:    'MLA',
  bibtex: 'BibTeX',
  ris:    'RIS',
}

export function CitationPanel({ resource }: { resource: { title: string; url: string; notes?: string } }) {
  const [format, setFormat] = useState<string>('apa')
  const [output, setOutput] = useState('')
  const [doi, setDoi] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function generate() {
    setLoading(true)
    try {
      const result = await window.electronAPI.citation_format(
        { title: resource.title, url: resource.url, author: resource.notes || '' },
        format
      )
      setOutput(result)
    } catch (err) {
      console.error(err)
      setOutput('تعذّر توليد الاستشهاد')
    }
    setLoading(false)
  }

  async function lookupDOI() {
    if (!doi.trim()) return
    setLoading(true)
    try {
      const data = await window.electronAPI.citation_fetchDOI(doi.trim())
      if (data) {
        const result = await window.electronAPI.citation_format(data, format)
        setOutput(result)
      } else {
        setOutput('تعذّر جلب بيانات هذا الـ DOI')
      }
    } catch (err) {
      console.error(err)
      setOutput('خطأ أثناء جلب بيانات الـ DOI')
    }
    setLoading(false)
  }

  async function copy() {
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function importBib() {
    try {
      const items = await window.electronAPI.citation_importBibFile()
      if (items && items.length > 0) {
        setOutput(`تم استيراد ${items.length} مرجع من ملف BibTeX`)
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-xl bg-card">
      <h3 className="font-bold text-sm text-foreground">توليد الاستشهاد الأكاديمي</h3>

      {/* Format selector */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-muted-foreground shrink-0">نمط الاستشهاد:</span>
        <div className="w-36">
          <Select value={format} onChange={e => setFormat(e.target.value)}>
            {Object.entries(FORMAT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
        <Button size="sm" onClick={generate} disabled={loading}>
          {loading ? 'جارٍ التوليد...' : 'توليد'}
        </Button>
      </div>

      {/* DOI lookup */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="أدخل DOI للبحث التلقائي... مثال: 10.1038/nature12373"
          value={doi}
          onChange={e => setDoi(e.target.value)}
          className="flex-1 text-sm font-mono"
          dir="ltr"
        />
        <Button size="sm" variant="outline" onClick={lookupDOI} disabled={loading}>
          بحث بـ DOI
        </Button>
      </div>

      {/* Output */}
      {output && (
        <div className="flex flex-col gap-2">
          <Textarea
            value={output}
            readOnly
            rows={4}
            className="text-xs font-mono resize-none bg-muted"
            dir={format === 'bibtex' || format === 'ris' ? 'ltr' : 'rtl'}
          />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={copy} className="flex-1">
              {copied ? 'تم النسخ ✓' : 'نسخ'}
            </Button>
            <Button size="sm" variant="outline" onClick={importBib} className="flex-1">
              استيراد ملف .bib
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
