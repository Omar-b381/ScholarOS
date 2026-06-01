import { useState, useEffect } from 'react'
import { Rating, ARABIC_RATINGS, RATING_COLORS } from '@/lib/fsrs'
import ReactCardFlip from 'react-card-flip'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface Flashcard {
  id: string
  question: string
  answer: string
  due: string
  reps: number
  state: number
}

export function FlashcardReview() {
  const [cards, setCards]         = useState<Flashcard[]>([])
  const [index, setIndex]         = useState(0)
  const [flipped, setFlipped]     = useState(false)
  const [stats, setStats]         = useState({ total: 0, due: 0, new: 0, review: 0 })
  const [sessionDone, setSessionDone] = useState(0)
  const [loading, setLoading]     = useState(true)

  useEffect(() => { loadDueCards() }, [])

  async function loadDueCards() {
    setLoading(true)
    try {
      const dueCards = await window.electronAPI.db_flashcards_getDue()
      const s = await window.electronAPI.db_flashcards_getStats()
      setCards(dueCards || [])
      setStats(s || { total: 0, due: 0, new: 0, review: 0 })
      setIndex(0)
      setFlipped(false)
    } catch (err) {
      console.error('Failed to load FSRS due cards', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleRating(rating: Rating) {
    if (cards.length === 0) return
    const card = cards[index]
    try {
      await window.electronAPI.db_flashcards_review(card.id, rating)
      setSessionDone(p => p + 1)
      setFlipped(false)
      if (index + 1 >= cards.length) {
        await loadDueCards()
      } else {
        setIndex(p => p + 1)
      }
    } catch (err) {
      console.error('Failed to review flashcard with FSRS', err)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-muted-foreground text-sm font-semibold">جارٍ تحميل البطاقات بجدولة FSRS...</p>
    </div>
  )

  if (cards.length === 0) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 bg-muted/10 border border-dashed rounded-2xl p-6">
      <span className="text-5xl animate-bounce">🎉</span>
      <p className="text-lg font-bold text-foreground">أحسنت! لا توجد بطاقات للمراجعة حالياً</p>
      <p className="text-muted-foreground text-xs">راجعت {sessionDone} بطاقات دراسية في هذه الجلسة</p>
      <div className="flex gap-6 text-xs font-semibold text-muted-foreground pt-2 border-t w-full justify-center">
        <span>إجمالي البطاقات: {stats.total}</span>
        <span>جديدة: {stats.new}</span>
        <span>للمراجعة: {stats.review}</span>
      </div>
    </div>
  )

  const current = cards[index]
  const progress = Math.round((index / cards.length) * 100)

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto p-4 w-full" dir="rtl">

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <Badge variant="outline" className="font-bold">{cards.length - index} متبقية</Badge>
        <Badge variant="outline" className="font-bold bg-green-500/10 text-green-600 border-green-500/20">{sessionDone} مراجعة</Badge>
        <Progress value={progress} className="flex-1 h-2" />
        <span className="font-mono font-bold text-primary">{progress}%</span>
      </div>

      {/* Flip Card */}
      <div
        className="cursor-pointer select-none w-full"
        onClick={() => setFlipped(f => !f)}
        role="button"
        aria-label={flipped ? 'عرض السؤال' : 'عرض الإجابة'}
      >
        <ReactCardFlip isFlipped={flipped} flipDirection="horizontal">
          {/* Front — Question */}
          <div className="min-h-56 rounded-2xl border bg-card p-8 flex flex-col items-center justify-center gap-4 shadow-md hover:shadow-lg transition-shadow border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">سؤال الاستذكار</Badge>
            <p className="text-base md:text-lg text-center font-extrabold leading-relaxed text-foreground">
              {current?.question}
            </p>
            <p className="text-[10px] text-muted-foreground mt-4 animate-pulse">💡 انقر للكشف عن الإجابة</p>
          </div>

          {/* Back — Answer */}
          <div className="min-h-56 rounded-2xl border bg-card p-8 flex flex-col items-center justify-center gap-4 shadow-md hover:shadow-lg transition-shadow border-green-500/30 bg-gradient-to-br from-green-500/5 via-transparent to-transparent">
            <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">إجابة النموذج</Badge>
            <p className="text-sm md:text-base text-center font-bold leading-relaxed text-muted-foreground">
              {current?.answer}
            </p>
            <p className="text-[10px] text-primary mt-4">انقر للعودة للسؤال</p>
          </div>
        </ReactCardFlip>
      </div>

      {/* Rating buttons — only show after flip */}
      {flipped && (
        <div className="grid grid-cols-4 gap-3 w-full">
          {([Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as Rating[]).map(r => (
            <Button
              key={r}
              variant="outline"
              className={`text-xs py-3.5 h-10 font-bold border-border shadow-sm transition-all ${RATING_COLORS[r]}`}
              onClick={(e) => {
                e.stopPropagation();
                handleRating(r);
              }}
            >
              {ARABIC_RATINGS[r]}
            </Button>
          ))}
        </div>
      )}

      {!flipped && (
        <Button variant="outline" className="w-full font-bold h-10 border-primary/20 text-primary hover:bg-primary/5" onClick={() => setFlipped(true)}>
          كشف إجابة البطاقة
        </Button>
      )}
    </div>
  )
}
