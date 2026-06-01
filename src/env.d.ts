/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    // DB operations
    db: {
      courses: {
        getAll: () => Promise<any[]>;
        save: (course: any) => Promise<void>;
        delete: (id: string) => Promise<void>;
      };
      events: {
        getRange: (args: { start: string; end: string }) => Promise<any[]>;
        save: (event: any) => Promise<void>;
        delete: (id: string) => Promise<void>;
        importICS: (fileContent: string) => Promise<number>;
      };
      assignments: {
        getAll: () => Promise<any[]>;
        save: (assignment: any) => Promise<void>;
        delete: (id: string) => Promise<void>;
      };
      goals: {
        getAll: () => Promise<any[]>;
        save: (goal: any) => Promise<void>;
        delete: (id: string) => Promise<void>;
      };
      grades: {
        getAll: () => Promise<any[]>;
        save: (grade: any) => Promise<void>;
        delete: (id: string) => Promise<void>;
      };
      wiki: {
        getPages: () => Promise<any[]>;
        savePage: (page: any) => Promise<void>;
        deletePage: (id: string) => Promise<void>;
      };
      flashcards: {
        getAll: () => Promise<any[]>;
        save: (card: any) => Promise<void>;
        delete: (id: string) => Promise<void>;
        getDue: (now: string) => Promise<any[]>;
      };
      resources: {
        getAll: () => Promise<any[]>;
        save: (resource: any) => Promise<void>;
        delete: (id: string) => Promise<void>;
      };
      mindMaps: {
        getAll: () => Promise<any[]>;
        save: (map: any) => Promise<void>;
        delete: (id: string) => Promise<void>;
      };
      chat: {
        getSessions: () => Promise<any[]>;
        saveSession: (session: any) => Promise<void>;
        deleteSession: (id: string) => Promise<void>;
      };
      calculator: {
        getHistory: () => Promise<any[]>;
        addHistory: (expression: string, result: string) => Promise<void>;
        clearHistory: () => Promise<void>;
      };
      notifications: {
        getLogs: () => Promise<any[]>;
        clearLogs: () => Promise<void>;
      };
      lecturers: {
        getAll: () => Promise<any[]>;
        save: (lecturer: any) => Promise<void>;
        delete: (id: string) => Promise<void>;
      };
      getStats: () => Promise<Record<string, number>>;
    };
    // File operations
    files: {
      uploadPDF: (args: { sourcePath: string; destName: string }) => Promise<{ success: boolean; path: string; name: string }>;
      listPDFs: () => Promise<any[]>;
      openPDF: (filePath: string) => Promise<boolean>;
      readPDFBase64: (filePath: string) => Promise<string>;
      convertImagesToPDF: (imagesPaths: string[]) => Promise<{ success: boolean; filePath: string }>;
      mergePDFs: (pdfPaths: string[]) => Promise<{ success: boolean; filePath: string }>;
      splitPDF: (args: { pdfPath: string; ranges: string }) => Promise<{ success: boolean; files: string[] }>;
      exportPDF: (args: { htmlContent: string; filename: string }) => Promise<{ success: boolean; filePath: string }>;
      convertImage: (args: { imagePath: string; format: string; width?: number; quality?: number }) => Promise<{ success: boolean; filePath: string }>;
      parseBookmarks: (filePath: string) => Promise<any[]>;
    };
    // Settings & Keys
    settings: {
      get: (key: string) => Promise<any>;
      set: (key: string, value: any) => Promise<void>;
      delete: (key: string) => Promise<void>;
      backup: () => Promise<{ success: boolean; data: string }>;
      restore: (jsonData: string) => Promise<{ success: boolean }>;
      clearAllData: () => Promise<{ success: boolean }>;
    };
    // App operations
    app: {
      getVersion: () => Promise<string>;
      openExternal: (url: string) => Promise<void>;
      selectFile: (options: any) => Promise<string[] | null>;
    };
    // AI operation
    ai: {
      chat: (args: { provider: string; model: string; systemPrompt: string; messages: any[]; files?: { data: string; mimeType: string }[] }) => Promise<string>;
    };
    notion: {
      syncEvents: () => Promise<{ success: boolean; count: number; message: string }>;
    };
    googleCalendar: {
      login: () => Promise<{ success: boolean; email?: string; message: string }>;
      logout: () => Promise<void>;
      getStatus: () => Promise<{ connected: boolean; email?: string; name?: string; picture?: string }>;
      sync: () => Promise<{ success: boolean; count: number; message: string }>;
    };
    // Notification listener
    on: (channel: string, callback: (...args: any[]) => void) => (() => void) | undefined;
    // Spaced repetition flashcards (FSRS)
    db_flashcards_review: (id: string, rating: number) => Promise<{ nextReviewIn: number; due: string }>;
    db_flashcards_getDue: () => Promise<any[]>;
    db_flashcards_getStats: () => Promise<{ total: number; due: number; new: number; review: number }>;
    // Assignments Kanban Reordering
    db_assignments_reorder: (items: { id: string; column: string; order: number }[]) => Promise<{ ok: boolean }>;
    // Academic citations (citation-js)
    citation_format: (input: any, format: string) => Promise<string>;
    citation_fetchDOI: (doi: string) => Promise<any>;
    citation_parseBib: (content: string) => Promise<any[]>;
    citation_importBibFile: () => Promise<any[]>;

    // Attendance
    attendance_getAll: (courseId?: string) => Promise<any[]>;
    attendance_save: (record: any) => Promise<any>;
    attendance_getStats: (courseId: string) => Promise<{ total: number; present: number; absent: number; excused: number; percentage: number; warning: boolean }>;

    // Habits
    habits_getAll: () => Promise<any[]>;
    habits_save: (habit: any) => Promise<any>;
    habits_delete: (id: string) => Promise<{ ok: boolean }>;
    habits_log: (habitId: string, date: string, completed: boolean) => Promise<{ ok: boolean }>;
    habits_getHeatmap: (habitId: string, days: number) => Promise<any[]>;

    // Research Papers
    research_searchPapers: (query: string) => Promise<{ papers: any[]; error: string | null }>;
    research_fetchByDOI: (doi: string) => Promise<{ error: string | null; data: any }>;
    research_searchBooks: (query: string) => Promise<{ books: any[]; error: string | null }>;
    research_saveBook: (book: any) => Promise<{ ok: boolean; id: string }>;
    research_getSavedBooks: () => Promise<any[]>;

    // Formula Sheets
    formulas_getAll: () => Promise<any[]>;
    formulas_save: (sheet: any) => Promise<any>;
    formulas_delete: (id: string) => Promise<{ ok: boolean }>;
    formulas_exportPDF: (id: string) => Promise<string>;

    // Focus Sessions
    focus_start: (duration: number, breakMin: number) => Promise<{ id: string }>;
    focus_complete: (id: string) => Promise<{ ok: boolean }>;
    focus_getHistory: () => Promise<any[]>;
    focus_getStats: () => Promise<{ totalSessions: number; totalMinutes: number; todayMinutes: number }>;

    // Grade Predictor
    grades_getInputs: (courseId: string) => Promise<any[]>;
    grades_saveInput: (input: any) => Promise<{ ok: boolean; id: string }>;
    grades_deleteInput: (id: string) => Promise<{ ok: boolean }>;

    // Study Schedule Generator
    schedule_generate: (payload: any) => Promise<{ schedule: any; error: string | null }>;
    schedule_getAll: () => Promise<any[]>;
    schedule_delete: (id: string) => Promise<{ ok: boolean }>;

    // SyncGuard Background Sync Service
    syncGuard: {
      getStatus: () => Promise<any>;
      getLogs: () => Promise<any[]>;
      getGradeConflicts: () => Promise<any[]>;
      triggerSync: () => Promise<any>;
      setSettings: (settings: any) => Promise<any>;
      simulateAction: (args: { action: string; data?: any }) => Promise<any>;
      testConnection: (args: { url: string; anonKey: string }) => Promise<{ success: boolean; error?: string }>;
    };

    // Academic Levels & Transitions
    levels_getAll: () => Promise<any[]>;
    levels_getActive: () => Promise<any>;
    levels_save: (level: any) => Promise<void>;
    levels_delete: (id: string) => Promise<void>;
    levels_transition: (name: string) => Promise<{ success: boolean; newLevelId: string }>;
  };
}
