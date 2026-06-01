import { create } from 'zustand'

export interface Course {
  id: string
  name: string
  code: string
  teacher_name: string
  teacher_email: string
  color: string
  schedule: string // JSON string of timetable schedule
  syllabus: string // JSON string of list of topics
  notes: string
  created_at?: string
}

export interface Event {
  id: string
  title: string
  type: 'Exam' | 'Assignment' | 'Lecture' | 'Personal'
  start_date: string
  end_date: string
  course_id: string
  description: string
  color: string
  all_day: number
  created_at?: string
}

export interface Assignment {
  id: string
  title: string
  course_id: string
  due_date: string
  status: 'pending' | 'submitted' | 'graded'
  grade: string
  notes: string
  pdf_path: string
  kanban_column?: string
  kanban_order?: number
  created_at?: string
}

export interface Goal {
  id: string
  title: string
  target_gpa: number
  current_gpa: number
  deadline: string
  milestones: string // JSON string of milestone checklist
  status: 'active' | 'completed'
  created_at?: string
}

export interface Grade {
  id: string
  course_id: string
  semester: string
  grade_value: number
  credit_hours: number
  created_at?: string
}

export interface WikiPage {
  id: string
  title: string
  course_id: string
  content: string
  parent_id: string
  created_at?: string
  updated_at?: string
}

export interface Resource {
  id: string
  title: string
  url: string
  category: string
  tags: string // JSON string array or comma separated
  course_id: string
  notes: string
  rating: number
  is_favorite: number
  created_at?: string
}

export interface MindMap {
  id: string
  title: string
  markdown_content: string
  svg_content: string
  course_id: string
  created_at?: string
}

export interface ChatSession {
  id: string
  title: string
  provider: string
  model: string
  messages: string // JSON string array of ChatCompletionMessageParam
  created_at?: string
  updated_at?: string
}

export interface Lecturer {
  id: string
  name: string
  email: string
  office: string
  department: string
  created_at?: string
}

export interface StudentProfile {
  id: string
  name: string
  university: string
  major: string
  semester: string
}

interface UserProfile {
  name: string
  university: string
  major: string
  semester: string
}

interface AppState {
  courses: Course[]
  events: Event[]
  assignments: Assignment[]
  goals: Goal[]
  grades: Grade[]
  wikiPages: WikiPage[]
  resources: Resource[]
  mindMaps: MindMap[]
  chatSessions: ChatSession[]
  flashcards: any[]
  calcHistory: any[]
  activePage: string
  theme: 'light' | 'dark' | 'system'
  profile: UserProfile
  isLoading: boolean
  lecturers: Lecturer[]
  profiles: StudentProfile[]
  activeProfileId: string

  // Actions
  setActivePage: (page: string) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setProfile: (profile: UserProfile) => void
  loadAllData: () => Promise<void>
  
  // Lecturer actions
  saveLecturer: (lecturer: Lecturer) => Promise<void>
  deleteLecturer: (id: string) => Promise<void>

  // Profile actions
  saveProfile: (profile: StudentProfile) => Promise<void>
  deleteProfile: (id: string) => Promise<void>
  switchProfile: (id: string) => Promise<void>
  
  // Course actions
  saveCourse: (course: Course) => Promise<void>
  deleteCourse: (id: string) => Promise<void>

  // Event actions
  loadEventsRange: (start: string, end: string) => Promise<void>
  saveEvent: (event: Event) => Promise<void>
  deleteEvent: (id: string) => Promise<void>
  importICS: (fileContent: string) => Promise<number>

  // Assignment actions
  saveAssignment: (assignment: Assignment) => Promise<void>
  deleteAssignment: (id: string) => Promise<void>

  // Goal actions
  saveGoal: (goal: Goal) => Promise<void>
  deleteGoal: (id: string) => Promise<void>

  // Grade actions
  saveGrade: (grade: Grade) => Promise<void>
  deleteGrade: (id: string) => Promise<void>

  // Wiki actions
  saveWikiPage: (page: WikiPage) => Promise<void>
  deleteWikiPage: (id: string) => Promise<void>

  // Flashcard actions
  saveFlashcard: (card: any) => Promise<void>
  deleteFlashcard: (id: string) => Promise<void>

