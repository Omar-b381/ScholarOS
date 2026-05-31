import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Award,
  Flame,
  Volume1,
  Coffee,
  Brain,
  Sparkles,
  Trophy,
  Moon,
  Zap,
  BookOpen
} from 'lucide-react'

interface Achievement {
  id: string
  title: string
  description: string
  icon: any
  unlocked: boolean
}

export function Focus() {
  // === Timer States ===
  const [timerType, setTimerType] = React.useState<'focus' | 'shortBreak' | 'longBreak'>('focus')
  const [timeLeft, setTimeLeft] = React.useState(25 * 60) // 25 minutes default
  const [isRunning, setIsRunning] = React.useState(false)
  const timerRef = React.useRef<NodeJS.Timeout | null>(null)

  // Custom durations
  const [focusDur, setFocusDur] = React.useState(25)
  const [shortDur, setShortDur] = React.useState(5)
  const [longDur, setLongDur] = React.useState(15)

  // === Ambient Sound Multi-Channel State ===
  const [ambientMix, setAmbientMix] = React.useState<Record<'lofi' | 'rain' | 'library' | 'nature', { active: boolean; volume: number }>>({
    lofi: { active: false, volume: 0.5 },
    rain: { active: false, volume: 0.5 },
    library: { active: false, volume: 0.5 },
    nature: { active: false, volume: 0.5 }
  })
  
  const audiosRef = React.useRef<Record<string, HTMLAudioElement | null>>({
    lofi: null,
    rain: null,
    library: null,
    nature: null
  })

  // Setup sound URLs using royalty-free, high-quality loops
  const soundUrls = {
    lofi: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', // Relaxing acoustic study beat
    rain: 'https://assets.mixkit.co/active_storage/sfx/2526/2526-84.wav', // Soft rain sound
    library: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav', // Library ambient sound
    nature: 'https://assets.mixkit.co/active_storage/sfx/2433/2433-84.wav' // Nature winds
  }

  // === Gamification States ===
  const [xp, setXp] = React.useState<number>(0)
  const [level, setLevel] = React.useState<number>(1)
  const [sessionsCompleted, setSessionsCompleted] = React.useState<number>(0)
  const [showLevelUp, setShowLevelUp] = React.useState(false)
  const [unlockedBadges, setUnlockedBadges] = React.useState<string[]>([])

  // Load gamified data from LocalStorage
  React.useEffect(() => {
    const savedXp = localStorage.getItem('scholaros_focus_xp')
    const savedLevel = localStorage.getItem('scholaros_focus_level')
    const savedSessions = localStorage.getItem('scholaros_focus_sessions')
    const savedBadges = localStorage.getItem('scholaros_focus_badges')

    if (savedXp) setXp(parseInt(savedXp, 10))
    if (savedLevel) setLevel(parseInt(savedLevel, 10))
    if (savedSessions) setSessionsCompleted(parseInt(savedSessions, 10))
    if (savedBadges) setUnlockedBadges(JSON.parse(savedBadges))
  }, [])

  // Sync Timer Duration on Type Switch
  React.useEffect(() => {
    setIsRunning(false)
    if (timerRef.current) clearInterval(timerRef.current)
    
    if (timerType === 'focus') {
      setTimeLeft(focusDur * 60)
    } else if (timerType === 'shortBreak') {
      setTimeLeft(shortDur * 60)
    } else {
      setTimeLeft(longDur * 60)
    }
  }, [timerType, focusDur, shortDur, longDur])

  // Timer Tick Core Logic
  React.useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRunning])

  // Cleanup audios on unmount
  React.useEffect(() => {
    return () => {
      Object.values(audiosRef.current).forEach((audio) => {
        if (audio) {
          audio.pause()
        }
      })
    }
  }, [])

  // Handle sound channel toggling
  const handleSoundToggle = (soundType: 'lofi' | 'rain' | 'library' | 'nature') => {
    setAmbientMix((prev) => {
      const channel = prev[soundType]
      const nextActive = !channel.active
      const newState = {
        ...prev,
        [soundType]: { ...channel, active: nextActive }
      }

      let audio = audiosRef.current[soundType]
      if (nextActive) {
        if (!audio) {
          audio = new Audio(soundUrls[soundType])
          audio.loop = true
          audiosRef.current[soundType] = audio
        }
        audio.volume = channel.volume
        audio.play().catch((err) => console.log('Audio playback block by browser policy', err))
      } else {
        if (audio) {
          audio.pause()
        }
      }

      return newState
    })
  }

  // Handle sound channel volume changes
  const handleChannelVolumeChange = (soundType: 'lofi' | 'rain' | 'library' | 'nature', vol: number) => {
    setAmbientMix((prev) => {
      const newState = {
        ...prev,
        [soundType]: { ...prev[soundType], volume: vol }
      }

      const audio = audiosRef.current[soundType]
      if (audio) {
        audio.volume = vol
      }

      return newState
    })
  }

  // Mute/Pause all channels
  const handleMuteAll = () => {
    setAmbientMix((prev) => {
      const newState = { ...prev }
      Object.keys(newState).forEach((key) => {
        const k = key as 'lofi' | 'rain' | 'library' | 'nature'
        newState[k] = { ...newState[k], active: false }
        const audio = audiosRef.current[k]
        if (audio) {
          audio.pause()
        }
      })
      return newState
    })
  }

  // Timer Complete rewards injection
  const handleTimerComplete = () => {
    setIsRunning(false)
    if (timerRef.current) clearInterval(timerRef.current)
    
    // Trigger success alarm ring
    const ding = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav')
    ding.play().catch(() => {})

    if (timerType === 'focus') {
      const newSessions = sessionsCompleted + 1
      const newXp = xp + 100 // +100 XP per Focus Session!
      
      setSessionsCompleted(newSessions)
      localStorage.setItem('scholaros_focus_sessions', newSessions.toString())
      
      // Calculate level up: Every 300 XP is a level (3 sessions)
      const nextLevel = Math.floor(newXp / 300) + 1
      if (nextLevel > level) {
        setLevel(nextLevel)
        setShowLevelUp(true)
        localStorage.setItem('scholaros_focus_level', nextLevel.toString())
      }
      
      setXp(newXp)
      localStorage.setItem('scholaros_focus_xp', newXp.toString())

      // Check achievements
      checkAchievements(newSessions, nextLevel)
      
      alert('🌟 تهانينا! أكملت جلسة تركيز كاملة بنجاح، وحصلت على +100 نقطة خبرة (XP)! خذ قسطاً من الراحة الآن.')
      setTimerType('shortBreak')
    } else {
      alert('🔔 انتهت فترة الاستراحة! حان وقت العودة للتركيز والمذاكرة بقوة.')
      setTimerType('focus')
    }
  }

  // Achievements unlocking checker
  const checkAchievements = (sessions: number, currentLvl: number) => {
    let badges = [...unlockedBadges]
    
    // Badge 1: First Step (Complete first session)
    if (sessions >= 1 && !badges.includes('first_step')) {
      badges.push('first_step')
    }
    
    // Badge 2: 3-Hour Focus (Complete 7 sessions = 175 mins)
    if (sessions >= 7 && !badges.includes('focus_master')) {
      badges.push('focus_master')
    }

    // Badge 3: Midnight Scholar (Unlocks if studied between 10PM and 4AM)
    const hour = new Date().getHours()
    if ((hour >= 22 || hour <= 4) && !badges.includes('night_scholar')) {
      badges.push('night_scholar')
    }

    // Badge 4: GPA Booster (Reach level 3)
    if (currentLvl >= 3 && !badges.includes('gpa_booster')) {
      badges.push('gpa_booster')
    }

    setUnlockedBadges(badges)
    localStorage.setItem('scholaros_focus_badges', JSON.stringify(badges))
  }

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const remainingSecs = secs % 60
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`
  }

  // Helper to calculate circular timer ring dashoffset
  const getCirclePercentage = () => {
    const total = (timerType === 'focus' ? focusDur : timerType === 'shortBreak' ? shortDur : longDur) * 60
    return (timeLeft / total) * 100
  }

  // Dynamic Academic Rank title mapping
  const getAcademicRank = () => {
    if (level === 1) return 'طالب مبتدئ'
    if (level === 2) return 'مكافح المذاكرة'
    if (level === 3) return 'باحث أكاديمي'
    if (level === 4) return 'أستاذ التلخيص'
    if (level === 5) return 'عبقري الدفعة'
    return 'عالم فوق العادة'
  }

  const handleReset = () => {
    setIsRunning(false)
    if (timerRef.current) clearInterval(timerRef.current)
    
    if (timerType === 'focus') {
      setTimeLeft(focusDur * 60)
    } else if (timerType === 'shortBreak') {
      setTimeLeft(shortDur * 60)
    } else {
      setTimeLeft(longDur * 60)
    }
  }


  const achievementsList: Achievement[] = [
    { id: 'first_step', title: 'شعلة البداية', description: 'إنجاز أول جلسة تركيز كاملة.', icon: Flame, unlocked: unlockedBadges.includes('first_step') },
    { id: 'focus_master', title: 'بطل التركيز', description: 'تجاوز 3 ساعات دراسية (7 جلسات).', icon: Trophy, unlocked: unlockedBadges.includes('focus_master') },
    { id: 'night_scholar', title: 'ساهر الليل', description: 'الدراسة والتركيز في الهزيع الأخير من الليل.', icon: Moon, unlocked: unlockedBadges.includes('night_scholar') },
    { id: 'gpa_booster', title: 'قاهر الصعاب', description: 'ترقية المستوى الأكاديمي إلى المستوى 3.', icon: Zap, unlocked: unlockedBadges.includes('gpa_booster') }
  ]

  const nextLevelXp = level * 300
  const prevLevelXp = (level - 1) * 300
  const levelProgress = ((xp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto h-full overflow-y-auto scrollbar-thin relative bg-gradient-to-br from-rose-500/5 via-primary/5 to-violet-500/5 select-none" dir="rtl">
      
      {/* LEVEL UP OVERLAY MODAL */}
      {showLevelUp && (
        <div className="absolute inset-0 bg-background/90 z-50 flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-300">
          <div className="p-6 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 shadow-2xl animate-bounce">
            <Sparkles className="h-16 w-16 text-card" />
          </div>
          <h2 className="text-3xl font-black text-primary text-center">🎉 مستوى دراسي جديد!</h2>
          <p className="text-lg font-bold text-muted-foreground text-center">لقد ترقيت إلى المستوى الأكاديمي {level}!</p>
          <div className="text-base font-extrabold text-foreground px-6 py-2 rounded-full border bg-card shadow-sm">
            اللقب الحالي: <span className="text-primary">{getAcademicRank()}</span>
          </div>
          <Button onClick={() => setShowLevelUp(false)} className="px-6 font-bold shadow-md hover:shadow-lg mt-4 h-10">
            متابعة الدراسة والتركيز
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4 shrink-0">
        <div>
          <Badge className="bg-primary/10 text-primary border-primary/20 gap-1 text-[10px] py-0.5 px-2.5 font-bold">
            <Flame className="h-3.5 w-3.5 text-rose-500 animate-pulse animate-bounce" />
            <span>نظام نقاط الخبرة والمستويات الأكاديمية (Gamified Study Quest)</span>
          </Badge>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight font-black mt-1 flex items-center gap-2">
            <Timer className="h-8 w-8 text-primary shrink-0" />
            <span>محطة التركيز والإنتاجية الأكاديمية</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            استمتع بأصوات هادئة للتركيز، وتتبع ساعاتك الدراسية، وقم بترقية ملفك الشخصي الأكاديمي.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Gamified User Profile & Ambience Sound Box */}
        <div className="lg:col-span-1 space-y-6 flex flex-col justify-between">
          
          {/* Student Profile & XP Card */}
          <Card className="bg-gradient-to-br from-primary/5 via-violet-500/5 to-transparent border-primary/15 shadow-md flex-1">
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                <span>ملف الطالب الأكاديمي</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xl font-black font-mono">
                  {level}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">اللقب الأكاديمي:</h4>
                  <p className="text-sm font-black text-primary mt-0.5">{getAcademicRank()}</p>
                </div>
              </div>

              {/* XP Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-muted-foreground">الترقية للمستوى التالي:</span>
                  <span className="font-mono text-primary">{xp} / {nextLevelXp} XP</span>
                </div>
                <div className="h-3 w-full bg-muted border rounded-full overflow-hidden shadow-inner p-0.5">
                  <div 
                    className="h-full bg-gradient-to-r from-primary via-violet-500 to-indigo-500 rounded-full transition-all duration-500 shadow-md"
                    style={{ width: `${levelProgress}%` }}
                  />
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                <div className="p-2.5 rounded-xl border bg-card/60 text-center space-y-0.5">
                  <span className="text-[10px] font-bold text-muted-foreground block">الجلسات المكتملة</span>
                  <span className="text-lg font-black font-mono text-primary">{sessionsCompleted}</span>
                </div>
                <div className="p-2.5 rounded-xl border bg-card/60 text-center space-y-0.5">
                  <span className="text-[10px] font-bold text-muted-foreground block">إجمالي دقائق التركيز</span>
                  <span className="text-lg font-black font-mono text-primary">{sessionsCompleted * 25} د</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ambient Sound Box */}
          <Card className="border border-border/80 shadow-md flex-1 flex flex-col justify-between bg-card">
            <CardHeader className="py-4 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Volume2 className="h-5 w-5 text-primary shrink-0 animate-pulse" />
                <span>غرفة أصوات التركيز المتعددة</span>
              </CardTitle>
              {Object.values(ambientMix).some(channel => channel.active) && (
                <Button 
                  id="btn_mute_all"
                  size="sm" 
                  variant="ghost" 
                  onClick={handleMuteAll} 
                  className="h-7 text-[10px] font-bold text-destructive hover:bg-destructive/5 hover:text-destructive flex items-center gap-1 py-0.5 px-2 rounded-lg border border-destructive/20"
                >
                  <VolumeX className="h-3.5 w-3.5" />
                  <span>إيقاف الكل</span>
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-4 space-y-4 flex-1">
              
              {/* Sounds Buttons Grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'lofi', label: 'موسيقى Lo-Fi', icon: BookOpen },
                  { id: 'rain', label: 'صوت مطر هادئ', icon: Moon },
                  { id: 'library', label: 'مكتبة أكاديمية', icon: Coffee },
                  { id: 'nature', label: 'أجواء الطبيعة', icon: WindIcon }
                ].map((s) => {
                  const Icon = s.icon || Coffee
                  const isActive = ambientMix[s.id as 'lofi' | 'rain' | 'library' | 'nature'].active
                  return (
                    <button
                      id={`btn_sound_${s.id}`}
                      key={s.id}
                      onClick={() => handleSoundToggle(s.id as any)}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all font-bold text-xs hover:bg-accent/40 ${isActive ? 'bg-primary/10 border-primary text-primary shadow-sm scale-95' : 'bg-card text-muted-foreground'}`}
                    >
                      <Icon className={`h-5 w-5 ${isActive ? 'animate-bounce text-primary' : ''}`} />
                      <span>{s.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Multi-Channel Slider Mix board */}
              <div className="space-y-3 pt-3 border-t">
                <span className="text-[10px] font-black text-muted-foreground block text-right">🎙️ لوحة مزج مستويات الصوت النشطة:</span>
                
                {Object.keys(ambientMix).filter(key => ambientMix[key as 'lofi' | 'rain' | 'library' | 'nature'].active).length === 0 ? (
                  <div className="text-center py-6 border border-dashed rounded-xl bg-muted/20 text-muted-foreground text-[10px] font-bold">
                    انقر فوق الأزرار العلوية لتفعيل قنوات الصوت ومزج الأجواء الدراسية الخاصة بك!
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
                    {[
                      { id: 'lofi', label: 'موسيقى Lo-Fi', icon: BookOpen },
                      { id: 'rain', label: 'صوت المطر', icon: Moon },
                      { id: 'library', label: 'المكتبة الأكاديمية', icon: Coffee },
                      { id: 'nature', label: 'أجواء الطبيعة', icon: WindIcon }
                    ].map((channel) => {
                      const mixState = ambientMix[channel.id as 'lofi' | 'rain' | 'library' | 'nature']
                      if (!mixState.active) return null
                      const Icon = channel.icon
                      return (
                        <div key={channel.id} className="space-y-1 p-2.5 rounded-xl bg-muted/40 border animate-in slide-in-from-top-1 duration-200">
                          <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Icon className="h-3.5 w-3.5 text-primary shrink-0 animate-pulse" />
                              <span>{channel.label}</span>
                            </span>
                            <span className="font-mono text-primary">{Math.round(mixState.volume * 100)}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Volume1 className="h-4 w-4 text-muted-foreground" />
                            <input 
                              id={`range_sound_${channel.id}`}
                              type="range" 
                              min="0" 
                              max="1" 
                              step="0.05"
                              value={mixState.volume}
                              onChange={(e) => handleChannelVolumeChange(channel.id as any, parseFloat(e.target.value))}
                              className="w-full accent-primary h-1 rounded bg-muted cursor-pointer"
                            />
                            <Volume2 className="h-4 w-4 text-primary" />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* MIDDLE COLUMN: Interactive Holographic Pomodoro Timer */}
        <div className="lg:col-span-1 flex flex-col items-center justify-center">
          <Card className="w-full border-border/80 shadow-lg flex flex-col items-center p-6 bg-card">
            
            {/* Timer Type Select Segment */}
            <div className="flex bg-muted/50 p-1 rounded-xl border w-full max-w-[280px] shadow-inner mb-6">
              {[
                { id: 'focus', label: 'التركيز' },
                { id: 'shortBreak', label: 'استراحة' },
                { id: 'longBreak', label: 'راحة طويلة' }
              ].map((t) => (
                <button
                  id={`btn_timer_type_${t.id}`}
                  key={t.id}
                  onClick={() => setTimerType(t.id as any)}
                  className={`flex-grow py-1.5 rounded-lg text-xs font-bold transition-all ${timerType === t.id ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-accent/40'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Glowing Circular Clock Widget */}
            <div className="relative h-60 w-60 flex items-center justify-center mb-6">
              {/* Background Circular Ring */}
              <svg className="absolute w-full h-full transform -rotate-90">
                <circle
                  cx="120"
                  cy="120"
                  r="105"
                  className="stroke-muted fill-transparent"
                  strokeWidth="8"
                />
                <circle
                  cx="120"
                  cy="120"
                  r="105"
                  className="stroke-primary fill-transparent transition-all duration-300 shadow-lg drop-shadow"
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 105}
                  strokeDashoffset={2 * Math.PI * 105 * (1 - getCirclePercentage() / 100)}
                  strokeLinecap="round"
                />
              </svg>
              
              {/* Time digits text */}
              <div className="text-center z-10 space-y-1">
                <div className="text-4xl font-black font-mono tracking-tight text-foreground select-text animate-pulse-slow">
                  {formatTime(timeLeft)}
                </div>
                <div className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">
                  {timerType === 'focus' ? '📅 مذاكرة' : '☕ استراحة'}
                </div>
              </div>
            </div>

            {/* Timer Controllers */}
            <div className="flex gap-3 justify-center w-full">
              <Button 
                id="btn_timer_toggle"
                onClick={() => setIsRunning(!isRunning)} 
                className="flex-1 font-bold shadow-md hover:shadow-lg transition-all h-10 gap-1 text-xs"
              >
                {isRunning ? (
                  <>
                    <Pause className="h-4.5 w-4.5 shrink-0" />
                    <span>إيقاف مؤقت</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4.5 w-4.5 shrink-0 animate-pulse" />
                    <span>ابدأ المذاكرة</span>
                  </>
                )}
              </Button>
              <Button 
                id="btn_timer_reset"
                variant="outline" 
                onClick={handleReset}
                className="font-bold border-border/80 hover:bg-accent/40 w-12 p-0 h-10 shrink-0"
                title="إعادة تعيين الساعة"
              >
                <RotateCcw className="h-4.5 w-4.5" />
              </Button>
            </div>

            {/* Custom Timer Settings Drawer Gated */}
            <div className="w-full border-t mt-6 pt-4 space-y-3">
              <span className="text-[10px] font-bold text-muted-foreground block text-right">⚙️ تخصيص أوقات الجلسات (بالدقائق):</span>
              <div className="grid grid-cols-3 gap-2 text-[10px] font-bold">
                <div className="space-y-1">
                  <label className="text-muted-foreground block">مذاكرة</label>
                  <Input 
                    type="number" 
                    min="1" 
                    value={focusDur} 
                    onChange={e => setFocusDur(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-8 text-center text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-muted-foreground block">راحة</label>
                  <Input 
                    type="number" 
                    min="1" 
                    value={shortDur} 
                    onChange={e => setShortDur(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-8 text-center text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-muted-foreground block">راحة ط</label>
                  <Input 
                    type="number" 
                    min="1" 
                    value={longDur} 
                    onChange={e => setLongDur(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-8 text-center text-xs font-bold"
                  />
                </div>
              </div>
            </div>

          </Card>
        </div>

        {/* RIGHT COLUMN: Achievements Trophy Case */}
        <div className="lg:col-span-1">
          <Card className="h-full border-border/80 shadow-md flex flex-col justify-between">
            <CardHeader className="py-4 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500 shrink-0 animate-bounce" />
                <span>خزانة أوسمة التركيز الأكاديمي</span>
              </CardTitle>
              <CardDescription className="text-[10px]">الأوسمة المحفزة التي تفتحها عند إكمال الجلسات والتفوق.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 flex-1 overflow-y-auto space-y-3.5 scrollbar-thin">
              {achievementsList.map((a) => {
                const Icon = a.icon
                return (
                  <div 
                    key={a.id}
                    className={`flex items-center gap-3.5 p-3 rounded-xl border transition-all ${a.unlocked ? 'bg-gradient-to-r from-amber-500/10 to-transparent border-amber-500/30' : 'bg-card opacity-50 border-border/60'}`}
                  >
                    <div className={`p-2.5 rounded-xl border ${a.unlocked ? 'bg-amber-500 text-card border-amber-400 shadow-md animate-pulse' : 'bg-muted text-muted-foreground'}`}>
                      <Icon className="h-5 w-5 shrink-0" />
                    </div>
                    <div className="text-right">
                      <h4 className={`text-xs font-black ${a.unlocked ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                        {a.title}
                        {a.unlocked && ' ⭐'}
                      </h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{a.description}</p>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>

      </div>

    </div>
  )
}

// Temporary placeholder for WindIcon to prevent compile errors
function WindIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.8 19.6A2 2 0 1 0 14 16H2" />
      <path d="M17.5 15.6A2 2 0 1 0 18 12H2" />
      <path d="M9.8 9.6A2 2 0 1 1 11 6H2" />
    </svg>
  )
}
