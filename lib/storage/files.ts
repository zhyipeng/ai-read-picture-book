import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

import {
  getAppStorageRootDirectory,
  getBookAudioDirectory,
  getBookDirectory,
  getBookImagesDirectory,
  getBooksRootDirectory,
  getPageAudioPath,
  getPageImagePath,
} from "@/lib/storage/paths";
import {
  deleteWebImagesByBookId,
  getWebImageObjectUrl,
  isWebImageUri,
  saveWebImage,
} from "@/lib/storage/web-images";

async function ensureDirectoryExists(directory: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(directory);

  if (info.exists) {
    return;
  }

  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
}

export async function ensureBookDirectories(bookId: string): Promise<void> {
  await ensureDirectoryExists(getAppStorageRootDirectory());
  await ensureDirectoryExists(getBooksRootDirectory());
  await ensureDirectoryExists(getBookDirectory(bookId));
  await ensureDirectoryExists(getBookImagesDirectory(bookId));
  await ensureDirectoryExists(getBookAudioDirectory(bookId));
}

export async function copyImageToBook(params: {
  bookId: string;
  pageId: string;
  sourceUri: string;
  fallbackExtension?: string;
}): Promise<string> {
  const { bookId, pageId, sourceUri, fallbackExtension } = params;

  await ensureBookDirectories(bookId);

  const destinationPath = getPageImagePath(
    bookId,
    pageId,
    sourceUri,
    fallbackExtension
  );

  await FileSystem.copyAsync({
    from: sourceUri,
    to: destinationPath,
  });

  return destinationPath;
}

export async function persistImageToBook(params: {
  bookId: string;
  pageId: string;
  sourceUri: string;
  fallbackExtension?: string;
  webFile?: Blob | File | null;
}): Promise<string> {
  if (Platform.OS === "web") {
    return saveWebImage({
      bookId: params.bookId,
      pageId: params.pageId,
      file: params.webFile,
    });
  }

  return copyImageToBook(params);
}

export async function getPersistedImageUri(imagePath: string): Promise<{
  uri: string;
  revoke?: () => void;
}> {
  if (!isWebImageUri(imagePath)) {
    return { uri: imagePath };
  }

  const objectUrl = await getWebImageObjectUrl(imagePath);

  return {
    uri: objectUrl,
    revoke: () => URL.revokeObjectURL(objectUrl),
  };
}

export async function writeAudioToPage(params: {
  bookId: string;
  pageId: string;
  base64Audio: string;
  extension?: string;
}): Promise<string> {
  const { bookId, pageId, base64Audio, extension } = params;

  await ensureBookDirectories(bookId);

  const destinationPath = getPageAudioPath(bookId, pageId, extension);

  await FileSystem.writeAsStringAsync(destinationPath, base64Audio, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return destinationPath;
}

export async function deleteFileIfExists(filePath: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(filePath);

  if (!info.exists) {
    return;
  }

  await FileSystem.deleteAsync(filePath, { idempotent: true });
}

export async function deleteBookDirectory(bookId: string): Promise<void> {
  if (Platform.OS === "web") {
    await deleteWebImagesByBookId(bookId);
    return;
  }

  const directory = getBookDirectory(bookId);
  const info = await FileSystem.getInfoAsync(directory);

  if (!info.exists) {
    return;
  }

  await FileSystem.deleteAsync(directory, { idempotent: true });
}
