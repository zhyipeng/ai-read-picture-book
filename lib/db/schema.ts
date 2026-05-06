import type { AppSettings } from "@/types/settings";

export const APP_SETTINGS_ROW_ID = 1;

export const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultZhVisionConfigId: null,
  defaultEnVisionConfigId: null,
  defaultZhTtsConfigId: null,
  defaultEnTtsConfigId: null,
  playbackSpeed: 1,
  pauseBetweenPages: 0.5,
};

export const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    language TEXT NOT NULL CHECK(language IN ('zh', 'en')),
    coverPageId TEXT,
    pageCount INTEGER NOT NULL DEFAULT 0,
    currentPageIndex INTEGER NOT NULL DEFAULT 0,
    visionConfigId TEXT,
    ttsConfigId TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS pages (
    id TEXT PRIMARY KEY NOT NULL,
    bookId TEXT NOT NULL,
    pageIndex INTEGER NOT NULL,
    imagePath TEXT NOT NULL,
    originalText TEXT NOT NULL DEFAULT '',
    sceneDescription TEXT NOT NULL DEFAULT '',
    readAloudText TEXT NOT NULL DEFAULT '',
    audioPath TEXT,
    audioDuration REAL,
    textStatus TEXT NOT NULL DEFAULT 'idle' CHECK(textStatus IN ('idle', 'generating', 'done', 'error')),
    audioStatus TEXT NOT NULL DEFAULT 'idle' CHECK(audioStatus IN ('idle', 'generating', 'done', 'error')),
    lastError TEXT,
    hasManualEdit INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (bookId) REFERENCES books(id) ON DELETE CASCADE
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_pages_book_id_page_index
    ON pages(bookId, pageIndex);`,
  `CREATE TABLE IF NOT EXISTS model_configs (
    id TEXT PRIMARY KEY NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('vision', 'tts')),
    name TEXT NOT NULL,
    baseUrl TEXT NOT NULL,
    apiKeyRef TEXT NOT NULL,
    model TEXT NOT NULL,
    voice TEXT,
    speed REAL,
    extraParams TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY NOT NULL CHECK(id = 1),
    defaultZhVisionConfigId TEXT,
    defaultEnVisionConfigId TEXT,
    defaultZhTtsConfigId TEXT,
    defaultEnTtsConfigId TEXT,
    playbackSpeed REAL NOT NULL DEFAULT 1,
    pauseBetweenPages REAL NOT NULL DEFAULT 0.5
  );`,
];
