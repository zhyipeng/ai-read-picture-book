import type { SQLiteBindValue } from "expo-sqlite";

import { getDatabase } from "@/lib/db";
import {
  APP_SETTINGS_ROW_ID,
  DEFAULT_APP_SETTINGS,
} from "@/lib/db/schema";
import type { AppSettings, UpdateAppSettingsInput } from "@/types/settings";

type AppSettingsRow = AppSettings & {
  id: number;
};

function mapSettingsRow(row: AppSettingsRow): AppSettings {
  const { id: _id, ...settings } = row;

  return settings;
}

export async function getAppSettings(): Promise<AppSettings> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<AppSettingsRow>(
    "SELECT * FROM app_settings WHERE id = ? LIMIT 1",
    APP_SETTINGS_ROW_ID
  );

  if (!row) {
    throw new Error("App settings row is missing.");
  }

  return mapSettingsRow(row);
}

export async function updateAppSettings(
  input: UpdateAppSettingsInput
): Promise<AppSettings> {
  const database = await getDatabase();
  const updates: Array<[string, unknown]> = [];

  if (input.defaultZhVisionConfigId !== undefined) {
    updates.push(["defaultZhVisionConfigId", input.defaultZhVisionConfigId]);
  }
  if (input.defaultEnVisionConfigId !== undefined) {
    updates.push(["defaultEnVisionConfigId", input.defaultEnVisionConfigId]);
  }
  if (input.defaultZhTtsConfigId !== undefined) {
    updates.push(["defaultZhTtsConfigId", input.defaultZhTtsConfigId]);
  }
  if (input.defaultEnTtsConfigId !== undefined) {
    updates.push(["defaultEnTtsConfigId", input.defaultEnTtsConfigId]);
  }
  if (input.playbackSpeed !== undefined) {
    updates.push(["playbackSpeed", input.playbackSpeed]);
  }
  if (input.pauseBetweenPages !== undefined) {
    updates.push(["pauseBetweenPages", input.pauseBetweenPages]);
  }

  if (updates.length === 0) {
    return getAppSettings();
  }

  const setClause = updates.map(([key]) => `${key} = ?`).join(", ");
  const values = updates.map(([, value]) => value) as SQLiteBindValue[];

  await database.runAsync(
    `UPDATE app_settings SET ${setClause} WHERE id = ?`,
    ...values,
    APP_SETTINGS_ROW_ID
  );

  return getAppSettings();
}

export async function resetAppSettingsToDefault(): Promise<AppSettings> {
  return updateAppSettings(DEFAULT_APP_SETTINGS);
}
