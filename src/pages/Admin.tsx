import * as React from 'react'
import { useAppStore, Lecturer, StudentProfile } from '@/store/useAppStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import {
  ShieldAlert,
  UserCheck,
  Users,
  Activity,
  Plus,
  Trash2,
  Lock,
  Unlock,
  KeyRound,
  FileSpreadsheet,
  Settings,
  Mail,
  Building,
  MapPin,
  RefreshCw,
  PlusCircle,
  FileCheck
} from 'lucide-react'

export function Admin() {
  const {
    lecturers,
    profiles,
    activeProfileId,
    saveLecturer,
    deleteLecturer,
    saveProfile,
    deleteProfile,
    switchProfile
  } = useAppStore()

  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = React.useState(false)
  const [passcode, setPasscode] = React.useState('')
  const [errorMsg, setErrorMsg] = React.useState('')

  // Active sub-tab
  const [activeTab, setActiveTab] = React.useState<'lecturers' | 'profiles' | 'diagnostics'>('lecturers')

  // Lecturers form state
  const [lecturerForm, setLecturerForm] = React.useState({ id: '', name: '', email: '', office: '', department: '' })
  const [isEditingLecturer, setIsEditingLecturer] = React.useState(false)

  // Profiles form state
  const [profileForm, setProfileForm] = React.useState({ id: '', name: '', university: '', major: '', semester: 'الفصل الدراسي الأول' })
  const [isCreatingProfile, setIsCreatingProfile] = React.useState(false)

  // Diagnostics state
  const [dbStats, setDbStats] = React.useState<Record<string, number>>({})
  const [notificationLogs, setNotificationLogs] = React.useState<any[]>([])
  const [isLoadingDiagnostics, setIsLoadingDiagnostics] = React.useState(false)

  // Load diagnostics if tab is active
  const loadDiagnostics = React.useCallback(async () => {
    setIsLoadingDiagnostics(true)
    try {
      const stats = await window.electronAPI.db.getStats()
      const logs = await window.electronAPI.db.notifications.getLogs()
      setDbStats(stats || {})
      setNotificationLogs(logs || [])
    } catch (err) {
      console.error('Failed to load diagnostics', err)
    } finally {
      setIsLoadingDiagnostics(false)
    }
  }, [])

  React.useEffect(() => {
    if (isAuthenticated && activeTab === 'diagnostics') {
      loadDiagnostics()
    }
  }, [isAuthenticated, activeTab, loadDiagnostics])

  const handleAuthenticate = (e: React.FormEvent) => {
    e.preventDefault()
    if (passcode === '1234') {
      setIsAuthenticated(true)
      setErrorMsg('')
    } else {
      setErrorMsg('رمز المرور خاطئ! يرجى إدخال الرمز الصحيح (الافتراضي 1234)')
      setPasscode('')
    }
  }

  // Lecturer Handlers
  const handleSaveLecturer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lecturerForm.name) return
    const id = lecturerForm.id || crypto.randomUUID()

    await saveLecturer({
      id,
      name: lecturerForm.name,
      email: lecturerForm.email,
      office: lecturerForm.office,
      department: lecturerForm.department
    })

    setLecturerForm({ id: '', name: '', email: '', office: '', department: '' })
    setIsEditingLecturer(false)
  }

  const handleEditLecturer = (lec: Lecturer) => {
    setLecturerForm({
      id: lec.id,
      name: lec.name,
      email: lec.email || '',
      office: lec.office || '',
      department: lec.department || ''
    })
    setIsEditingLecturer(true)
  }

  const handleDeleteLecturer = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المحاضر نهائياً؟')) {
      await deleteLecturer(id)
    }
  }

  // Student Profile Handlers
  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profileForm.name || !profileForm.university || !profileForm.major) return
    const id = crypto.randomUUID()

    await saveProfile({
      id,
      name: profileForm.name,
      university: profileForm.university,
      major: profileForm.major,
      semester: profileForm.semester
    })

    setProfileForm({ id: '', name: '', university: '', major: '', semester: 'الفصل الدراسي الأول' })
    setIsCreatingProfile(false)
  }

  const handleSwitchProfile = async (id: string) => {
    await switchProfile(id)
    // Reload database parameters for the active user
    await useAppStore.getState().loadAllData()
  }

  const handleDeleteProfile = async (id: string) => {
    if (id === activeProfileId) {
      alert('لا يمكن حذف الملف الشخصي النشط حالياً!')
      return
    }
    if (confirm('تنبيه: سيؤدي حذف هذا الملف إلى إزالته من قائمة الاختيار، هل تريد الاستمرار؟')) {
      await deleteProfile(id)
    }
  }

  const handleClearLogs = async () => {
    if (confirm('هل تريد مسح سجل التنبيهات من النظام نهائياً؟')) {
      await window.electronAPI.db.notifications.clearLogs()
      await loadDiagnostics()
    }
  }

  // Authenticate Lockscreen Rendering
  if (!isAuthenticated) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background/95 p-6" dir="rtl">
        <Card className="max-w-md w-full border-2 border-primary/20 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-l from-primary via-indigo-500 to-violet-600" />
          <CardHeader className="text-center pt-8">
            <div className="mx-auto bg-primary/10 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-3">
              <ShieldAlert className="h-7 w-7 text-primary animate-bounce" />
            </div>
            <CardTitle className="text-2xl font-black tracking-tight text-foreground">بوابة الإدارة الإدارية (Super User)</CardTitle>
            <CardDescription className="text-xs mt-1.5">
              هذه المنطقة مخصصة لأعضاء الإدارة لتعديل بيانات النظام، وملفات الطلاب الأكاديمية، وسجلات التشخيص.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8 px-6">
            <form onSubmit={handleAuthenticate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-muted-foreground flex items-center gap-1.5 mb-1">
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>أدخل رمز المرور الإداري</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground">
                    <Lock className="h-4 w-4" />
                  </span>
                  <Input
                    type="password"
                    placeholder="رمز المرور (الافتراضي: 1234)"
                    className="pr-10 text-center font-mono font-bold text-lg"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                {errorMsg && <p className="text-[10px] text-destructive font-bold mt-1.5 text-center">{errorMsg}</p>}
              </div>
              <Button type="submit" className="w-full gap-2 mt-2">
                <Unlock className="h-4 w-4" /> فتح الصلاحيات الإدارية
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Authentic Admin Workspace Rendering
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto h-full overflow-y-auto scrollbar-thin" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-primary/20 gap-1 text-[10px] py-0.5 px-2">
              <KeyRound className="h-3 w-3" /> وضع المستخدم الخارق
            </Badge>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight font-black mt-1">لوحة الإدارة والمطوّرين</h1>
          <p className="text-sm text-muted-foreground">إدارة الهيئة التدريسية، وتنسيق الحسابات الطلابية المتعددة، وتتبع الصحة العامة لقواعد البيانات.</p>
        </div>
        <Button size="sm" variant="outline" className="text-destructive gap-1.5" onClick={() => setIsAuthenticated(false)}>
          <Lock className="h-4 w-4" /> قفل الصلاحيات
        </Button>
      </div>

      {/* Tabs selectors */}
      <div className="flex gap-2 border-b pb-1 select-none">
        <Button
          size="sm"
          variant={activeTab === 'lecturers' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('lecturers')}
          className="gap-1.5"
        >
          <Users className="h-4 w-4" /> الهيئة التدريسية ({lecturers.length})
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'profiles' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('profiles')}
          className="gap-1.5"
        >
          <UserCheck className="h-4 w-4" /> ملفات الطلاب ({profiles.length})
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'diagnostics' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('diagnostics')}
          className="gap-1.5"
        >
          <Activity className="h-4 w-4" /> تشخيص الصحة وقواعد البيانات
        </Button>
      </div>

      {/* Workspace content */}
      <div className="grid grid-cols-1 gap-6">
        {/* Tab 1: Lecturers Registry */}
        {activeTab === 'lecturers' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lecturer editor Form */}
            <Card className="lg:col-span-1 h-fit">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <PlusCircle className="h-5 w-5 text-primary" />
                  <span>{isEditingLecturer ? 'تعديل بيانات المحاضر' : 'إضافة محاضر جديد'}</span>
                </CardTitle>
                <CardDescription>تسجيل بيانات المحاضر المستقلة للتمكن من ربطه بالمقررات لاحقاً</CardDescription>
              </CardHeader>
              <form onSubmit={handleSaveLecturer}>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">الاسم الكلي *</label>
                    <Input
                      required
                      placeholder="د. خالد بن محمد"
                      value={lecturerForm.name}
                      onChange={e => setLecturerForm({ ...lecturerForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">البريد الإلكتروني</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground">
                        <Mail className="h-4 w-4" />
                      </span>
                      <Input
                        type="email"
                        placeholder="teacher@university.edu"
                        className="pr-9"
                        value={lecturerForm.email}
                        onChange={e => setLecturerForm({ ...lecturerForm, email: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-muted-foreground">المكتب</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                        </span>
                        <Input
                          placeholder="A-12"
                          className="pr-9"
                          value={lecturerForm.office}
                          onChange={e => setLecturerForm({ ...lecturerForm, office: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-muted-foreground">القسم</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground">
                          <Building className="h-4 w-4" />
                        </span>
                        <Input
                          placeholder="علوم الحاسب"
                          className="pr-9"
                          value={lecturerForm.department}
                          onChange={e => setLecturerForm({ ...lecturerForm, department: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <div className="p-4 border-t bg-muted/10 flex justify-between gap-2">
                  <Button type="submit" size="sm">
                    {isEditingLecturer ? 'تعديل البيانات' : 'حفظ المحاضر'}
                  </Button>
                  {isEditingLecturer && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setLecturerForm({ id: '', name: '', email: '', office: '', department: '' })
                        setIsEditingLecturer(false)
                      }}
                    >
                      إلغاء
                    </Button>
                  )}
                </div>
              </form>
            </Card>

            {/* Lecturers Table Registry */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">سجل الهيئة التدريسية</CardTitle>
                <CardDescription>عرض وتعديل كافة الأكاديميين والمحاضرين المسجلين في النظام</CardDescription>
              </CardHeader>
              <CardContent>
                {lecturers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto opacity-20 mb-2.5" />
                    <p className="text-xs">لم يتم إضافة أي محاضرين بعد.</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>الاسم</TableHead>
                          <TableHead>البريد الإلكتروني</TableHead>
                          <TableHead>القسم والمكتب</TableHead>
                          <TableHead className="text-left">العمليات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lecturers.map(lec => (
                          <TableRow key={lec.id}>
                            <TableCell className="font-extrabold">{lec.name}</TableCell>
                            <TableCell className="font-mono text-xs">{lec.email || '—'}</TableCell>
                            <TableCell className="text-xs">
                              {lec.department || '—'} {lec.office ? `(مكتب: ${lec.office})` : ''}
                            </TableCell>
                            <TableCell className="text-left space-x-1 space-x-reverse">
                              <Button variant="ghost" size="sm" className="h-7 text-primary" onClick={() => handleEditLecturer(lec)}>
                                تعديل
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 text-destructive p-1" onClick={() => handleDeleteLecturer(lec.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab 2: Student Profiles Manager */}
        {activeTab === 'profiles' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Creation Editor */}
            <Card className="lg:col-span-1 h-fit">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  <span>تسجيل حساب طالب جديد</span>
                </CardTitle>
                <CardDescription>إنشاء ملف تعريفي مستقل لطالب آخر للفصل الدراسي والدرجات الموازية</CardDescription>
              </CardHeader>
              <form onSubmit={handleCreateProfile}>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">اسم الطالب *</label>
                    <Input
                      required
                      placeholder="أحمد علي"
                      value={profileForm.name}
                      onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-muted-foreground">الجامعة *</label>
                      <Input
                        required
                        placeholder="جامعة الملك سعود"
                        value={profileForm.university}
                        onChange={e => setProfileForm({ ...profileForm, university: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-muted-foreground">التخصص *</label>
                      <Input
                        required
                        placeholder="هندسة برمجيات"
                        value={profileForm.major}
                        onChange={e => setProfileForm({ ...profileForm, major: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">الفصل الدراسي الحالي *</label>
                    <Input
                      required
                      placeholder="الفصل الأول 2026"
                      value={profileForm.semester}
                      onChange={e => setProfileForm({ ...profileForm, semester: e.target.value })}
                    />
                  </div>
                </CardContent>
                <div className="p-4 border-t bg-muted/10">
                  <Button type="submit" size="sm" className="w-full">
                    حفظ ملف الطالب
                  </Button>
                </div>
              </form>
            </Card>

            {/* Switchable Student Accounts list */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">الملفات الشخصية للطلاب المسجلين</CardTitle>
                <CardDescription>التبديل الفوري بين الحسابات الأكاديمية المختلفة للطلاب</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profiles.map(prof => {
                    const isActive = prof.id === activeProfileId
                    return (
                      <Card
                        key={prof.id}
                        className={`transition-all border-2 relative overflow-hidden ${
                          isActive ? 'border-primary bg-primary/5 shadow-md scale-102' : 'hover:bg-accent/40 border-border'
                        }`}
                      >
                        {isActive && (
                          <div className="absolute top-2 left-2">
                            <Badge className="bg-primary text-primary-foreground font-black text-[9px] py-0.5 px-2">
                              نشط حالياً
                            </Badge>
                          </div>
                        )}
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-black">{prof.name}</CardTitle>
                          <CardDescription className="text-xs truncate">{prof.university}</CardDescription>
                        </CardHeader>
                        <CardContent className="pb-4 text-xs space-y-1 text-muted-foreground">
                          <p><strong>التخصص:</strong> {prof.major}</p>
                          <p><strong>الفصل:</strong> {prof.semester}</p>
                        </CardContent>
                        <div className="p-3 border-t bg-muted/20 flex gap-2 justify-end">
                          {!isActive && (
                            <Button size="sm" variant="outline" className="h-7 text-xs font-black text-primary border-primary/20 hover:bg-primary/5" onClick={() => handleSwitchProfile(prof.id)}>
                              نشط الحساب
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive p-1" onClick={() => handleDeleteProfile(prof.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab 3: System Health & diagnostics logs */}
        {activeTab === 'diagnostics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Row sizes logs counts info */}
              <Card className="md:col-span-1">
                <CardHeader className="pb-2.5">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base flex items-center gap-1.5">
                      <FileSpreadsheet className="h-5 w-5 text-primary" />
                      <span>حجم سجلات الجداول</span>
                    </CardTitle>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={loadDiagnostics} title="تحديث">
                      <RefreshCw className={`h-3.5 w-3.5 ${isLoadingDiagnostics ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                  <CardDescription>عدد البيانات المخزنة بكل جدول في قاعدة البيانات</CardDescription>
                </CardHeader>
                <CardContent className="text-xs max-h-[300px] overflow-y-auto scrollbar-thin">
                  <div className="divide-y divide-border">
                    {Object.entries(dbStats).map(([table, count]) => (
                      <div key={table} className="flex justify-between py-2 items-center">
                        <span className="font-mono text-muted-foreground">{table}</span>
                        <Badge variant="secondary" className="font-mono font-extrabold">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Notification logs list */}
              <Card className="md:col-span-2">
                <CardHeader className="pb-2.5">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base flex items-center gap-1.5">
                      <FileCheck className="h-5 w-5 text-primary" />
                      <span>سجل التنبيهات المجدولة الخلفية (Cron)</span>
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={handleClearLogs}>
                        مسح السجل
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={loadDiagnostics}>
                        <RefreshCw className={`h-3.5 w-3.5 ${isLoadingDiagnostics ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>التنبيهات المنجزة والمُرسلة إلى سطح المكتب</CardDescription>
                </CardHeader>
                <CardContent>
                  {notificationLogs.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-xs">
                      لا يوجد أي سجلات تنبيهات مرسلة حالياً.
                    </div>
                  ) : (
                    <div className="border rounded-lg max-h-[280px] overflow-y-auto pr-1">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>معرف الحدث</TableHead>
                            <TableHead>تاريخ الإرسال</TableHead>
                            <TableHead>النوع</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="text-xs">
                          {notificationLogs.map(log => (
                            <TableRow key={log.id}>
                              <TableCell className="font-mono text-[10px] truncate max-w-[120px]">{log.event_id}</TableCell>
                              <TableCell>{new Date(log.sent_at).toLocaleString('ar-EG')}</TableCell>
                              <TableCell>
                                <Badge className="text-[9px] py-0 px-1.5" variant={log.type === '24h' ? 'outline' : 'secondary'}>
                                  {log.type === '24h' ? 'قبل 24 ساعة' : 'قبل 1 ساعة'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
