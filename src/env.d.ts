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
  };
}
