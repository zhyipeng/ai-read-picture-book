import type { SQLiteBindValue } from "expo-sqlite";

import { getDatabase } from "@/lib/db";
import {
  createId,
  fromSqliteBoolean,
  getNowIsoString,
  toSqliteBoolean,
} from "@/lib/db/utils";
import type { CreatePageInput, Page, UpdatePageInput } from "@/types/page";

type PageRow = Omit<Page, "hasManualEdit"> & {
  hasManualEdit: number;
};

function mapPageRow(row: PageRow): Page {
  return {
    ...row,
    hasManualEdit: fromSqliteBoolean(row.hasManualEdit),
  };
}

export async function createPage(input: CreatePageInput): Promise<Page> {
  const database = await getDatabase();
  const now = getNowIsoString();
  const id = createId("page");

  await database.runAsync(
    `INSERT INTO pages (
      id,
      bookId,
      pageIndex,
      imagePath,
      originalText,
      sceneDescription,
      readAloudText,
      audioPath,
      audioDuration,
      textStatus,
      audioStatus,
      lastError,
      hasManualEdit,
      createdAt,
      updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.bookId,
    input.pageIndex,
    input.imagePath,
    input.originalText ?? "",
    input.sceneDescription ?? "",
    input.readAloudText ?? "",
    input.audioPath ?? null,
    input.audioDuration ?? null,
    input.textStatus ?? "idle",
    input.audioStatus ?? "idle",
    input.lastError ?? null,
    toSqliteBoolean(input.hasManualEdit ?? false),
    now,
    now
  );

  const page = await getPageById(id);

  if (!page) {
    throw new Error("Failed to create page.");
  }

  return page;
}

export async function createPages(inputs: CreatePageInput[]): Promise<Page[]> {
  const database = await getDatabase();
  const createdIds: string[] = [];

  await database.withTransactionAsync(async () => {
    for (const input of inputs) {
      const now = getNowIsoString();
      const id = createId("page");

      createdIds.push(id);

      await database.runAsync(
        `INSERT INTO pages (
          id,
          bookId,
          pageIndex,
          imagePath,
          originalText,
          sceneDescription,
          readAloudText,
          audioPath,
          audioDuration,
          textStatus,
          audioStatus,
          lastError,
          hasManualEdit,
          createdAt,
          updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        input.bookId,
        input.pageIndex,
        input.imagePath,
        input.originalText ?? "",
        input.sceneDescription ?? "",
        input.readAloudText ?? "",
        input.audioPath ?? null,
        input.audioDuration ?? null,
        input.textStatus ?? "idle",
        input.audioStatus ?? "idle",
        input.lastError ?? null,
        toSqliteBoolean(input.hasManualEdit ?? false),
        now,
        now
      );
    }
  });

  if (createdIds.length === 0) {
    return [];
  }

  const placeholders = createdIds.map(() => "?").join(", ");
  const rows = await database.getAllAsync<PageRow>(
    `SELECT * FROM pages WHERE id IN (${placeholders}) ORDER BY pageIndex ASC`,
    ...createdIds
  );

  return rows.map(mapPageRow);
}

export async function getPageById(id: string): Promise<Page | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<PageRow>(
    "SELECT * FROM pages WHERE id = ? LIMIT 1",
    id
  );

  return row ? mapPageRow(row) : null;
}

export async function listPagesByBookId(bookId: string): Promise<Page[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<PageRow>(
    "SELECT * FROM pages WHERE bookId = ? ORDER BY pageIndex ASC",
    bookId
  );

  return rows.map(mapPageRow);
}

export async function updatePage(
  id: string,
  input: UpdatePageInput
): Promise<Page> {
  const database = await getDatabase();
  const updates: Array<[string, unknown]> = [];

  if (input.pageIndex !== undefined) {
    updates.push(["pageIndex", input.pageIndex]);
  }
  if (input.imagePath !== undefined) {
    updates.push(["imagePath", input.imagePath]);
  }
  if (input.originalText !== undefined) {
    updates.push(["originalText", input.originalText]);
  }
  if (input.sceneDescription !== undefined) {
    updates.push(["sceneDescription", input.sceneDescription]);
  }
  if (input.readAloudText !== undefined) {
    updates.push(["readAloudText", input.readAloudText]);
  }
  if (input.audioPath !== undefined) {
    updates.push(["audioPath", input.audioPath]);
  }
  if (input.audioDuration !== undefined) {
    updates.push(["audioDuration", input.audioDuration]);
  }
  if (input.textStatus !== undefined) {
    updates.push(["textStatus", input.textStatus]);
  }
  if (input.audioStatus !== undefined) {
    updates.push(["audioStatus", input.audioStatus]);
  }
  if (input.lastError !== undefined) {
    updates.push(["lastError", input.lastError]);
  }
  if (input.hasManualEdit !== undefined) {
    updates.push(["hasManualEdit", toSqliteBoolean(input.hasManualEdit)]);
  }

  updates.push(["updatedAt", getNowIsoString()]);

  const setClause = updates.map(([key]) => `${key} = ?`).join(", ");
  const values = updates.map(([, value]) => value) as SQLiteBindValue[];

  await database.runAsync(`UPDATE pages SET ${setClause} WHERE id = ?`, ...values, id);

  const page = await getPageById(id);

  if (!page) {
    throw new Error(`Page not found: ${id}`);
  }

  return page;
}

export async function deletePageById(id: string): Promise<void> {
  const database = await getDatabase();

  await database.runAsync("DELETE FROM pages WHERE id = ?", id);
}

export async function deletePagesByBookId(bookId: string): Promise<void> {
  const database = await getDatabase();

  await database.runAsync("DELETE FROM pages WHERE bookId = ?", bookId);
}
