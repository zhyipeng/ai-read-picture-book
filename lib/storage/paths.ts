import * as FileSystem from "expo-file-system/legacy";

const APP_STORAGE_DIRECTORY_NAME = "huiben";
const BOOKS_DIRECTORY_NAME = "books";
const IMAGES_DIRECTORY_NAME = "images";
const AUDIO_DIRECTORY_NAME = "audio";

function getDocumentDirectory(): string {
  if (!FileSystem.documentDirectory) {
    throw new Error("expo-file-system documentDirectory is unavailable.");
  }

  return FileSystem.documentDirectory;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeExtension(extension: string): string {
  return extension.startsWith(".") ? extension : `.${extension}`;
}

function getExtensionFromUri(uri: string, fallbackExtension: string): string {
  const sanitizedUri = uri.split("?")[0]?.split("#")[0] ?? "";
  const match = sanitizedUri.match(/(\.[a-zA-Z0-9]+)$/);

  return match?.[1] ?? normalizeExtension(fallbackExtension);
}

export function getAppStorageRootDirectory(): string {
  return ensureTrailingSlash(
    `${getDocumentDirectory()}${APP_STORAGE_DIRECTORY_NAME}`
  );
}

export function getBooksRootDirectory(): string {
  return ensureTrailingSlash(
    `${getAppStorageRootDirectory()}${BOOKS_DIRECTORY_NAME}`
  );
}

export function getBookDirectory(bookId: string): string {
  return ensureTrailingSlash(`${getBooksRootDirectory()}${bookId}`);
}

export function getBookImagesDirectory(bookId: string): string {
  return ensureTrailingSlash(`${getBookDirectory(bookId)}${IMAGES_DIRECTORY_NAME}`);
}

export function getBookAudioDirectory(bookId: string): string {
  return ensureTrailingSlash(`${getBookDirectory(bookId)}${AUDIO_DIRECTORY_NAME}`);
}

export function getPageImagePath(
  bookId: string,
  pageId: string,
  sourceUri: string,
  fallbackExtension = ".jpg"
): string {
  return `${getBookImagesDirectory(bookId)}${pageId}${getExtensionFromUri(
    sourceUri,
    fallbackExtension
  )}`;
}

export function getPageAudioPath(
  bookId: string,
  pageId: string,
  extension = ".mp3"
): string {
  return `${getBookAudioDirectory(bookId)}${pageId}${normalizeExtension(extension)}`;
}
