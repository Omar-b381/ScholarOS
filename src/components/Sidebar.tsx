import * as React from 'react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  FileSpreadsheet,
  Target,
  Wrench,
  Calculator,
  FileType,
  Youtube,
  FileText,
  Bot,
  Link,
  Settings,
  ChevronRight,
  ChevronLeft,
  GraduationCap,
  ShieldAlert,
  Timer,
  ClipboardCheck,
  Flame,
  Search,
  Sigma,
  Sparkles
} from 'lucide-react'

export function Sidebar() {
  const { activePage, setActivePage, profile } = useAppStore()
  const [collapsed, setCollapsed] = React.useState(false)
  const [toolsOpen, setToolsOpen] = React.useState(false)

  // SyncGuard Status State
  const [syncStatus, setSyncStatus] = React.useState({
    paused: false,
    offlineSimulated: false,
    pendingCount: 0
  })

  const loadSyncStatus = React.useCallback(async () => {
    try {
      if (window.electronAPI && window.electronAPI.syncGuard) {
        const status = await window.electronAPI.syncGuard.getStatus()
        setSyncStatus(status)
      }
    } catch (e) {}
  }, [])

  React.useEffect(() => {
    loadSyncStatus()
    if (window.electronAPI && window.electronAPI.on) {
      const unsubUpdated = window.electronAPI.on('sync:updated', () => loadSyncStatus())
      const unsubToast = window.electronAPI.on('sync:toast', () => loadSyncStatus())
      return () => {
        if (unsubUpdated) unsubUpdated()
        if (unsubToast) unsubToast()
      }
    }
    return undefined
  }, [loadSyncStatus])


  const toggleSidebar = () => setCollapsed(!collapsed)

  const menuItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { id: 'courses', label: 'المواد الدراسية', icon: BookOpen },
    { id: 'calendar', label: 'التقويم الجامعي', icon: Calendar },
    { id: 'assignments', label: 'الواجبات والخزنة', icon: FileSpreadsheet },
    { id: 'goals', label: 'الأهداف والمعدل', icon: Target },
    { id: 'focus', label: 'جلسة التركيز والـ XP', icon: Timer },
    { id: 'attendance', label: 'تتبع الحضور والغياب', icon: ClipboardCheck },
    { id: 'habits', label: 'متتبع العادات اليومية', icon: Flame },
    { id: 'schedule', label: 'جدول المذاكرة الذكي', icon: Sparkles }
  ]

  const toolItems = [
    { id: 'calculator', label: 'الحاسبة العلمية', icon: Calculator },
    { id: 'converter', label: 'محول الملفات', icon: FileType },
    { id: 'youtube', label: 'مشغل يوتيوب', icon: Youtube },
    { id: 'wiki', label: 'المفكرة والملاحظات', icon: FileText },
    { id: 'notebook', label: 'مساعد NotebookLM', icon: BookOpen },
    { id: 'research', label: 'البحث الأكاديمي والمراجع', icon: Search },
    { id: 'formulas', label: 'ورقة المعادلات العلمية', icon: Sigma }
  ]

  const bottomItems = [
    { id: 'ai', label: 'المساعد الذكي AI', icon: Bot },
    { id: 'resources', label: 'المراجع والمصادر', icon: Link },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
    { id: 'admin', label: 'وضع الإدارة', icon: ShieldAlert }
  ]

  const selectPage = (id: string) => {
    setActivePage(id)
  }

  return (
    <aside
      className={cn(
        'h-screen flex flex-col bg-card border-l border-border select-none transition-all duration-300 relative z-20',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between p-4 border-b border-border h-16">
        <div className={cn('flex items-center space-x-2 space-x-reverse overflow-hidden', collapsed && 'justify-center w-full')}>
          <GraduationCap className="h-7 w-7 text-primary shrink-0 animate-pulse" />
          {!collapsed && (
            <span className="font-extrabold text-lg text-primary tracking-tight truncate">
              ScholarOS
            </span>
          )}
        </div>
      </div>

      {/* Nav Menu */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1.5 scrollbar-thin">
        {/* Main Sections */}
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activePage === item.id
          return (
            <button
              key={item.id}
              onClick={() => selectPage(item.id)}
              className={cn(
                'w-full flex items-center p-2.5 rounded-lg text-sm font-semibold transition-all duration-200 group',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md scale-102'
                  : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn('h-5 w-5 shrink-0 ml-3', isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground')} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          )
        })}

        {/* Tools Dropdown */}
        <div className="space-y-1">
          <button
            onClick={() => {
              if (collapsed) {
                setCollapsed(false)
                setToolsOpen(true)
              } else {
                setToolsOpen(!toolsOpen)
              }
            }}
            className={cn(
              'w-full flex items-center justify-between p-2.5 rounded-lg text-sm font-semibold hover:bg-accent hover:text-accent-foreground text-muted-foreground group',
              (toolItems.some(i => activePage === i.id) && !toolsOpen) && 'bg-accent/40 text-foreground'
            )}
            title={collapsed ? 'الأدوات المساعدة' : undefined}
          >
            <div className="flex items-center">
              <Wrench className="h-5 w-5 shrink-0 ml-3 text-muted-foreground group-hover:text-foreground" />
              {!collapsed && <span>الأدوات المساعدة</span>}
            </div>
            {!collapsed && (
              <ChevronRight
                className={cn(
                  'h-4 w-4 transition-transform duration-200',
                  toolsOpen && 'rotate-90'
                )}
              />
            )}
          </button>

          {/* Collapsible Submenu */}
          {toolsOpen && !collapsed && (
            <div className="mr-4 pr-2 border-r border-border space-y-1 py-1">
              {toolItems.map((item) => {
                const Icon = item.icon
                const isActive = activePage === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => selectPage(item.id)}
                    className={cn(
                      'w-full flex items-center p-2 rounded-md text-xs font-semibold transition-colors',
                      isActive
                        ? 'bg-accent text-accent-foreground shadow-sm'
                        : 'hover:bg-accent/50 hover:text-foreground text-muted-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 ml-2 text-muted-foreground" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer / Bottom Items */}
      <div className="p-2 border-t border-border space-y-1">
        {bottomItems.map((item) => {
          const Icon = item.icon
          const isActive = activePage === item.id
          return (
            <button
              key={item.id}
              onClick={() => selectPage(item.id)}
              className={cn(
                'w-full flex items-center p-2.5 rounded-lg text-sm font-semibold transition-all duration-200 group',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md scale-102'
                  : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn('h-5 w-5 shrink-0 ml-3', isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground')} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          )
        })}

        {/* SyncGuard Real-Time Status Badge */}
        <div 
          onClick={() => setActivePage('settings')}
          className={cn(
            "flex items-center gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-accent border border-dashed transition-all duration-200 mt-2 select-none",
            collapsed ? "justify-center border-transparent bg-transparent" : "border-border/40 bg-muted/10 mx-1"
          )}
          title={
            syncStatus.paused ? "التزامن موقوف مؤقتاً" :
            syncStatus.offlineSimulated ? "وضع الأوفلاين (المحاكاة نشطة)" :
            syncStatus.pendingCount > 0 ? `${syncStatus.pendingCount} تعديلات معلقة في الانتظار` :
            "متصل وجاهز - آمن وسحابي"
          }
        >
          {syncStatus.paused ? (
            <div className="h-2.5 w-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
          ) : syncStatus.offlineSimulated ? (
            <div className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse" />
          ) : (
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
          )}

          {!collapsed && (
            <div className="flex flex-col text-right">
              <span className="text-[10px] font-black text-foreground">
                {syncStatus.paused ? "تزامن موقوف" :
                 syncStatus.offlineSimulated ? "وضع الأوفلاين" :
                 syncStatus.pendingCount > 0 ? `${syncStatus.pendingCount} معلق` :
                 "SyncGuard نشط"}
              </span>
              <span className="text-[9px] text-muted-foreground scale-95 origin-right">
                {syncStatus.paused ? "اضغط للتفعيل" :
                 syncStatus.offlineSimulated ? "في انتظار الاتصال" :
                 "البيانات آمنة"}
              </span>
            </div>
          )}
        </div>

        {/* Collapse Button */}
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center p-2 mt-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground border border-border"
        >
          {collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

      </div>
    </aside>
  )
}
