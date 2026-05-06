import * as SQLite from "expo-sqlite";

import {
  APP_SETTINGS_ROW_ID,
  DEFAULT_APP_SETTINGS,
  SCHEMA_STATEMENTS,
} from "@/lib/db/schema";

const DATABASE_NAME = "huiben.db";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let initializationPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }

  return databasePromise;
}

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      const database = await openDatabase();

      await database.execAsync("PRAGMA foreign_keys = ON;");

      for (const statement of SCHEMA_STATEMENTS) {
        await database.execAsync(statement);
      }

      await database.runAsync(
        `INSERT OR IGNORE INTO app_settings (
          id,
          defaultZhVisionConfigId,
          defaultEnVisionConfigId,
          defaultZhTtsConfigId,
          defaultEnTtsConfigId,
          playbackSpeed,
          pauseBetweenPages
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        APP_SETTINGS_ROW_ID,
        DEFAULT_APP_SETTINGS.defaultZhVisionConfigId,
        DEFAULT_APP_SETTINGS.defaultEnVisionConfigId,
        DEFAULT_APP_SETTINGS.defaultZhTtsConfigId,
        DEFAULT_APP_SETTINGS.defaultEnTtsConfigId,
        DEFAULT_APP_SETTINGS.playbackSpeed,
        DEFAULT_APP_SETTINGS.pauseBetweenPages
      );

      return database;
    })().catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }

  return initializationPromise;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  return initDatabase();
}

export const db = {
  getDatabase,
};
