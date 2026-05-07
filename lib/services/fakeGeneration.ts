import { updatePage } from "@/lib/db/pages";
import type { Book } from "@/types/book";
import type { Page } from "@/types/page";

const TEXT_DELAY_MS = 700;
const AUDIO_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function hasGeneratedText(page: Page): boolean {
  return (
    page.originalText.trim().length > 0 ||
    page.sceneDescription.trim().length > 0 ||
    page.readAloudText.trim().length > 0 ||
    page.textStatus === "done"
  );
}

function getZhOriginalText(pageNumber: number): string {
  if (pageNumber === 1) {
    return "小朋友抬起头，认真地望着月亮。";
  }

  if (pageNumber === 2) {
    return "“月亮看起来真像一块甜甜的点心。”他轻轻地说。";
  }

  return `第 ${pageNumber} 页里，小朋友继续看着夜空，心里冒出了新的想法。`;
}

function getEnOriginalText(pageNumber: number): string {
  if (pageNumber === 1) {
    return "The little one looked up at the moon very carefully.";
  }

  if (pageNumber === 2) {
    return '"The moon looks like a yummy treat," the little one whispered.';
  }

  return `On page ${pageNumber}, the little one keeps watching the night sky and imagines something new.`;
}

function buildOriginalText(book: Book, page: Page): string {
  const pageNumber = page.pageIndex + 1;

  return book.language === "zh"
    ? getZhOriginalText(pageNumber)
    : getEnOriginalText(pageNumber);
}

function buildSceneDescription(book: Book, page: Page): string {
  const pageNumber = page.pageIndex + 1;

  if (book.language === "zh") {
    return `《${book.title}》第 ${pageNumber} 页：夜色温柔，主角在画面中央抬头看向月亮，周围有海面反光和安静的童话氛围。`;
  }

  return `Page ${pageNumber} of "${book.title}": a gentle night scene with the child looking up at the moon, soft reflections on the water, and a calm storybook mood.`;
}

function buildReadAloudText(book: Book, page: Page, originalText: string): string {
  const pageNumber = page.pageIndex + 1;

  if (book.language === "zh") {
    return `${originalText} 这是《${book.title}》第 ${pageNumber} 页的朗读示例。`;
  }

  return `${originalText} This is the sample narration for page ${pageNumber} of ${book.title}.`;
}

function buildMockAudioPath(book: Book, page: Page): string {
  return `mock://audio/${book.id}/${page.id}.wav`;
}

function estimateAudioDurationSeconds(text: string): number {
  const minDuration = 2;
  const approxDuration = Math.ceil(text.trim().length / 10);

  return Math.max(minDuration, approxDuration);
}

export async function generatePageTextFake(params: {
  book: Book;
  page: Page;
}): Promise<Page> {
  const { book, page } = params;

  await updatePage(page.id, {
    textStatus: "generating",
    lastError: null,
  });

  await sleep(TEXT_DELAY_MS);

  const originalText = buildOriginalText(book, page);
  const sceneDescription = buildSceneDescription(book, page);
  const readAloudText = buildReadAloudText(book, page, originalText);

  return updatePage(page.id, {
    originalText,
    sceneDescription,
    readAloudText,
    textStatus: "done",
    audioStatus: "idle",
    audioPath: null,
    audioDuration: null,
    lastError: null,
    hasManualEdit: false,
  });
}

export async function generatePageAudioFake(params: {
  book: Book;
  page: Page;
}): Promise<Page> {
  const { book, page } = params;
  const readAloudText = page.readAloudText.trim();

  if (!readAloudText) {
    await updatePage(page.id, {
      audioStatus: "error",
      lastError: "缺少朗读文本，无法生成语音。",
    });

    throw new Error("缺少朗读文本，无法生成语音。");
  }

  await updatePage(page.id, {
    audioStatus: "generating",
    lastError: null,
  });

  await sleep(AUDIO_DELAY_MS);

  return updatePage(page.id, {
    audioStatus: "done",
    audioPath: buildMockAudioPath(book, page),
    audioDuration: estimateAudioDurationSeconds(readAloudText),
    lastError: null,
  });
}

export async function generateBookTextFake(params: {
  book: Book;
  pages: Page[];
}): Promise<{ generatedCount: number }> {
  const { book, pages } = params;

  for (const page of pages) {
    await generatePageTextFake({
      book,
      page,
    });
  }

  return {
    generatedCount: pages.length,
  };
}

export async function generateBookAudioFake(params: {
  book: Book;
  pages: Page[];
}): Promise<{ generatedCount: number; skippedCount: number }> {
  const { book, pages } = params;
  const eligiblePages = pages.filter(
    (page) => page.readAloudText.trim().length > 0 || hasGeneratedText(page)
  );
  let generatedCount = 0;

  for (const page of eligiblePages) {
    let nextPage = page;

    if (!page.readAloudText.trim()) {
      nextPage = await updatePage(page.id, {
        readAloudText: buildReadAloudText(book, page, buildOriginalText(book, page)),
      });
    }

    await generatePageAudioFake({
      book,
      page: nextPage,
    });
    generatedCount += 1;
  }

  return {
    generatedCount,
    skippedCount: pages.length - eligiblePages.length,
  };
}