  // Resource actions
  saveResource: (res: Resource) => Promise<void>
  deleteResource: (id: string) => Promise<void>

  // Mind map actions
  saveMindMap: (map: MindMap) => Promise<void>
  deleteMindMap: (id: string) => Promise<void>

  // Chat actions
  saveChatSession: (session: ChatSession) => Promise<void>
  deleteChatSession: (id: string) => Promise<void>

  // Calculator actions
  loadCalcHistory: () => Promise<void>
  addCalcHistory: (expression: string, result: string) => Promise<void>
  clearCalcHistory: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  courses: [],
  events: [],
  assignments: [],
  goals: [],
  grades: [],
  wikiPages: [],
  resources: [],
  mindMaps: [],
  chatSessions: [],
  flashcards: [],
  calcHistory: [],
  activePage: 'dashboard',
  theme: 'light',
  profile: { name: 'طالب جامعي', university: 'جامعة الملك سعود', major: 'علوم الحاسب', semester: 'الفصل الأول' },
  isLoading: false,
  lecturers: [],
  profiles: [],
  activeProfileId: '',

  setActivePage: (page) => set({ activePage: page }),

  setTheme: async (theme) => {
    set({ theme })
    await window.electronAPI.settings.set('theme', theme)
    // Apply styling class
    applyThemeClass(theme)
  },

  setProfile: async (profile) => {
    set({ profile })
    await window.electronAPI.settings.set('profile', profile)

    // Sync changes into the active profile inside the profiles list to prevent reverting on reloads
    const activeId = get().activeProfileId
    const currentProfiles = get().profiles
    if (activeId && currentProfiles.length > 0) {
      const updatedProfiles = currentProfiles.map(p => 
        p.id === activeId 
          ? { id: activeId, ...profile } 
          : p
      )
      set({ profiles: updatedProfiles })
      await window.electronAPI.settings.set('profiles', updatedProfiles)
    }
  },

  loadAllData: async () => {
    set({ isLoading: true })
    try {
      // Load user configurations
      const savedTheme = await window.electronAPI.settings.get('theme') || 'light'
      let savedProfiles = await window.electronAPI.settings.get('profiles') as StudentProfile[]
      let activeProfileId = await window.electronAPI.settings.get('activeProfileId') as string
      
      set({ theme: savedTheme })
      applyThemeClass(savedTheme)

      if (!savedProfiles || savedProfiles.length === 0) {
        const defaultProfile: StudentProfile = {
          id: 'default-profile-1',
          name: 'طالب جامعي',
          university: 'جامعة الملك سعود',
          major: 'علوم الحاسب',
          semester: 'الفصل الأول'
        }
        savedProfiles = [defaultProfile]
        activeProfileId = 'default-profile-1'
        await window.electronAPI.settings.set('profiles', savedProfiles)
        await window.electronAPI.settings.set('activeProfileId', activeProfileId)
      }

      const activeProf = savedProfiles.find(p => p.id === activeProfileId) || savedProfiles[0]
      set({
        profiles: savedProfiles,
        activeProfileId: activeProf.id,
        profile: {
          name: activeProf.name,
          university: activeProf.university,
          major: activeProf.major,
          semester: activeProf.semester
        }
      })

      // Query database
      const courses = await window.electronAPI.db.courses.getAll()
      const assignments = await window.electronAPI.db.assignments.getAll()
      const goals = await window.electronAPI.db.goals.getAll()
      const grades = await window.electronAPI.db.grades.getAll()
      const wikiPages = await window.electronAPI.db.wiki.getPages()
      const resources = await window.electronAPI.db.resources.getAll()
      const mindMaps = await window.electronAPI.db.mindMaps.getAll()
      const chatSessions = await window.electronAPI.db.chat.getSessions()
      const flashcards = await window.electronAPI.db.flashcards.getAll()
      const lecturers = await window.electronAPI.db.lecturers.getAll()

      // Default events loaded for calendar start (current month)
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString()
      const end = new Date(now.getFullYear(), now.getMonth() + 2, 28).toISOString()
      const events = await window.electronAPI.db.events.getRange({ start, end })

      set({
        courses,
        assignments,
        goals,
        grades,
        wikiPages,
        resources,
        mindMaps,
        chatSessions,
        flashcards,
        events,
        lecturers,
        isLoading: false
      })
      await get().loadCalcHistory()
    } catch (err) {
      console.error('Failed to load local DB data', err)
      set({ isLoading: false })
    }
  },

