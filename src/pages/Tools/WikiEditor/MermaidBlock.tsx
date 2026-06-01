import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

// Initialize mermaid once at module level
mermaid.initialize({
  startOnLoad:    false,
  theme:          'base',
  fontFamily:     'Cairo, sans-serif',
  themeVariables: {
    fontSize:    '14px',
    fontFamily:  'Cairo, sans-serif',
    primaryColor: '#6d28d9',
    lineColor:   '#888',
  },
})

let mermaidCounter = 0

interface Props {
  code:     string
  editable: boolean
  onChange: (code: string) => void
}

export function MermaidBlock({ code, editable, onChange }: Props) {
  const id      = useRef(`mermaid-${++mermaidCounter}`).current
  const ref     = useRef<HTMLDivElement>(null)
  const [svg, setSvg]       = useState('')
  const [error, setError]   = useState('')
  const [editing, setEdit]  = useState(false)
  const [draft, setDraft]   = useState(code)

  useEffect(() => {
    setDraft(code)
    render(code)
  }, [code])

  async function render(src: string) {
    if (!src.trim()) {
      setSvg('')
      setError('')
      return
    }
    try {
      setError('')
      const { svg } = await mermaid.render(id, src)
      setSvg(svg)
    } catch (e: any) {
      setError('خطأ في الرسم: ' + (e?.message ?? 'صيغة غير صحيحة'))
    }
  }

  function saveEdit() {
    onChange(draft)
    setEdit(false)
  }

  return (
    <div className="my-3 border rounded-xl overflow-hidden bg-card border-border/80">
      {editing ? (
        <div className="flex flex-col gap-2 p-3 bg-muted/10">
          <textarea
            className="w-full h-36 font-mono text-xs p-2.5 border rounded-lg bg-muted/40 resize-none outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 text-left"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            dir="ltr"
            placeholder="اكتب كود mermaid هنا..."
          />
          <div className="flex gap-2 justify-end">
            <button
              className="px-3 py-1.5 text-xs bg-primary text-primary-foreground font-bold rounded-lg shadow-sm hover:bg-primary/90 transition-colors"
              onClick={saveEdit}
            >
              حفظ التعديل
            </button>
            <button
              className="px-3 py-1.5 text-xs border border-border/85 bg-card text-foreground rounded-lg hover:bg-accent/40 transition-colors"
              onClick={() => {
                setDraft(code)
                setEdit(false)
              }}
            >
              إلغاء
            </button>
          </div>
        </div>
      ) : (
        <div className="relative group p-2 min-h-20 flex flex-col justify-center">
          {error ? (
            <div className="p-3 text-red-600 text-xs bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900/50 text-center font-bold">
              {error}
            </div>
          ) : (
            <div
              ref={ref}
              className="p-4 flex justify-center overflow-x-auto select-none"
              dangerouslySetInnerHTML={{ __html: svg || '<p className="text-xs text-muted-foreground">مخطط فارغ</p>' }}
            />
          )}
          {editable && (
            <button
              className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 text-[10px] font-bold px-2 py-1 bg-muted/90 text-muted-foreground hover:text-foreground rounded-md border border-border/80 shadow-sm transition-opacity"
              onClick={() => setEdit(true)}
            >
              تعديل المخطط
            </button>
          )}
        </div>
      )}
    </div>
  )
}
