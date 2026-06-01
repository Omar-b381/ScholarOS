import * as React from 'react'
import { useAppStore } from '@/store/useAppStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import {
  Settings as SettingsIcon,
  User,
  Bot,
  Bell,
  Database,
  Info,
  Save,
  Download,
  Upload,
  Trash2,
  Moon,
  Sun,
  Laptop,
  Wrench,
  RefreshCw,
  History,
  AlertTriangle,
  Cloud
} from 'lucide-react'

export function Settings() {
  const {
    profile,
    setProfile,
    theme,
    setTheme,
    loadAllData
  } = useAppStore()

  // App version state
  const [appVersion, setAppVersion] = React.useState('1.0.0')

  // Edit Profile States
  const [profName, setProfName] = React.useState(profile.name)
  const [profUni, setProfUni] = React.useState(profile.university)
  const [profMajor, setProfMajor] = React.useState(profile.major)
  const [profSemester, setProfSemester] = React.useState(profile.semester)

  // API keys states (Masked/Hidden)
  const [keys, setKeys] = React.useState({
    openai: '',
    anthropic: '',
    gemini: '',
    groq: '',
    openrouter: '',
    youtube: ''
  })

  // Google Calendar state
  const [googleConnected, setGoogleConnected] = React.useState(false)
  const [googleEmail, setGoogleEmail] = React.useState('')
  const [googleName, setGoogleName] = React.useState('')
  const [googlePicture, setGooglePicture] = React.useState('')
  const [googleLoading, setGoogleLoading] = React.useState(false)
  const [customClientId, setCustomClientId] = React.useState('')
  const [customClientSecret, setCustomClientSecret] = React.useState('')
  const [showAdvancedGoogle, setShowAdvancedGoogle] = React.useState(false)

  // Custom AI settings states
  const [customBaseUrl, setCustomBaseUrl] = React.useState('')
  const [customApiKey, setCustomApiKey] = React.useState('')
  const [customModel, setCustomModel] = React.useState('')

  // Notifications settings
  const [notifEnabled, setNotifEnabled] = React.useState(true)
  const [notif24h, setNotif24h] = React.useState(true)
  const [notif1h, setNotif1h] = React.useState(true)

  // SyncGuard States
  const [syncSettings, setSyncSettingsState] = React.useState({
    autoSync: true,
    paused: false,
    deviceId: 'desktop-primary',
    encryptionKey: 'scholar-default-passkey',
    offlineSimulated: false,
    lastSyncTimestamp: '1970-01-01T00:00:00.000Z',
    pendingCount: 0,
    supabaseUrl: '',
    supabaseAnonKey: ''
  })
  const [syncLogs, setSyncLogs] = React.useState<any[]>([])
  const [gradeConflicts, setGradeConflicts] = React.useState<any[]>([])
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [syncMessage, setSyncMessage] = React.useState<{ type: string; text: string } | null>(null)
  const [showKey, setShowKey] = React.useState(false)
  const [showSupaKey, setShowSupaKey] = React.useState(false)
  const [isTesting, setIsTesting] = React.useState(false)
  const [testStatus, setTestStatus] = React.useState<{ success: boolean; message: string } | null>(null)


  const loadSyncData = React.useCallback(async () => {
    try {
      if (window.electronAPI && window.electronAPI.syncGuard) {
        const status = await window.electronAPI.syncGuard.getStatus()
        setSyncSettingsState(status)
        const logs = await window.electronAPI.syncGuard.getLogs()
        setSyncLogs(logs)
        const conflicts = await window.electronAPI.syncGuard.getGradeConflicts()
        setGradeConflicts(conflicts)
      }
    } catch (err) {
      console.error('[SyncGuard UI] Failed to load data:', err)
    }
  }, [])

  React.useEffect(() => {
    loadSyncData()

    if (window.electronAPI && window.electronAPI.on) {
      const unsubUpdated = window.electronAPI.on('sync:updated', () => {
        loadSyncData()
        loadAllData() // reload global study data if synced
      })

      const unsubToast = window.electronAPI.on('sync:toast', (args: any) => {
        const { type, message } = args
        setSyncMessage({ type, text: message })
        loadSyncData()
        loadAllData()
        setTimeout(() => {
          setSyncMessage(null)
        }, 6000)
      })

      return () => {
        if (unsubUpdated) unsubUpdated()
        if (unsubToast) unsubToast()
      }
    }
    return undefined
  }, [loadSyncData, loadAllData])

  React.useEffect(() => {

    // Fetch version
    window.electronAPI.app.getVersion().then(setAppVersion).catch(console.error)

    // Load saved API Keys from electron store
    Promise.all([
      window.electronAPI.settings.get('settings.ai.keys.openai'),
      window.electronAPI.settings.get('settings.ai.keys.anthropic'),
      window.electronAPI.settings.get('settings.ai.keys.gemini'),
      window.electronAPI.settings.get('settings.ai.keys.groq'),
      window.electronAPI.settings.get('settings.ai.keys.openrouter'),
      window.electronAPI.settings.get('settings.youtube.apiKey'),
      // Load notifications
      window.electronAPI.settings.get('settings.notifications.enabled'),
      window.electronAPI.settings.get('settings.notifications.notify24h'),
      window.electronAPI.settings.get('settings.notifications.notify1h'),
      // Load Google settings
      window.electronAPI.settings.get('settings.googleCalendar.customClientId'),
      window.electronAPI.settings.get('settings.googleCalendar.customClientSecret'),
      // Load Custom AI Settings
      window.electronAPI.settings.get('settings.ai.custom.baseUrl'),
      window.electronAPI.settings.get('settings.ai.custom.apiKey'),
      window.electronAPI.settings.get('settings.ai.custom.model')
    ]).then(([open, ant, gem, grq, opr, ytb, nEnabled, n24, n1, gClientId, gClientSecret, cBaseUrl, cApiKey, cModel]) => {
      setKeys({
        openai: open || '',
        anthropic: ant || '',
        gemini: gem || '',
        groq: grq || '',
        openrouter: opr || '',
        youtube: ytb || ''
      })
      setCustomClientId(gClientId || '')
      setCustomClientSecret(gClientSecret || '')
      setCustomBaseUrl(cBaseUrl || '')
      setCustomApiKey(cApiKey || '')
      setCustomModel(cModel || '')
      if (nEnabled !== undefined) setNotifEnabled(!!nEnabled)
      if (n24 !== undefined) setNotif24h(!!n24)
      if (n1 !== undefined) setNotif1h(!!n1)
    }).catch(console.error)

    // Fetch Google connection status
    window.electronAPI.googleCalendar.getStatus().then(status => {
      if (status.connected) {
        setGoogleConnected(true)
        setGoogleEmail(status.email || '')
        setGoogleName(status.name || '')
        setGooglePicture(status.picture || '')
      }
    }).catch(console.error)
  }, [])

  // Actions
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    await setProfile({
      name: profName,
      university: profUni,
      major: profMajor,
      semester: profSemester
    })
    alert('تم حفظ بيانات الملف الشخصي بنجاح!')
  }

  const handleSaveKeys = async (e: React.FormEvent) => {
    e.preventDefault()
    await Promise.all([
      window.electronAPI.settings.set('settings.ai.keys.openai', keys.openai),
      window.electronAPI.settings.set('settings.ai.keys.anthropic', keys.anthropic),
      window.electronAPI.settings.set('settings.ai.keys.gemini', keys.gemini),
      window.electronAPI.settings.set('settings.ai.keys.groq', keys.groq),
      window.electronAPI.settings.set('settings.ai.keys.openrouter', keys.openrouter),
      window.electronAPI.settings.set('settings.youtube.apiKey', keys.youtube),
      // Save Custom AI Settings
      window.electronAPI.settings.set('settings.ai.custom.baseUrl', customBaseUrl),
      window.electronAPI.settings.set('settings.ai.custom.apiKey', customApiKey),
      window.electronAPI.settings.set('settings.ai.custom.model', customModel),
      // Google Calendar custom API keys settings
      window.electronAPI.settings.set('settings.googleCalendar.customClientId', customClientId),
      window.electronAPI.settings.set('settings.googleCalendar.customClientSecret', customClientSecret)
    ])
    alert('تم حفظ مفاتيح التشغيل والـ API بنجاح!')
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    try {
      const res = await window.electronAPI.googleCalendar.login()
      if (res.success) {
        setGoogleConnected(true)
        setGoogleEmail(res.email || '')
        const status = await window.electronAPI.googleCalendar.getStatus()
        if (status.connected) {
          setGoogleEmail(status.email || '')
          setGoogleName(status.name || '')
          setGooglePicture(status.picture || '')
        }
        alert('تم ربط حساب Google Calendar بنجاح!')
      } else {
        alert(`فشل ربط الحساب: ${res.message}`)
      }
    } catch (err: any) {
      console.error(err)
      alert(`حدث خطأ أثناء ربط الحساب: ${err.message}`)
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleGoogleLogout = async () => {
    if (confirm('هل أنت متأكد من إلغاء ربط حساب تقويم Google الخاص بك؟')) {
      try {
        await window.electronAPI.googleCalendar.logout()
        setGoogleConnected(false)
        setGoogleEmail('')
        setGoogleName('')
        setGooglePicture('')
        alert('تم إلغاء ربط الحساب بنجاح!')
      } catch (err: any) {
        console.error(err)
        alert(`فشل إلغاء الربط: ${err.message}`)
      }
    }
  }

  const handleSaveNotifications = async () => {
    await Promise.all([
      window.electronAPI.settings.set('settings.notifications.enabled', notifEnabled),
      window.electronAPI.settings.set('settings.notifications.notify24h', notif24h),
      window.electronAPI.settings.set('settings.notifications.notify1h', notif1h)
    ])
    alert('تم تعديل تفضيلات التنبيهات بنجاح!')
  }

  // Backup Database to Local JSON file
  const handleBackupDB = async () => {
    try {
      const res = await window.electronAPI.settings.backup()
      if (res.success) {
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(res.data)
        const exportAnchor = document.createElement('a')
        exportAnchor.setAttribute('href', dataUri)
        exportAnchor.setAttribute('download', `scholar_os_backup_${Date.now()}.json`)
        document.body.appendChild(exportAnchor)
        exportAnchor.click()
        document.body.removeChild(exportAnchor)
      }
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'فشل توليد النسخة الاحتياطية')
    }
  }

  // Restore Database from JSON file
  const handleRestoreDB = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const text = event.target?.result as string
      try {
        if (confirm('تنبيه: سيتم استبدال كامل قاعدة البيانات الحالية ببيانات ملف النسخة الاحتياطية، هل تريد المتابعة؟')) {
          const res = await window.electronAPI.settings.restore(text)
          if (res.success) {
            alert('تمت استعادة قاعدة البيانات بنجاح! سيتم إعادة تحميل البرنامج.')
            await loadAllData()
            window.location.reload()
          }
        }
      } catch (err: any) {
        console.error(err)
        alert(err.message || 'فشل استيراد النسخة الاحتياطية. يرجى التأكد من سلامة وصلاحية بنية الملف.')
      }
    }
    reader.readAsText(file)
  }

  // Clear All database logs and settings (Factory Reset)
  const handleClearAllData = async () => {
    if (confirm('⚠️ تحذير نهائي: هذا الخيار سيقوم بمسح كافة بياناتك الأكاديمية (المواد، درجاتك، تقويمك، الملاحظات) ومفاتيح التشغيل وإعادتها لحالة المصنع! هل أنت متأكد من المتابعة؟')) {
      try {
        const res = await window.electronAPI.settings.clearAllData()
        if (res.success) {
          alert('تم مسح كافة البيانات بنجاح!')
          window.location.reload()
        }
      } catch (err: any) {
        alert(err.message || 'فشل مسح البيانات')
      }
    }
  }

  // SyncGuard Actions
  const handleSaveSyncSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await window.electronAPI.syncGuard.setSettings(syncSettings)
      alert('تم حفظ إعدادات تزامن SyncGuard بنجاح!')
      loadSyncData()
    } catch (err: any) {
      alert(`فشل حفظ الإعدادات: ${err.message}`)
    }
  }

  const handleTestConnection = async () => {
    if (!syncSettings.supabaseUrl || !syncSettings.supabaseAnonKey) return
    setIsTesting(true)
    setTestStatus(null)
    try {
      const res = await window.electronAPI.syncGuard.testConnection({
        url: syncSettings.supabaseUrl,
        anonKey: syncSettings.supabaseAnonKey
      })
      if (res.success) {
        setTestStatus({ success: true, message: res.error || 'تم الاتصال بالسحابة بنجاح!' })
      } else {
        setTestStatus({ success: false, message: res.error || 'فشل الاتصال بـ Supabase.' })
      }
    } catch (err: any) {
      setTestStatus({ success: false, message: err.message || 'فشل الاتصال.' })
    } finally {
      setIsTesting(false)
    }
  }


  const handleManualSync = async () => {
    setIsSyncing(true)
    try {
      const res = await window.electronAPI.syncGuard.triggerSync()
      if (res.success) {
        alert(`اكتمل التزامن بنجاح! تم رفع ${res.pushed} وتنزيل ${res.pulled} سجل.`)
      } else {
        alert(`فشل التزامن: ${res.error || 'خطأ مجهول'}`)
      }
    } catch (err: any) {
      alert(`حدث خطأ أثناء التزامن: ${err.message}`)
    } finally {
      setIsSyncing(false)
      loadSyncData()
    }
  }

  const handleSimulateAction = async (action: string) => {
    try {
      const res = await window.electronAPI.syncGuard.simulateAction({ action })
      if (action === 'toggle_offline') {
        alert(res.offline ? 'تم تفعيل وضع انقطاع الاتصال الوهمي! ستتراكم التعديلات في قائمة الانتظار.' : 'الجهاز متصل بالشبكة مجدداً! سيتم دفع قائمة الانتظار.');
      } else if (action === 'mobile_edit') {
        alert('تمت محاكاة قيام الطالب بتعديل واجب على الهاتف! سيتم سحب التعديل وتطبيقه تلقائياً.');
      } else if (action === 'grade_conflict') {
        alert('تمت محاكاة تعديل درجة على الهاتف ودرجة أخرى محلياً! سيحصل تعارض وتتولى حماية الدرجات دمجهما وحفظ كلاهما.');
      }
      loadSyncData()
      loadAllData()
    } catch (err: any) {
      alert(`فشل إجراء المحاكاة: ${err.message}`)
    }
  }

  return (

    <div className="p-6 space-y-6 max-w-7xl mx-auto h-full overflow-y-auto scrollbar-thin">
      {/* Header */}
      <div className="border-b pb-4">
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight font-black">إعدادات النظام</h1>
        <p className="text-sm text-muted-foreground mt-1">تخصيص حساب الطالب ومفاتيح الـ API وإدارة النسخ الاحتياطي ومظهر البرنامج</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Card Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <span>الملف الشخصي للطالب</span>
            </CardTitle>
            <CardDescription>معلوماتك الأكاديمية التي تظهر في الواجهة الرئيسية وتُستخدم في المحادثات الذكية</CardDescription>
          </CardHeader>
          <form onSubmit={handleSaveProfile}>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">اسم الطالب الكلي *</label>
                <Input
                  required
                  value={profName}
                  onChange={e => setProfName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">الجامعة *</label>
                  <Input
                    required
                    value={profUni}
                    onChange={e => setProfUni(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">التخصص الدراسي *</label>
                  <Input
                    required
                    value={profMajor}
                    onChange={e => setProfMajor(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">الفصل الدراسي الحالي *</label>
                <Input
                  required
                  value={profSemester}
                  onChange={e => setProfSemester(e.target.value)}
                  placeholder="الفصل الأول 2026"
                />
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/10">
              <Button type="submit" size="sm" className="gap-1.5 mr-auto">
                <Save className="h-4 w-4" /> حفظ البيانات
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Masked API keys configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <span>مفاتيح الـ API وتشغيل الذكاء الاصطناعي وبحث يوتيوب</span>
            </CardTitle>
            <CardDescription>تُحفظ المفاتيح محلياً على جهازك بأمان تام ولا يتم تداولها عبر خوادمنا</CardDescription>
          </CardHeader>
          <form onSubmit={handleSaveKeys}>
            <CardContent className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">مفتاح Google Gemini API Key</label>
                <Input
                  type="password"
                  placeholder="AIzaSy..."
                  value={keys.gemini}
                  onChange={e => setKeys({ ...keys, gemini: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">مفتاح OpenAI API Key</label>
                <Input
                  type="password"
                  placeholder="sk-proj-..."
                  value={keys.openai}
                  onChange={e => setKeys({ ...keys, openai: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">مفتاح Anthropic Claude API Key</label>
                <Input
                  type="password"
                  placeholder="sk-ant-..."
                  value={keys.anthropic}
                  onChange={e => setKeys({ ...keys, anthropic: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">مفتاح OpenRouter API Key (مجمع لجميع النماذج)</label>
                <Input
                  type="password"
                  placeholder="sk-or-v1-..."
                  value={keys.openrouter}
                  onChange={e => setKeys({ ...keys, openrouter: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">مفتاح Groq API Key (مجاني وسريع)</label>
                <Input
                  type="password"
                  placeholder="gsk_..."
                  value={keys.groq}
                  onChange={e => setKeys({ ...keys, groq: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">مفتاح YouTube Data API v3 (للبحث والتشغيل)</label>
                <Input
                  type="password"
                  placeholder="AIzaSy..."
                  value={keys.youtube}
                  onChange={e => setKeys({ ...keys, youtube: e.target.value })}
                />
              </div>

              <div className="border-t pt-3 mt-3 space-y-3">
                <h4 className="text-xs font-black text-primary">مزود ذكاء اصطناعي مخصص (OpenAI-Compatible)</h4>
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">الرابط الأساسي للمزود (Base URL)</label>
                  <Input
                    type="text"
                    placeholder="https://api.deepseek.com/v1 أو عنوان الخادم المحلي"
                    value={customBaseUrl}
                    onChange={e => setCustomBaseUrl(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">مفتاح الـ API المخصص (Custom API Key)</label>
                  <Input
                    type="password"
                    placeholder="sk-..."
                    value={customApiKey}
                    onChange={e => setCustomApiKey(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">اسم النموذج المخصص (Custom Model Name)</label>
                  <Input
                    type="text"
                    placeholder="deepseek-chat أو اسم النموذج المخصص"
                    value={customModel}
                    onChange={e => setCustomModel(e.target.value)}
                  />
                </div>
              </div>

            </CardContent>
            <CardFooter className="border-t bg-muted/10">
              <Button type="submit" size="sm" className="gap-1.5 mr-auto">
                <Save className="h-4 w-4" /> حفظ الإعدادات والمفاتيح
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      {/* Google Calendar Sync Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm-5-7h-4v4h4v-4z"/>
            </svg>
            <span>ربط وتزامن تقويم Google (Google Calendar Integration)</span>
          </CardTitle>
          <CardDescription>قم بربط التطبيق بحسابك في Google لمزامنة مواعيد محاضراتك، اختباراتك، وخطط دراستك الذكية تلقائياً مع هاتفك.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg bg-muted/5 gap-4">
            <div className="flex items-center gap-3">
              {googleConnected && googlePicture ? (
                <img src={googlePicture} alt={googleName} className="h-10 w-10 rounded-full border" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                  G
                </div>
              )}
              <div>
                <h4 className="font-bold text-sm text-foreground">
                  {googleConnected ? `متصل باسم: ${googleName}` : 'حساب Google غير مرتبط'}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {googleConnected ? googleEmail : 'لم يتم ترخيص التطبيق للوصول إلى تقويمك الأكاديمي بعد.'}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              {googleConnected ? (
                <Button type="button" variant="outline" className="text-destructive border-destructive/20 hover:bg-destructive/5 text-xs h-9" onClick={handleGoogleLogout}>
                  إلغاء ربط الحساب
                </Button>
              ) : (
                <Button type="button" className="text-xs h-9 gap-1.5" disabled={googleLoading} onClick={handleGoogleLogin}>
                  {googleLoading ? 'جاري الاتصال...' : 'ربط حساب Google'}
                </Button>
              )}
            </div>
          </div>

          {/* Advanced Credentials Toggle */}
          <div className="border-t pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-primary p-0 h-auto hover:bg-transparent"
              onClick={() => setShowAdvancedGoogle(!showAdvancedGoogle)}
            >
              {showAdvancedGoogle ? '▼ إخفاء الإعدادات المتقدمة للمطورين' : '▲ إظهار الإعدادات المتقدمة للمطورين'}
            </Button>

            {showAdvancedGoogle && (
              <div className="mt-3 space-y-3 p-4 border rounded-lg bg-muted/10 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="text-xs text-muted-foreground space-y-2">
                  <p className="font-bold text-amber-600 dark:text-amber-400">⚠️ خطأ الوصول 403 (access_denied)؟</p>
                  <p>
                    نظراً لأن التطبيق محلي ويعمل بدون خادم مركزي (Local-first)، فإن شركة Google تتطلب إضافة بريدك الإلكتروني كـ <strong>"مستخدم اختبار (Test User)"</strong> في مشروع مطوري Google، أو أن تقوم بإنشاء <strong>مشروع Google Cloud مجاني خاص بك (يستغرق دقيقتين فقط وهو الخيار الأكثر أماناً وخصوصية لك بنسبة 100%)</strong>.
                  </p>
                  <div className="p-3 border rounded bg-background/50 space-y-1 text-[11px] leading-relaxed">
                    <p className="font-bold text-foreground">💡 خطوات إنشاء مفتاح الـ Client ID الخاص بك مجاناً وبسرعة:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>افتح منصة مطوري جوجل: <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-primary underline">Google Cloud Console</a>.</li>
                      <li>أنشئ مشروعاً جديداً (New Project) مجاناً بالكامل.</li>
                      <li>توجه إلى قائمة <strong>OAuth consent screen</strong>، اختر <strong>External</strong>، واملأ اسم التطبيق (مثال: ScholarOS) وبريدك الإلكتروني.</li>
                      <li><strong>[خطوة هامة جداً]:</strong> في مرحلة <strong>Test Users</strong>، اضغط على <strong>Add Users</strong> وأدخل نفس بريدك الإلكتروني على Google الذي تريد ربط تقويمك به!</li>
                      <li>توجه إلى قسم <strong>Credentials</strong>، اضغط <strong>Create Credentials</strong> ثم اختر <strong>OAuth client ID</strong>.</li>
                      <li>اختر نوع التطبيق: <strong>Desktop app</strong> (تطبيق سطح المكتب)، ثم اضغط <strong>Create</strong>.</li>
                      <li>سيظهر لك <strong>Client ID</strong> و <strong>Client Secret</strong>، انسخهما وضعهما بالأسفل وانقر حفظ!</li>
                    </ol>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">مُعرّف العميل الخاص بك (Google Client ID)</label>
                    <Input
                      type="text"
                      placeholder="945657038318-..."
                      value={customClientId}
                      onChange={e => setCustomClientId(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">رمز العميل السري الخاص بك (Google Client Secret)</label>
                    <Input
                      type="password"
                      placeholder="رمز العميل السري المخصص"
                      value={customClientSecret}
                      onChange={e => setCustomClientSecret(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <Button type="button" size="sm" onClick={handleSaveKeys} className="text-xs">
                    حفظ المفاتيح المخصصة
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* SyncGuard Background Sync Dashboard */}
      <Card className="col-span-1 lg:col-span-2 overflow-hidden border shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/20 text-primary animate-pulse">
                <SettingsIcon className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg font-black text-foreground">تزامن الأجهزة الذكي (SyncGuard)</CardTitle>
                <CardDescription className="text-xs mt-0.5">مزامنة فورية مشفرة بالكامل لجدول المذاكرة، المهام، والدرجات محلياً وعبر السحاب بين أجهزتك بدقة وأمان.</CardDescription>
              </div>
            </div>
            
            {/* Status Indicator Badge */}
            <div className="flex items-center gap-2">
              {syncSettings.paused ? (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 px-3 py-1 flex items-center gap-1.5 font-bold text-xs">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  موقوف مؤقتاً
                </Badge>
              ) : syncSettings.offlineSimulated ? (
                <Badge variant="outline" className="bg-gray-500/10 text-gray-400 border-gray-500/20 px-3 py-1 flex items-center gap-1.5 font-bold text-xs">
                  <div className="h-2 w-2 rounded-full bg-gray-400 animate-ping" />
                  وضع الأوفلاين (وهمي)
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 py-1 flex items-center gap-1.5 font-bold text-xs">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  متصل ومتزامن
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          {/* Silent Toast Alert Banner */}
          {syncMessage && (
            <div className={`p-3.5 rounded-lg border text-xs font-semibold animate-in slide-in-from-top duration-300 ${
              syncMessage.type.includes('offline') ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
              syncMessage.type.includes('error') ? 'bg-destructive/10 text-destructive border-destructive/20' :
              'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
            }`}>
              {syncMessage.text}
            </div>
          )}

          {/* Sync Header Metadata Glass Container */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border bg-muted/15">
            <div className="space-y-1">
              <span className="text-xs font-bold text-muted-foreground">آخر تزامن سحابي ناجح</span>
              <p className="text-sm font-black text-foreground font-mono">
                {syncSettings.lastSyncTimestamp && syncSettings.lastSyncTimestamp !== '1970-01-01T00:00:00.000Z'
                  ? new Date(syncSettings.lastSyncTimestamp).toLocaleString('ar-EG', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })
                  : 'لم يتم التزامن بعد'}
              </p>
            </div>
            <div className="space-y-1 border-r pr-4 border-border/40">
              <span className="text-xs font-bold text-muted-foreground">تعديلات معلقة في قائمة الانتظار</span>
              <div className="flex items-center gap-2">
                <p className="text-lg font-mono font-black text-primary">{syncSettings.pendingCount}</p>
                {syncSettings.pendingCount > 0 && (
                  <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded font-bold">
                    بانتظار شبكة الاتصال
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-1 border-r pr-4 border-border/40 flex items-center justify-start md:justify-end gap-2">
              <Button 
                onClick={handleManualSync} 
                disabled={isSyncing || syncSettings.paused}
                size="sm"
                className="gap-2 shrink-0 h-9 font-bold text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'جاري التزامن...' : 'مزامنة يدوية الآن'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Left Column: Settings Configuration Form */}
            <form onSubmit={handleSaveSyncSettings} className="space-y-4">
              <h3 className="text-sm font-black text-primary border-b pb-2 flex items-center gap-1.5">
                <Database className="h-4.5 w-4.5" />
                <span>إعدادات الاتصال والتشفير</span>
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg bg-card select-none">
                  <div className="space-y-0.5">
                    <label htmlFor="sync_auto" className="text-xs font-bold cursor-pointer text-foreground">تزامن تلقائي خلفي</label>
                    <p className="text-[10px] text-muted-foreground">دورة كل 5 دقائق</p>
                  </div>
                  <input
                    type="checkbox"
                    id="sync_auto"
                    className="rounded border-border cursor-pointer h-4.5 w-4.5 text-primary"
                    checked={syncSettings.autoSync}
                    onChange={e => setSyncSettingsState({ ...syncSettings, autoSync: e.target.checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg bg-card select-none">
                  <div className="space-y-0.5">
                    <label htmlFor="sync_paused" className="text-xs font-bold cursor-pointer text-foreground">إيقاف التزامن مؤقتاً</label>
                    <p className="text-[10px] text-muted-foreground">تعطيل كافة الدورات</p>
                  </div>
                  <input
                    type="checkbox"
                    id="sync_paused"
                    className="rounded border-border cursor-pointer h-4.5 w-4.5 text-primary"
                    checked={syncSettings.paused}
                    onChange={e => setSyncSettingsState({ ...syncSettings, paused: e.target.checked })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">مُعرّف هذا الجهاز (Device ID)</label>
                <Input
                  required
                  value={syncSettings.deviceId}
                  onChange={e => setSyncSettingsState({ ...syncSettings, deviceId: e.target.value })}
                  placeholder="مثال: main-laptop, mobile-device"
                />
              </div>

              <div className="space-y-1 relative">
                <label className="text-xs font-bold text-muted-foreground">مفتاح التشفير المحلي للأمان AES-256 (Data Cipher Key)</label>
                <div className="flex gap-2">
                  <Input
                    required
                    type={showKey ? 'text' : 'password'}
                    value={syncSettings.encryptionKey}
                    onChange={e => setSyncSettingsState({ ...syncSettings, encryptionKey: e.target.value })}
                    placeholder="مفتاح سري مشفر للبيانات..."
                    className="font-mono flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowKey(!showKey)}
                    className="px-3 shrink-0 h-10 text-xs font-semibold"
                  >
                    {showKey ? 'إخفاء' : 'إظهار'}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
                  💡 <strong>أمان تام:</strong> تشفير البيانات يحصل على جهازك قبل إرسالها. يجب تعيين <strong>نفس المفتاح</strong> على جميع أجهزتك (الكمبيوتر والهاتف) لتتمكن من فك تشفير البيانات ومزامنتها بنجاح.
                </p>
              </div>

              {/* Supabase Cloud Connection Fields (Optional) */}
              <div className="border-t pt-4 mt-4 space-y-4">
                <h4 className="text-xs font-black text-primary flex items-center gap-1.5">
                  <Cloud className="h-4 w-4" />
                  <span>الاتصال بسحابة Supabase الحقيقية (اختياري)</span>
                </h4>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  إذا كنت ترغب بالانتقال من وضع المحاكاة المحلي إلى التزامن الفعلي المباشر عبر السحاب، قم بإنشاء مشروع في **Supabase** وأدخل بيانات الاتصال هنا. اترك الحقول فارغة للعودة لوضع المحاكاة التلقائي.
                </p>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">رابط مشروع Supabase (Supabase Project URL)</label>
                  <Input
                    type="text"
                    value={syncSettings.supabaseUrl || ''}
                    onChange={e => setSyncSettingsState({ ...syncSettings, supabaseUrl: e.target.value })}
                    placeholder="https://your-project.supabase.co"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">المفتاح العام لمشروعك (Supabase Anon Key)</label>
                  <div className="flex gap-2">
                    <Input
                      type={showSupaKey ? 'text' : 'password'}
                      value={syncSettings.supabaseAnonKey || ''}
                      onChange={e => setSyncSettingsState({ ...syncSettings, supabaseAnonKey: e.target.value })}
                      placeholder="eyJhbGciOi..."
                      className="font-mono flex-1 text-xs"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowSupaKey(!showSupaKey)}
                      className="px-3 shrink-0 h-10 text-xs font-semibold"
                    >
                      {showSupaKey ? 'إخفاء' : 'إظهار'}
                    </Button>
                  </div>
                </div>

                {/* Connectivity test controls */}
                <div className="flex gap-2 items-center justify-between bg-muted/20 p-2.5 rounded border text-xs">
                  <span className="font-bold">فحص الاتصال الفوري:</span>
                  <div className="flex gap-2">
                    {testStatus && (
                      <span className={`self-center text-[10px] font-bold px-2 py-0.5 rounded border max-w-[200px] truncate ${
                        testStatus.success 
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                          : 'bg-destructive/10 text-destructive border-destructive/20'
                      }`} title={testStatus.message}>
                        {testStatus.message}
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleTestConnection}
                      disabled={isTesting || !syncSettings.supabaseUrl || !syncSettings.supabaseAnonKey}
                      className="h-8 text-[11px] font-bold"
                    >
                      {isTesting ? 'جاري الفحص...' : 'تحقق من الاتصال الآن'}
                    </Button>
                  </div>
                </div>

                {/* SQL setup copy-paste snippet */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground">SQL Setup Snippet:</span>
                  <div className="p-3 border rounded bg-background/50 text-[10px] font-mono select-all overflow-x-auto leading-relaxed max-h-[140px] text-left scrollbar-thin" dir="ltr">
                    {`create table sync_records (
  id text not null,
  table_name text not null,
  payload text not null,
  updated_at timestamp with time zone not null,
  device_id text not null,
  schema_version integer default 1,
  checksum text not null,
  primary key (id, table_name)
);

alter table sync_records enable row level security;
create policy "Allow public access" on sync_records for all using (true) with check (true);`}
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed text-right mt-1">
                    انسخ الكود أعلاه والزقه في **Supabase SQL Editor** في مشروعك وأنشئ الجدول ليتمكن التطبيق من مزامنة البيانات السحابية الحقيقية بنجاح!
                  </p>
                </div>
              </div>


              <div className="flex justify-end pt-2">
                <Button type="submit" size="sm" className="gap-1.5">
                  <Save className="h-4 w-4" /> حفظ تكوين التزامن
                </Button>
              </div>
            </form>

            {/* Right Column: Simulation Sandbox */}
            <div className="space-y-4 p-4 rounded-xl border bg-primary/5">
              <h3 className="text-sm font-black text-primary border-b pb-2 flex items-center gap-1.5">
                <Wrench className="h-4.5 w-4.5" />
                <span>مختبر محاكاة التزامن والتعارض (Simulator Sandbox)</span>
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                مساحة مخصصة لاختبار سلوك SyncGuard تحت السيناريوهات المختلفة ومراجعة حل التعارضات بشكل مرئي وفوري دون مغادرة التطبيق.
              </p>

              <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-center justify-between p-3.5 border rounded-lg bg-card">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-foreground">وضع انقطاع الاتصال (Simulate Offline)</span>
                    <p className="text-[10px] text-muted-foreground">يقوم بقطع الاتصال الوهمي بالشبكة لاختبار تجميع قائمة الانتظار.</p>
                  </div>
                  <Button 
                    type="button"
                    variant={syncSettings.offlineSimulated ? 'destructive' : 'outline'}
                    size="sm"
                    className="text-xs h-9 font-bold"
                    onClick={() => handleSimulateAction('toggle_offline')}
                  >
                    {syncSettings.offlineSimulated ? 'إلغاء قطع الاتصال' : 'قطع الاتصال بالشبكة'}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3.5 border rounded-lg bg-card">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-foreground">محاكاة تعديل هاتف الطالب (Mobile Edit)</span>
                    <p className="text-[10px] text-muted-foreground">يقوم بكتابة واجب دراسي جديد من هاتف الطالب إلى الخادم السحابي.</p>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    className="text-xs h-9 font-bold"
                    onClick={() => handleSimulateAction('mobile_edit')}
                  >
                    محاكاة تعديل الهاتف
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3.5 border rounded-lg bg-card">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-foreground">توليد تعارض في الدرجات (Grade Conflict)</span>
                    <p className="text-[10px] text-muted-foreground">يولد تعارضاً في رصد الدرجات بين الهاتف والكمبيوتر لتفعيل حماية الدرجات.</p>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    className="text-xs h-9 font-bold text-destructive hover:bg-destructive/5 border-destructive/20 text-destructive"
                    onClick={() => handleSimulateAction('grade_conflict')}
                  >
                    توليد تعارض درجات
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Grade Conflict Log Review Table */}
          {gradeConflicts.length > 0 && (
            <div className="border rounded-xl p-4 space-y-3 bg-destructive/5 border-destructive/20 mt-4">
              <h4 className="text-xs font-black text-destructive flex items-center gap-1.5">
                <AlertTriangle className="h-4.5 w-4.5" />
                <span>سجل تعارضات الدرجات الأكاديمية ورصدها (قانون حماية الدرجات)</span>
              </h4>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                تم رصد تعديل مختلف للدرجة نفسها من جهازين في نفس الوقت. تم الاحتفاظ بالدرجة ذات التحديث الأحدث تلقائياً ورصدها بالأسفل للشفافية الأكاديمية التامة.
              </p>
              <div className="overflow-x-auto">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead>معرّف السجل</TableHead>
                      <TableHead>المقرر /Semester</TableHead>
                      <TableHead>الدرجة المحلية (الكمبيوتر)</TableHead>
                      <TableHead>الدرجة البعيدة (الهاتف)</TableHead>
                      <TableHead>تاريخ الرصد</TableHead>
                      <TableHead>الحالة الأوتوماتيكية</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gradeConflicts.map((c, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-[10px]">{c.record_id.slice(0, 8)}...</TableCell>
                        <TableCell className="font-bold">{c.semester}</TableCell>
                        <TableCell className="font-mono text-destructive">{c.local_grade || 0}</TableCell>
                        <TableCell className="font-mono text-emerald-600 font-bold">{c.remote_grade || 0}</TableCell>
                        <TableCell className="font-mono text-[10px]">{new Date(c.resolved_at).toLocaleString('ar-EG')}</TableCell>
                        <TableCell>
                          <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded">
                            تم الحفظ والدمج التلقائي
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Sync History Logs Table */}
          <div className="border rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
              <History className="h-4.5 w-4.5 text-primary" />
              <span>سجل عمليات المزامنة والتفاصيل (Sync History Logs)</span>
            </h4>
            
            {syncLogs.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">لا توجد سجلات مزامنة مسجلة بعد.</div>
            ) : (
              <div className="overflow-x-auto max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                <Table className="text-xs">
                  <TableHeader className="sticky top-0 bg-card z-15">
                    <TableRow>
                      <TableHead>تاريخ العملية</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>المرفوعة</TableHead>
                      <TableHead>المنزلة</TableHead>
                      <TableHead>التعارضات</TableHead>
                      <TableHead>الزمن (ملي ثانية)</TableHead>
                      <TableHead>تفاصيل الخطأ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncLogs.slice(0, 6).map((log, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-[10px]">
                          {new Date(log.timestamp).toLocaleString('ar-EG', {
                            hour: 'numeric',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.status === 'success' ? 'success' : 'destructive'} className="text-[9px] font-bold py-0">
                            {log.status === 'success' ? 'نجاح' : 'خطأ'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-[10px]">{log.records_pushed}</TableCell>
                        <TableCell className="font-mono text-[10px]">{log.records_pulled}</TableCell>
                        <TableCell className="font-mono text-[10px] font-bold text-amber-500">{log.conflicts_resolved}</TableCell>
                        <TableCell className="font-mono text-[10px]">{log.duration_ms}ms</TableCell>
                        <TableCell className="text-[10px] text-destructive font-mono truncate max-w-[200px]">{log.error || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notifications Preference and Theme controls */}

        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <span>التنبيهات ومظهر التطبيق</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Theme picker */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground">مظهر واجهة البرنامج</label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={theme === 'light' ? 'default' : 'outline'}
                  className="gap-2 text-xs"
                  onClick={() => setTheme('light')}
                >
                  <Sun className="h-4.5 w-4.5" /> مضيء
                </Button>
                <Button
                  type="button"
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  className="gap-2 text-xs"
                  onClick={() => setTheme('dark')}
                >
                  <Moon className="h-4.5 w-4.5" /> داكن
                </Button>
                <Button
                  type="button"
                  variant={theme === 'system' ? 'default' : 'outline'}
                  className="gap-2 text-xs"
                  onClick={() => setTheme('system')}
                >
                  <Laptop className="h-4.5 w-4.5" /> تلقائي للنظام
                </Button>
              </div>
            </div>

            {/* Notification preferences checkboxes */}
            <div className="space-y-3 pt-3 border-t">
              <div className="flex items-center gap-2 select-none">
                <input
                  type="checkbox"
                  id="notif_all"
                  className="rounded border-border cursor-pointer h-4 w-4 text-primary"
                  checked={notifEnabled}
                  onChange={e => setNotifEnabled(e.target.checked)}
                />
                <label htmlFor="notif_all" className="text-xs font-bold cursor-pointer">تفعيل تنبيهات المهام والأحداث الجامعية</label>
              </div>

              {notifEnabled && (
                <div className="mr-6 space-y-2">
                  <div className="flex items-center gap-2 select-none">
                    <input
                      type="checkbox"
                      id="notif_24"
                      className="rounded border-border cursor-pointer h-3.5 w-3.5 text-primary"
                      checked={notif24h}
                      onChange={e => setNotif24h(e.target.checked)}
                    />
                    <label htmlFor="notif_24" className="text-xs text-muted-foreground cursor-pointer">تنبيه قبل الموعد بـ 24 ساعة (غداً)</label>
                  </div>
                  <div className="flex items-center gap-2 select-none">
                    <input
                      type="checkbox"
                      id="notif_1"
                      className="rounded border-border cursor-pointer h-3.5 w-3.5 text-primary"
                      checked={notif1h}
                      onChange={e => setNotif1h(e.target.checked)}
                    />
                    <label htmlFor="notif_1" className="text-xs text-muted-foreground cursor-pointer">تنبيه قبل الموعد بـ 1 ساعة</label>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/10">
            <Button size="sm" className="mr-auto gap-1.5" onClick={handleSaveNotifications}>
              <Save className="h-4 w-4" /> حفظ التفضيلات
            </Button>
          </CardFooter>
        </Card>

        {/* Database administration backup restore clear */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <span>إدارة قاعدة البيانات والنسخ الاحتياطي</span>
            </CardTitle>
            <CardDescription>قم بتصدير واستيراد بياناتك للحماية من فقدان الملفات</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button type="button" variant="outline" className="gap-2 w-full text-xs" onClick={handleBackupDB}>
                <Download className="h-4 w-4" /> تصدير نسخة احتياطية
              </Button>
              <div className="relative w-full">
                <Button type="button" variant="outline" className="gap-2 w-full text-xs pointer-events-none">
                  <Upload className="h-4 w-4" /> استيراد نسخة احتياطية
                </Button>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreDB}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>

            <Button
              type="button"
              variant="destructive"
              className="gap-2 w-full text-xs mt-4"
              onClick={handleClearAllData}
            >
              <Trash2 className="h-4 w-4" /> مسح كافة البيانات (فرمتة وإعادة تهيئة)
            </Button>
          </CardContent>

          {/* App Metadata info footer */}
          <div className="p-4 border-t bg-muted/20 text-xs flex justify-between text-muted-foreground">
            <span>ScholarOS - النسخة {appVersion}</span>
            <span>المرجع المحلي: SQLite + better-sqlite3</span>
          </div>
        </Card>
      </div>
    </div>
  )
}