  // Courses
  saveCourse: async (course) => {
    await window.electronAPI.db.courses.save(course)
    const courses = await window.electronAPI.db.courses.getAll()
    set({ courses })
  },
  deleteCourse: async (id) => {
    await window.electronAPI.db.courses.delete(id)
    const courses = await window.electronAPI.db.courses.getAll()
    set({ courses })
  },

  // Events
  loadEventsRange: async (start, end) => {
    const events = await window.electronAPI.db.events.getRange({ start, end })
    set({ events })
  },
  saveEvent: async (event) => {
    await window.electronAPI.db.events.save(event)
    // Refresh for current active monthly buffer
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString()
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 28).toISOString()
    let events = await window.electronAPI.db.events.getRange({ start, end })
    set({ events })

    // Auto-Sync background execution
    try {
      const status = await window.electronAPI.googleCalendar.getStatus()
      if (status && status.connected) {
        console.log('[Auto-Sync] Event saved. Running background sync...')
        const res = await window.electronAPI.googleCalendar.sync()
        if (res.success) {
          console.log('[Auto-Sync] Sync complete. Reloading events...')
          events = await window.electronAPI.db.events.getRange({ start, end })
          set({ events })
        }
      }
    } catch (err) {
      console.error('[Auto-Sync] Background sync failed:', err)
    }
  },
  deleteEvent: async (id) => {
    await window.electronAPI.db.events.delete(id)
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString()
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 28).toISOString()
    let events = await window.electronAPI.db.events.getRange({ start, end })
    set({ events })

    // Auto-Sync background execution
    try {
      const status = await window.electronAPI.googleCalendar.getStatus()
      if (status && status.connected) {
        console.log('[Auto-Sync] Event deleted. Running background sync...')
        const res = await window.electronAPI.googleCalendar.sync()
        if (res.success) {
          console.log('[Auto-Sync] Sync complete. Reloading events...')
          events = await window.electronAPI.db.events.getRange({ start, end })
          set({ events })
        }
      }
    } catch (err) {
      console.error('[Auto-Sync] Background sync failed:', err)
    }
  },
  importICS: async (fileContent) => {
    const count = await window.electronAPI.db.events.importICS(fileContent)
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString()
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 28).toISOString()
    const events = await window.electronAPI.db.events.getRange({ start, end })
    set({ events })
    return count
  },

  // Assignments
  saveAssignment: async (assignment) => {
    await window.electronAPI.db.assignments.save(assignment)
    const assignments = await window.electronAPI.db.assignments.getAll()
    set({ assignments })
  },
  deleteAssignment: async (id) => {
    await window.electronAPI.db.assignments.delete(id)
    const assignments = await window.electronAPI.db.assignments.getAll()
    set({ assignments })
  },

  // Goals
  saveGoal: async (goal) => {
    await window.electronAPI.db.goals.save(goal)
    const goals = await window.electronAPI.db.goals.getAll()
    set({ goals })
  },
  deleteGoal: async (id) => {
    await window.electronAPI.db.goals.delete(id)
    const goals = await window.electronAPI.db.goals.getAll()
    set({ goals })
  },

  // Grades
  saveGrade: async (grade) => {
    await window.electronAPI.db.grades.save(grade)
    const grades = await window.electronAPI.db.grades.getAll()
    set({ grades })
  },
  deleteGrade: async (id) => {
    await window.electronAPI.db.grades.delete(id)
    const grades = await window.electronAPI.db.grades.getAll()
    set({ grades })
  },

  // Wiki Pages
  saveWikiPage: async (page) => {
    await window.electronAPI.db.wiki.savePage(page)
    const wikiPages = await window.electronAPI.db.wiki.getPages()
    set({ wikiPages })
  },
  deleteWikiPage: async (id) => {
    await window.electronAPI.db.wiki.deletePage(id)
    const wikiPages = await window.electronAPI.db.wiki.getPages()
    set({ wikiPages })
  },

  // Resources
  saveResource: async (res) => {
    await window.electronAPI.db.resources.save(res)
    const resources = await window.electronAPI.db.resources.getAll()
    set({ resources })
  },
  deleteResource: async (id) => {
    await window.electronAPI.db.resources.delete(id)
    const resources = await window.electronAPI.db.resources.getAll()
    set({ resources })
  },

  // Mind Maps
  saveMindMap: async (map) => {
    await window.electronAPI.db.mindMaps.save(map)
    const mindMaps = await window.electronAPI.db.mindMaps.getAll()
    set({ mindMaps })
  },
  deleteMindMap: async (id) => {
    await window.electronAPI.db.mindMaps.delete(id)
    const mindMaps = await window.electronAPI.db.mindMaps.getAll()
    set({ mindMaps })
  },

  // Chat Sessions
  saveChatSession: async (session) => {
    await window.electronAPI.db.chat.saveSession(session)
    const chatSessions = await window.electronAPI.db.chat.getSessions()
    set({ chatSessions })
  },
  deleteChatSession: async (id) => {
    await window.electronAPI.db.chat.deleteSession(id)
    const chatSessions = await window.electronAPI.db.chat.getSessions()
    set({ chatSessions })
  },

  // Flashcards
  saveFlashcard: async (card) => {
    await window.electronAPI.db.flashcards.save(card)
    const flashcards = await window.electronAPI.db.flashcards.getAll()
    set({ flashcards })
  },
  deleteFlashcard: async (id) => {
    await window.electronAPI.db.flashcards.delete(id)
    const flashcards = await window.electronAPI.db.flashcards.getAll()
    set({ flashcards })
  },

  // Lecturers
  saveLecturer: async (lecturer) => {
    await window.electronAPI.db.lecturers.save(lecturer)
    const lecturers = await window.electronAPI.db.lecturers.getAll()
    set({ lecturers })
  },
  deleteLecturer: async (id) => {
    await window.electronAPI.db.lecturers.delete(id)
    const lecturers = await window.electronAPI.db.lecturers.getAll()
    set({ lecturers })
  },

  // Profiles Management
  saveProfile: async (profileToSave) => {
    const currentProfiles = get().profiles
    let updated: StudentProfile[]
    const exists = currentProfiles.find(p => p.id === profileToSave.id)
    if (exists) {
      updated = currentProfiles.map(p => p.id === profileToSave.id ? profileToSave : p)
    } else {
      updated = [...currentProfiles, profileToSave]
    }
    set({ profiles: updated })
    await window.electronAPI.settings.set('profiles', updated)

    if (profileToSave.id === get().activeProfileId) {
      set({
        profile: {
          name: profileToSave.name,
          university: profileToSave.university,
          major: profileToSave.major,
          semester: profileToSave.semester
        }
      })
    }
  },
  deleteProfile: async (id) => {
    const currentProfiles = get().profiles
    if (currentProfiles.length <= 1) return
    
    const updated = currentProfiles.filter(p => p.id !== id)
    set({ profiles: updated })
    await window.electronAPI.settings.set('profiles', updated)

    if (id === get().activeProfileId) {
      await get().switchProfile(updated[0].id)
    }
  },
  switchProfile: async (id) => {
    const currentProfiles = get().profiles
    const target = currentProfiles.find(p => p.id === id)
    if (!target) return

    set({ activeProfileId: id })
    await window.electronAPI.settings.set('activeProfileId', id)

    set({
      profile: {
        name: target.name,
        university: target.university,
        major: target.major,
        semester: target.semester
      }
    })
    
    await window.electronAPI.settings.set('profile', {
      name: target.name,
      university: target.university,
      major: target.major,
      semester: target.semester
    })
  },

  // Calculator
  loadCalcHistory: async () => {
    const calcHistory = await window.electronAPI.db.calculator.getHistory()
    set({ calcHistory })
  },
  addCalcHistory: async (expression, result) => {
    await window.electronAPI.db.calculator.addHistory(expression, result)
    await get().loadCalcHistory()
  },
  clearCalcHistory: async () => {
    await window.electronAPI.db.calculator.clearHistory()
    set({ calcHistory: [] })
  }
}))

function applyThemeClass(theme: 'light' | 'dark' | 'system') {
  const root = window.document.documentElement
  root.classList.remove('light', 'dark')

  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    root.classList.add(systemTheme)
  } else {
    root.classList.add(theme)
  }
}
