import * as React from 'react'
import { useAppStore } from '@/store/useAppStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
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
  Laptop
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
