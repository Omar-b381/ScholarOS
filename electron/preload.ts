import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  db: {
    courses: {
      getAll: () => ipcRenderer.invoke('db:courses:getAll'),
      save: (course: any) => ipcRenderer.invoke('db:courses:save', course),
      delete: (id: string) => ipcRenderer.invoke('db:courses:delete', id)
    },
    events: {
      getRange: (args: { start: string; end: string }) => ipcRenderer.invoke('db:events:getRange', args),
      save: (event: any) => ipcRenderer.invoke('db:events:save', event),
      delete: (id: string) => ipcRenderer.invoke('db:events:delete', id),
      importICS: (fileContent: string) => ipcRenderer.invoke('db:events:importICS', fileContent)
    },
    assignments: {
      getAll: () => ipcRenderer.invoke('db:assignments:getAll'),
      save: (assignment: any) => ipcRenderer.invoke('db:assignments:save', assignment),
      delete: (id: string) => ipcRenderer.invoke('db:assignments:delete', id)
    },
    goals: {
      getAll: () => ipcRenderer.invoke('db:goals:getAll'),
      save: (goal: any) => ipcRenderer.invoke('db:goals:save', goal),
      delete: (id: string) => ipcRenderer.invoke('db:goals:delete', id)
    },
    grades: {
      getAll: () => ipcRenderer.invoke('db:grades:getAll'),
      save: (grade: any) => ipcRenderer.invoke('db:grades:save', grade),
      delete: (id: string) => ipcRenderer.invoke('db:grades:delete', id)
    },
    wiki: {
      getPages: () => ipcRenderer.invoke('db:wiki:getPages'),
      savePage: (page: any) => ipcRenderer.invoke('db:wiki:savePage', page),
      deletePage: (id: string) => ipcRenderer.invoke('db:wiki:deletePage', id)
    },
    flashcards: {
      getAll: () => ipcRenderer.invoke('db:flashcards:getAll'),
      save: (card: any) => ipcRenderer.invoke('db:flashcards:save', card),
      delete: (id: string) => ipcRenderer.invoke('db:flashcards:delete', id),
      getDue: (now: string) => ipcRenderer.invoke('db:flashcards:getDue', now)
    },
    resources: {
      getAll: () => ipcRenderer.invoke('db:resources:getAll'),
      save: (resource: any) => ipcRenderer.invoke('db:resources:save', resource),
      delete: (id: string) => ipcRenderer.invoke('db:resources:delete', id)
    },
    mindMaps: {
      getAll: () => ipcRenderer.invoke('db:mindMaps:getAll'),
      save: (map: any) => ipcRenderer.invoke('db:mindMaps:save', map),
      delete: (id: string) => ipcRenderer.invoke('db:mindMaps:delete', id)
    },
    chat: {
      getSessions: () => ipcRenderer.invoke('db:chat:getSessions'),
      saveSession: (session: any) => ipcRenderer.invoke('db:chat:saveSession', session),
      deleteSession: (id: string) => ipcRenderer.invoke('db:chat:deleteSession', id)
    },
    calculator: {
      getHistory: () => ipcRenderer.invoke('db:calculator:getHistory'),
      addHistory: (expression: string, result: string) => ipcRenderer.invoke('db:calculator:addHistory', { expression, result }),
      clearHistory: () => ipcRenderer.invoke('db:calculator:clearHistory')
    },
    notifications: {
      getLogs: () => ipcRenderer.invoke('db:notifications:getLogs'),
      clearLogs: () => ipcRenderer.invoke('db:notifications:clearLogs')
    },
    lecturers: {
      getAll: () => ipcRenderer.invoke('db:lecturers:getAll'),
      save: (lecturer: any) => ipcRenderer.invoke('db:lecturers:save', lecturer),
      delete: (id: string) => ipcRenderer.invoke('db:lecturers:delete', id)
    },
    getStats: () => ipcRenderer.invoke('db:getStats')
  },
  // File operations
  files: {
    uploadPDF: (args: { sourcePath: string; destName: string }) => ipcRenderer.invoke('files:uploadPDF', args),
    listPDFs: () => ipcRenderer.invoke('files:listPDFs'),
    openPDF: (filePath: string) => ipcRenderer.invoke('files:openPDF', filePath),
    readPDFBase64: (filePath: string) => ipcRenderer.invoke('files:readPDFBase64', filePath),
    convertImagesToPDF: (imagesPaths: string[]) => ipcRenderer.invoke('files:convertImagesToPDF', imagesPaths),
    mergePDFs: (pdfPaths: string[]) => ipcRenderer.invoke('files:mergePDFs', pdfPaths),
    splitPDF: (args: { pdfPath: string; ranges: string }) => ipcRenderer.invoke('files:splitPDF', args),
    exportPDF: (args: { htmlContent: string; filename: string }) => ipcRenderer.invoke('files:exportPDF', args),
    convertImage: (args: { imagePath: string; format: string; width?: number; quality?: number }) => ipcRenderer.invoke('files:convertImage', args),
    parseBookmarks: (filePath: string) => ipcRenderer.invoke('files:parseBookmarks', filePath)
  },
  // Settings & keys operations
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('settings:set', { key, value }),
    delete: (key: string) => ipcRenderer.invoke('settings:delete', key),
    backup: () => ipcRenderer.invoke('settings:backup'),
    restore: (jsonData: string) => ipcRenderer.invoke('settings:restore', jsonData),
    clearAllData: () => ipcRenderer.invoke('settings:clearAllData')
  },
  // App operations
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url),
    selectFile: (options: any) => ipcRenderer.invoke('app:selectFile', options)
  },
  // AI Operations
  ai: {
    chat: (args: { provider: string; model: string; systemPrompt: string; messages: any[]; files?: { data: string; mimeType: string }[] }) => ipcRenderer.invoke('ai:chat', args)
  },
  // Notion Operations
  notion: {
    syncEvents: () => ipcRenderer.invoke('notion:syncEvents')
  },
  // Google Calendar Operations
  googleCalendar: {
    login: () => ipcRenderer.invoke('google:login'),
    logout: () => ipcRenderer.invoke('google:logout'),
    getStatus: () => ipcRenderer.invoke('google:getStatus'),
    sync: () => ipcRenderer.invoke('google:sync')
  },
  // Spaced repetition flashcards (FSRS)
  db_flashcards_review: (id: string, rating: number) =>
    ipcRenderer.invoke('db:flashcards:review', { id, rating }),
  db_flashcards_getDue: () => ipcRenderer.invoke('db:flashcards:getDue'),
  db_flashcards_getStats: () => ipcRenderer.invoke('db:flashcards:getStats'),
  // Assignments Kanban Reordering
  db_assignments_reorder: (items: { id: string; column: string; order: number }[]) =>
    ipcRenderer.invoke('db:assignments:reorder', items),
  // Academic citations (citation-js)
  citation_format: (input: any, format: string) =>
    ipcRenderer.invoke('citation:format', input, format),
  citation_fetchDOI: (doi: string) =>
    ipcRenderer.invoke('citation:fetchDOI', doi),
  citation_parseBib: (content: string) =>
    ipcRenderer.invoke('citation:parseBib', content),
  citation_importBibFile: () =>
    ipcRenderer.invoke('citation:importBibFile'),
  // Subscribing to main process events
  on: (channel: string, callback: (...args: any[]) => void) => {
    // Exclude channels not prefixed with app logic if needed, but allow simple registration
    const validChannels = ['notification:received', 'google:auto-synced']
    if (validChannels.includes(channel)) {
      const subscription = (_event: any, ...args: any[]) => callback(...args)
      ipcRenderer.on(channel, subscription)
      return () => ipcRenderer.removeListener(channel, subscription)
    }
    return undefined
  }
})
