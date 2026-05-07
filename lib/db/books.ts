import type { SQLiteBindValue } from "expo-sqlite";

import { getDatabase } from "@/lib/db";
import { createId, getNowIsoString } from "@/lib/db/utils";
import type { Book, CreateBookInput, UpdateBookInput } from "@/types/book";

function mapBookRow(row: Book): Book {
  return row;
}

export async function createBook(input: CreateBookInput): Promise<Book> {
  const database = await getDatabase();
  const now = getNowIsoString();
  const id = createId("book");

  await database.runAsync(
    `INSERT INTO books (
      id,
      title,
      language,
      coverImagePath,
      coverPageId,
      pageCount,
      currentPageIndex,
      visionConfigId,
      ttsConfigId,
      createdAt,
      updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.title,
    input.language,
    input.coverImagePath ?? null,
    input.coverPageId ?? null,
    input.pageCount ?? 0,
    input.currentPageIndex ?? 0,
    input.visionConfigId ?? null,
    input.ttsConfigId ?? null,
    now,
    now
  );

  const book = await getBookById(id);

  if (!book) {
    throw new Error("Failed to create book.");
  }

  return book;
}

export async function getBookById(id: string): Promise<Book | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<Book>(
    "SELECT * FROM books WHERE id = ? LIMIT 1",
    id
  );

  return row ? mapBookRow(row) : null;
}

export async function listBooks(): Promise<Book[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Book>(
    "SELECT * FROM books ORDER BY updatedAt DESC, createdAt DESC"
  );

  return rows.map(mapBookRow);
}

export async function updateBook(
  id: string,
  input: UpdateBookInput
): Promise<Book> {
  const database = await getDatabase();
  const updates: Array<[string, unknown]> = [];

  if (input.title !== undefined) {
    updates.push(["title", input.title]);
  }
  if (input.language !== undefined) {
    updates.push(["language", input.language]);
  }
  if (input.coverImagePath !== undefined) {
    updates.push(["coverImagePath", input.coverImagePath]);
  }
  if (input.coverPageId !== undefined) {
    updates.push(["coverPageId", input.coverPageId]);
  }
  if (input.pageCount !== undefined) {
    updates.push(["pageCount", input.pageCount]);
  }
  if (input.currentPageIndex !== undefined) {
    updates.push(["currentPageIndex", input.currentPageIndex]);
  }
  if (input.visionConfigId !== undefined) {
    updates.push(["visionConfigId", input.visionConfigId]);
  }
  if (input.ttsConfigId !== undefined) {
    updates.push(["ttsConfigId", input.ttsConfigId]);
  }

  updates.push(["updatedAt", getNowIsoString()]);

  const setClause = updates.map(([key]) => `${key} = ?`).join(", ");
  const values = updates.map(([, value]) => value) as SQLiteBindValue[];

  await database.runAsync(`UPDATE books SET ${setClause} WHERE id = ?`, ...values, id);

  const book = await getBookById(id);

  if (!book) {
    throw new Error(`Book not found: ${id}`);
  }

  return book;
}

export async function deleteBook(id: string): Promise<void> {
  const database = await getDatabase();

  await database.runAsync("DELETE FROM books WHERE id = ?", id);
}
