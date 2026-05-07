import type { BookLanguage } from "@/types/common";

export type Book = {
  id: string;
  title: string;
  language: BookLanguage;
  coverImagePath: string | null;
  coverPageId: string | null;
  pageCount: number;
  currentPageIndex: number;
  visionConfigId: string | null;
  ttsConfigId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateBookInput = {
  title: string;
  language: BookLanguage;
  coverImagePath?: string | null;
  coverPageId?: string | null;
  pageCount?: number;
  currentPageIndex?: number;
  visionConfigId?: string | null;
  ttsConfigId?: string | null;
};

export type UpdateBookInput = Partial<
  Omit<Book, "id" | "createdAt" | "updatedAt">
>;
