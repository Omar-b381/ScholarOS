import * as React from 'react'
import { Sidebar } from '@/components/Sidebar'
import { useAppStore } from '@/store/useAppStore'

// Import all screens
import { Dashboard } from '@/pages/Dashboard'
import { Courses } from '@/pages/Courses'
import { Calendar } from '@/pages/Calendar'
import { Assignments } from '@/pages/Assignments'
import { Goals } from '@/pages/Goals'
import { CalculatorPage } from '@/pages/Calculator'
import { Converter } from '@/pages/Converter'
import { YouTube } from '@/pages/YouTube'
import { Wiki } from '@/pages/Wiki'
import { AI } from '@/pages/AI'
import { Resources } from '@/pages/Resources'
import { Settings } from '@/pages/Settings'
import { Admin } from '@/pages/Admin'
import { NotebookLM } from '@/pages/NotebookLM'
import { Focus } from '@/pages/Focus'
import { AttendancePage } from '@/pages/Attendance'
import { HabitsPage } from '@/pages/Habits'
import { ResearchPage } from '@/pages/Research'
import { FormulaSheetPage } from '@/pages/FormulaSheet'
import { StudySchedulePage } from '@/pages/StudySchedule'
import { SelfStudyPage } from '@/pages/SelfStudy'

export default function App() {
  const { activePage, loadAllData, isLoading } = useAppStore()

  // Initialize DB configurations and trigger automatic silent sync on startup
  React.useEffect(() => {
    const initApp = async () => {
      // 1. Load local SQLite data immediately for instant app startup
      await loadAllData()

      // 2. Perform silent background Google Calendar sync if connected
      try {
        const status = await window.electronAPI.googleCalendar.getStatus()
        if (status && status.connected) {
          console.log('[Auto-Sync] Google Calendar is connected. Starting background sync...')
          const res = await window.electronAPI.googleCalendar.sync()
          if (res.success) {
            console.log('[Auto-Sync] Sync complete. Reloading data...')
            // 3. Re-load local SQLite data to reflect the changes in the UI automatically
            await loadAllData()
          } else {
            console.log('[Auto-Sync] Sync message:', res.message)
          }
        }
      } catch (err) {
        console.error('[Auto-Sync] Background sync failed:', err)
      }
    }

    initApp()
  }, [loadAllData])

  // Listen for background auto-sync signals from the main process
  React.useEffect(() => {
    if (window.electronAPI && window.electronAPI.on) {
      console.log('[Auto-Sync] Registering google:auto-synced IPC listener...')
      const unsubscribe = window.electronAPI.on('google:auto-synced', () => {
        console.log('[Auto-Sync] Received background sync signal. Reloading all UI data...')
        loadAllData()
      })
      return () => {
        if (unsubscribe) unsubscribe()
      }
    }
    return undefined
  }, [loadAllData])

  const renderActivePage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />
      case 'courses':
        return <Courses />
      case 'calendar':
        return <Calendar />
      case 'assignments':
        return <Assignments />
      case 'goals':
        return <Goals />
      case 'calculator':
        return <CalculatorPage />
      case 'converter':
        return <Converter />
      case 'youtube':
        return <YouTube />
      case 'wiki':
        return <Wiki />
      case 'ai':
        return <AI />
      case 'resources':
        return <Resources />
      case 'settings':
        return <Settings />
      case 'admin':
        return <Admin />
      case 'notebook':
        return <NotebookLM />
      case 'focus':
        return <Focus />
      case 'attendance':
        return <AttendancePage />
      case 'habits':
        return <HabitsPage />
      case 'research':
        return <ResearchPage />
      case 'formulas':
        return <FormulaSheetPage />
      case 'schedule':
        return <StudySchedulePage />
      case 'selfstudy':
        return <SelfStudyPage />
      default:
        return <Dashboard />
    }
  }

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-background flex flex-col items-center justify-center space-y-4" dir="rtl">
        <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <span className="text-sm font-bold text-muted-foreground">جاري تحميل خزانة ScholarOS...</span>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen flex bg-background overflow-hidden" dir="rtl">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main page view area */}
      <main className="flex-1 h-full overflow-hidden bg-background">
        {renderActivePage()}
      </main>
    </div>
  )
}
