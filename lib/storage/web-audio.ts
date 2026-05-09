const WEB_AUDIO_URI_PREFIX = "web-audio://";
const WEB_AUDIO_DATABASE_NAME = "huiben-web-audio";
const WEB_AUDIO_STORE_NAME = "book-audio";

type WebAudioRecord = {
  id: string;
  bookId: string;
  blob: Blob;
  createdAt: string;
};

let databasePromise: Promise<IDBDatabase> | null = null;

function ensureIndexedDbAvailable(): IDBFactory {
  const indexedDb = globalThis.indexedDB;

  if (!indexedDb) {
    throw new Error("IndexedDB is unavailable on web.");
  }

  return indexedDb;
}

function waitForRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

async function openWebAudioDatabase(): Promise<IDBDatabase> {
  if (!databasePromise) {
    databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const indexedDb = ensureIndexedDbAvailable();
      const request = indexedDb.open(WEB_AUDIO_DATABASE_NAME, 1);

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(WEB_AUDIO_STORE_NAME)) {
          database.createObjectStore(WEB_AUDIO_STORE_NAME, { keyPath: "id" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error("Failed to open IndexedDB database."));
    });
  }

  return databasePromise;
}

function buildWebAudioId(bookId: string, pageId: string): string {
  return `${bookId}/${pageId}`;
}

export function isWebAudioUri(audioPath: string): boolean {
  return audioPath.startsWith(WEB_AUDIO_URI_PREFIX);
}

function parseWebAudioUri(audioPath: string): string {
  if (!isWebAudioUri(audioPath)) {
    throw new Error(`Unsupported web audio uri: ${audioPath}`);
  }

  return audioPath.slice(WEB_AUDIO_URI_PREFIX.length);
}

export async function saveWebAudio(params: {
  bookId: string;
  pageId: string;
  base64Audio: string;
  mimeType?: string;
}): Promise<string> {
  const { bookId, pageId, base64Audio, mimeType } = params;

  const binary = atob(base64Audio);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType ?? "audio/mpeg" });

  const database = await openWebAudioDatabase();
  const transaction = database.transaction(WEB_AUDIO_STORE_NAME, "readwrite");
  const store = transaction.objectStore(WEB_AUDIO_STORE_NAME);
  const id = buildWebAudioId(bookId, pageId);

  const record: WebAudioRecord = {
    id,
    bookId,
    blob,
    createdAt: new Date().toISOString(),
  };

  await waitForRequest(store.put(record));
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Failed to write web audio."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Web audio write was aborted."));
  });

  return `${WEB_AUDIO_URI_PREFIX}${id}`;
}

export async function getWebAudioObjectUrl(audioPath: string): Promise<string> {
  const database = await openWebAudioDatabase();
  const transaction = database.transaction(WEB_AUDIO_STORE_NAME, "readonly");
  const store = transaction.objectStore(WEB_AUDIO_STORE_NAME);
  const record = (await waitForRequest(
    store.get(parseWebAudioUri(audioPath))
  )) as WebAudioRecord | undefined;

  if (!record) {
    throw new Error(`Web audio not found: ${audioPath}`);
  }

  return URL.createObjectURL(record.blob);
}

export async function deleteWebAudioByBookId(bookId: string): Promise<void> {
  const database = await openWebAudioDatabase();
  const transaction = database.transaction(WEB_AUDIO_STORE_NAME, "readwrite");
  const store = transaction.objectStore(WEB_AUDIO_STORE_NAME);

  await new Promise<void>((resolve, reject) => {
    const request = store.openCursor();

    request.onsuccess = () => {
      const cursor = request.result;

      if (!cursor) {
        resolve();
        return;
      }

      const record = cursor.value as WebAudioRecord;

      if (record.bookId === bookId) {
        cursor.delete();
      }

      cursor.continue();
    };

    request.onerror = () =>
      reject(request.error ?? new Error("Failed to delete web audio."));
  });

  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Failed to finalize web audio deletion."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Web audio deletion was aborted."));
  });
}

export async function deleteWebAudioByPath(audioPath: string): Promise<void> {
  const database = await openWebAudioDatabase();
  const transaction = database.transaction(WEB_AUDIO_STORE_NAME, "readwrite");
  const store = transaction.objectStore(WEB_AUDIO_STORE_NAME);

  await waitForRequest(store.delete(parseWebAudioUri(audioPath)));

  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Failed to finalize web audio deletion."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Web audio deletion was aborted."));
  });
}
