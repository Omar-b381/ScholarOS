import * as React from 'react'
import { useAppStore, Resource } from '@/store/useAppStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Youtube,
  Search,
  Clock,
  Play,
  Heart,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Info,
  Maximize2,
  Trash2
} from 'lucide-react'

interface YoutubeVideo {
  id: string
  title: string
  thumbnail: string
  channelTitle: string
  description: string
}

export function YouTube() {
  const { resources, saveResource, deleteResource } = useAppStore()
  const [apiKey, setApiKey] = React.useState<string>('')

  // Search states
  const [query, setQuery] = React.useState('')
  const [videos, setVideos] = React.useState<YoutubeVideo[]>([])
  const [loading, setLoading] = React.useState(false)
  const [hasSearched, setHasSearched] = React.useState(false)

  // Active Video in Player
  const [activeVideoId, setActiveVideoId] = React.useState<string | null>(null)
  const [activeVideoTitle, setActiveVideoTitle] = React.useState<string>('')

  // Layout mode (e.g. standard or picture-in-picture style corner minimized)
  const [miniPlayer, setMiniPlayer] = React.useState(false)

  React.useEffect(() => {
    // Load YouTube API key from electron store
    window.electronAPI.settings.get('settings.youtube.apiKey').then((key) => {
      if (key) setApiKey(key)
    }).catch(console.error)
  }, [])

  // Playlist list from SQLite (resources with category 'video')
  const playlist = React.useMemo(() => {
    return resources.filter(r => r.category === 'video')
  }, [resources])

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!query.trim()) return
    if (!apiKey) {
      alert('يرجى تهيئة مفتاح واجهة برمجة تطبيقات يوتيوب (API Key) في الإعدادات أولاً.')
      return
    }

    setLoading(true)
    setHasSearched(true)
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&key=${apiKey}&type=video&maxResults=12`
      const res = await fetch(url)
      const data = await res.json()

      if (data.error) {
        throw new Error(data.error.message || 'فشل جلب النتائج من خوادم يوتيوب')
      }

      const list: YoutubeVideo[] = (data.items || []).map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails?.medium?.url || '',
        channelTitle: item.snippet.channelTitle,
        description: item.snippet.description
      }))

      setVideos(list)
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'حدث خطأ أثناء الاتصال بالخادم')
    } finally {
      setLoading(false)
    }
  }

  // Play Video
  const playVideo = (videoId: string, title: string) => {
    setActiveVideoId(videoId)
    setActiveVideoTitle(title)
  }

  // Save to Watch Later (SQLite)
  const saveToWatchLater = async (video: YoutubeVideo) => {
    // Check duplicate
    const exists = playlist.some(v => v.url.includes(video.id))
    if (exists) {
      alert('الفيديو مضاف بالفعل إلى قائمة المشاهدة لاحقاً.')
      return
    }

    const id = crypto.randomUUID()
    await saveResource({
      id,
      title: video.title,
      url: `https://www.youtube.com/watch?v=${video.id}`,
      category: 'video',
      tags: '["Watch Later", "يوتيوب"]',
      course_id: '',
      notes: video.channelTitle,
      rating: 5,
      is_favorite: 0
    })
    alert('تم حفظ الفيديو في قائمة المشاهدة لاحقاً بنجاح!')
  }

  const deleteFromPlaylist = async (id: string) => {
    if (confirm('هل تريد إزالة هذا الفيديو من قائمة المشاهدة؟')) {
      await deleteResource(id)
    }
  }

  // Helper to extract ID from youtube watch URL
  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
    const match = url.match(regExp)
    return (match && match[2].length === 11) ? match[2] : null
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto h-full overflow-y-auto scrollbar-thin">
      {/* Header */}
      <div className="border-b pb-4">
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
          <Youtube className="h-8 w-8 text-red-500 shrink-0" />
          <span>مشغل وباحث اليوتيوب الدراسي</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">البحث عن الدروس الأكاديمية والمحاضرات وتشغيلها في مشغل داخلي خالٍ من المشتتات</p>
      </div>

      {/* Main player display when active */}
      {activeVideoId && (
        <div className={miniPlayer ? 'fixed bottom-4 left-4 w-[360px] z-50 shadow-2xl animate-in slide-in-from-bottom duration-300' : 'w-full max-w-4xl mx-auto'}>
          <Card className="overflow-hidden border-2 border-primary">
            <div className="relative aspect-video w-full">
              <iframe
                src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1`}
                className="w-full h-full border-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <CardHeader className="py-3 px-4 flex flex-row justify-between items-center bg-card">
              <CardTitle className="text-xs font-bold leading-tight line-clamp-1 truncate max-w-[80%]" dangerouslySetInnerHTML={{ __html: activeVideoTitle }} />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="p-1 h-7 w-7" onClick={() => setMiniPlayer(!miniPlayer)} title={miniPlayer ? 'تكبير المشغل' : 'تصغير المشغل للزاوية'}>
                  <Maximize2 className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="destructive" className="p-1 h-7 w-7" onClick={() => setActiveVideoId(null)}>
                  ×
                </Button>
              </div>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* API Key Guide Alert */}
      {!apiKey && (
        <Card className="bg-amber-500/10 border-amber-500/30 p-5 flex items-start gap-4">
          <Info className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1.5 text-xs">
            <h3 className="font-extrabold text-sm text-amber-800 dark:text-amber-300">مفتاح API Key لليوتيوب غير مهيأ!</h3>
            <p className="text-muted-foreground leading-relaxed">
              لتمكين ميزة البحث المباشر في يوتيوب من داخل التطبيق، يجب عليك إنشاء مفتاح مجاني من منصة Google Cloud Console وإدخاله في تبويب الإعدادات.
            </p>
            <p className="font-bold text-amber-700 dark:text-amber-400">
              خطوات الحصول على المفتاح: Google Cloud Console ← إنشاء مشروع ← تفعيل YouTube Data API v3 ← إنشاء مفتاح Credentials (API Key).
            </p>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search Results Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search form */}
          <form onSubmit={handleSearch} className="flex gap-2 bg-card p-2 rounded-xl border">
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="ابحث عن دروس أو مواضيع أكاديمية... (مثال: شرح هياكل البيانات)"
              disabled={!apiKey}
            />
            <Button type="submit" disabled={!apiKey || loading}>
              {loading ? 'جاري البحث...' : <Search className="h-4.5 w-4.5" />}
            </Button>
          </form>

          {/* Results Grid */}
          {loading ? (
            <div className="flex justify-center py-20 text-xs text-muted-foreground">جاري تحميل مقاطع الفيديو المقترحة...</div>
          ) : videos.length === 0 ? (
            hasSearched ? (
              <div className="text-center py-20 text-xs text-muted-foreground">لم نجد أي نتائج مطابقة لبحثك.</div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card border rounded-xl">
                <Youtube className="h-12 w-12 opacity-30 mb-3" />
                <h4 className="font-bold">ابحث عن مقاطع يوتيوب</h4>
                <p className="text-xs mt-1 text-center max-w-sm px-4">اكتب عنواناً أو موضوعاً دراسياً في شريط البحث للحصول على شروحات فيديو فورية.</p>
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {videos.map((video) => (
                <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-all flex flex-col justify-between">
                  <div
                    className="relative aspect-video bg-muted cursor-pointer group"
                    onClick={() => playVideo(video.id, video.title)}
                  >
                    <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="h-10 w-10 text-white fill-white" />
                    </div>
                  </div>
                  <CardHeader className="p-3">
                    <CardTitle className="text-xs font-bold leading-snug line-clamp-2 h-10 text-right" dangerouslySetInnerHTML={{ __html: video.title }} />
                    <CardDescription className="text-[10px] mt-1">{video.channelTitle}</CardDescription>
                  </CardHeader>
                  <CardFooter className="p-2 border-t flex justify-between bg-muted/20">
                    <Button size="sm" variant="ghost" className="text-xs gap-1 py-1 h-7" onClick={() => playVideo(video.id, video.title)}>
                      <Play className="h-3 w-3" /> تشغيل
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs gap-1 py-1 h-7" onClick={() => saveToWatchLater(video)}>
                      <Clock className="h-3 w-3" /> مشاهدة لاحقاً
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Local Playlist watch later */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="font-bold text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>قائمة المشاهدة لاحقاً الدراسية</span>
          </h3>

          <Card className="max-h-[500px] overflow-y-auto scrollbar-thin">
            <CardContent className="p-3 space-y-3">
              {playlist.length === 0 ? (
                <div className="text-center py-10 text-xs text-muted-foreground">لا توجد مقاطع محفوظة. أضف مقاطع من نتائج البحث للمشاهدة لاحقاً.</div>
              ) : (
                playlist.map((video) => {
                  const vidId = getYoutubeId(video.url)
                  return (
                    <div
                      key={video.id}
                      className="p-2.5 rounded-lg border bg-card hover:bg-accent/30 transition-colors flex items-start gap-3"
                    >
                      <div
                        className="w-20 aspect-video bg-muted rounded overflow-hidden shrink-0 cursor-pointer relative group"
                        onClick={() => vidId && playVideo(vidId, video.title)}
                      >
                        <img src={`https://img.youtube.com/vi/${vidId}/mqdefault.jpg`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="h-5 w-5 text-white fill-white" />
                        </div>
                      </div>
                      <div className="flex-1 overflow-hidden space-y-1">
                        <h4
                          onClick={() => vidId && playVideo(vidId, video.title)}
                          className="font-bold text-xs line-clamp-2 cursor-pointer hover:text-primary leading-tight text-right"
                          dangerouslySetInnerHTML={{ __html: video.title }}
                        />
                        <div className="flex justify-between items-center text-[9px] text-muted-foreground mt-1">
                          <span>{video.notes}</span>
                          <button onClick={() => deleteFromPlaylist(video.id)} className="text-destructive hover:text-red-700">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
