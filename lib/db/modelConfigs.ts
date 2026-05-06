import type { SQLiteBindValue } from "expo-sqlite";

import { getDatabase } from "@/lib/db";
import { createId, getNowIsoString } from "@/lib/db/utils";
import type {
  CreateModelConfigInput,
  ModelConfig,
  UpdateModelConfigInput,
} from "@/types/config";
import type { ModelConfigType } from "@/types/common";

export async function createModelConfig(
  input: CreateModelConfigInput
): Promise<ModelConfig> {
  const database = await getDatabase();
  const now = getNowIsoString();
  const id = createId("config");

  await database.runAsync(
    `INSERT INTO model_configs (
      id,
      type,
      name,
      baseUrl,
      apiKeyRef,
      model,
      voice,
      speed,
      extraParams,
      createdAt,
      updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.type,
    input.name,
    input.baseUrl,
    input.apiKeyRef,
    input.model,
    input.voice ?? null,
    input.speed ?? null,
    input.extraParams ?? null,
    now,
    now
  );

  const config = await getModelConfigById(id);

  if (!config) {
    throw new Error("Failed to create model config.");
  }

  return config;
}

export async function getModelConfigById(
  id: string
): Promise<ModelConfig | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<ModelConfig>(
    "SELECT * FROM model_configs WHERE id = ? LIMIT 1",
    id
  );

  return row ?? null;
}

export async function listModelConfigs(
  type?: ModelConfigType
): Promise<ModelConfig[]> {
  const database = await getDatabase();

  if (type) {
    return database.getAllAsync<ModelConfig>(
      "SELECT * FROM model_configs WHERE type = ? ORDER BY updatedAt DESC, createdAt DESC",
      type
    );
  }

  return database.getAllAsync<ModelConfig>(
    "SELECT * FROM model_configs ORDER BY updatedAt DESC, createdAt DESC"
  );
}

export async function updateModelConfig(
  id: string,
  input: UpdateModelConfigInput
): Promise<ModelConfig> {
  const database = await getDatabase();
  const updates: Array<[string, unknown]> = [];

  if (input.name !== undefined) {
    updates.push(["name", input.name]);
  }
  if (input.baseUrl !== undefined) {
    updates.push(["baseUrl", input.baseUrl]);
  }
  if (input.apiKeyRef !== undefined) {
    updates.push(["apiKeyRef", input.apiKeyRef]);
  }
  if (input.model !== undefined) {
    updates.push(["model", input.model]);
  }
  if (input.voice !== undefined) {
    updates.push(["voice", input.voice]);
  }
  if (input.speed !== undefined) {
    updates.push(["speed", input.speed]);
  }
  if (input.extraParams !== undefined) {
    updates.push(["extraParams", input.extraParams]);
  }

  updates.push(["updatedAt", getNowIsoString()]);

  const setClause = updates.map(([key]) => `${key} = ?`).join(", ");
  const values = updates.map(([, value]) => value) as SQLiteBindValue[];

  await database.runAsync(
    `UPDATE model_configs SET ${setClause} WHERE id = ?`,
    ...values,
    id
  );

  const config = await getModelConfigById(id);

  if (!config) {
    throw new Error(`Model config not found: ${id}`);
  }

  return config;
}

export async function deleteModelConfig(id: string): Promise<void> {
  const database = await getDatabase();

  await database.runAsync("DELETE FROM model_configs WHERE id = ?", id);
}
