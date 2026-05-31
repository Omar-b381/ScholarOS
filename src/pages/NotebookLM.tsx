import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ExternalLink,
  BookOpen,
  Sparkles,
  RefreshCw,
  Info
} from 'lucide-react'

export function NotebookLM() {
  const webviewRef = React.useRef<any>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  const handleOpenExternal = () => {
    window.electronAPI.app.openExternal('https://notebooklm.google.com')
  }

  const handleReload = () => {
    if (webviewRef.current) {
      setIsLoading(true)
      webviewRef.current.reload()
    }
  }

  React.useEffect(() => {
    const webview = webviewRef.current
    if (!webview) return

    const handleStartLoading = () => setIsLoading(true)
    const handleStopLoading = () => setIsLoading(false)

    webview.addEventListener('did-start-loading', handleStartLoading)
    webview.addEventListener('did-stop-loading', handleStopLoading)

    return () => {
      if (webview) {
        webview.removeEventListener('did-start-loading', handleStartLoading)
        webview.removeEventListener('did-stop-loading', handleStopLoading)
      }
    }
  }, [])

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto h-full flex flex-col overflow-hidden" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-primary/20 gap-1 text-[10px] py-0.5 px-2">
              <Sparkles className="h-3 w-3 text-amber-500 animate-pulse" />
              <span>مستشار الاختبارات الذكي من Google</span>
            </Badge>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight font-black mt-1 flex items-center gap-2 font-black">
            <BookOpen className="h-8 w-8 text-primary" />
            <span>مساعد Google NotebookLM للمذاكرة</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            المنصة الأقوى عالمياً لتحضير الاختبارات وتوليد الأسئلة وحلقات البودكاست الصوتية الشارحة لملفاتك.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button onClick={handleReload} variant="outline" size="sm" className="gap-1 text-xs font-bold">
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث الصفحة
          </Button>
          <Button onClick={handleOpenExternal} size="sm" className="gap-1.5 text-xs font-bold">
            <ExternalLink className="h-4 w-4" />
            <span>الفتح في المتصفح الخارجي</span>
          </Button>
        </div>
      </div>

      {/* Info Tips Banner */}
      <Card className="bg-gradient-to-r from-primary/5 via-violet-500/5 to-indigo-500/5 border-primary/10 shrink-0">
        <CardContent className="p-4 flex gap-3 items-start text-xs leading-relaxed text-muted-foreground">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-extrabold text-foreground">💡 أفضل طريقة للاستعداد للاختبارات باستخدام NotebookLM:</p>
            <p>
              ارفع محاضراتك، وملاحظات الـ Wiki، والكتب بصيغة PDF في حساب Google الخاص بك. سيقوم الذكاء الاصطناعي ببناء أدلة دراسة مخصصة، وتوليد بطاقات أسئلة وأجوبة تفاعلية، وحتى محاكاة اختبارات تجريبية وحلقات شرح صوتية لتلخيص كامل المادة في دقائق!
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Webview Sandbox frame */}
      <div className="flex-1 min-h-[400px] border-2 border-border rounded-2xl overflow-hidden relative bg-card shadow-lg">
        {isLoading && (
          <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center space-y-3 z-10">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <span className="text-xs font-bold text-muted-foreground">جاري فتح مساحة NotebookLM الآمنة من Google...</span>
          </div>
        )}
        
        {/* Electron Native webview tag */}
        <webview
          ref={webviewRef}
          src="https://notebooklm.google.com"
          className="w-full h-full"
          style={{ height: '100%', width: '100%' }}
        />
      </div>
    </div>
  )
}
