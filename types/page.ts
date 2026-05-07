import type { GenerationStatus } from "@/types/common";

export type Page = {
  id: string;
  bookId: string;
  pageIndex: number;
  imagePath: string;
  originalText: string;
  sceneDescription: string;
  readAloudText: string;
  audioPath: string | null;
  audioDuration: number | null;
  textStatus: GenerationStatus;
  audioStatus: GenerationStatus;
  lastError: string | null;
  hasManualEdit: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreatePageInput = {
  id?: string;
  bookId: string;
  pageIndex: number;
  imagePath: string;
  originalText?: string;
  sceneDescription?: string;
  readAloudText?: string;
  audioPath?: string | null;
  audioDuration?: number | null;
  textStatus?: GenerationStatus;
  audioStatus?: GenerationStatus;
  lastError?: string | null;
  hasManualEdit?: boolean;
};

export type UpdatePageInput = Partial<
  Omit<Page, "id" | "bookId" | "createdAt" | "updatedAt">
>;
