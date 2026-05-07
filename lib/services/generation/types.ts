import type { Book } from "@/types/book";
import type { Page } from "@/types/page";

export type GeneratePageTextParams = {
  book: Book;
  page: Page;
};

export type GeneratePageAudioParams = {
  book: Book;
  page: Page;
};

export type GenerateBookTextParams = {
  book: Book;
  pages: Page[];
};

export type GenerateBookAudioParams = {
  book: Book;
  pages: Page[];
};

export type GenerateBookTextResult = {
  generatedCount: number;
};

export type GenerateBookAudioResult = {
  generatedCount: number;
  skippedCount: number;
};

export type GenerationProviderName = "fake";

export type GenerationProvider = {
  name: GenerationProviderName;
  generatePageText: (params: GeneratePageTextParams) => Promise<Page>;
  generatePageAudio: (params: GeneratePageAudioParams) => Promise<Page>;
  generateBookText: (
    params: GenerateBookTextParams
  ) => Promise<GenerateBookTextResult>;
  generateBookAudio: (
    params: GenerateBookAudioParams
  ) => Promise<GenerateBookAudioResult>;
};
