const WEB_IMAGE_URI_PREFIX = "web-image://";
const WEB_IMAGE_DATABASE_NAME = "huiben-web-storage";
const WEB_IMAGE_STORE_NAME = "book-images";

type WebImageRecord = {
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
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

async function openWebImageDatabase(): Promise<IDBDatabase> {
  if (!databasePromise) {
    databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const indexedDb = ensureIndexedDbAvailable();
      const request = indexedDb.open(WEB_IMAGE_DATABASE_NAME, 1);

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(WEB_IMAGE_STORE_NAME)) {
          database.createObjectStore(WEB_IMAGE_STORE_NAME, { keyPath: "id" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error("Failed to open IndexedDB database."));
    });
  }

  return databasePromise;
}

function buildWebImageId(bookId: string, pageId: string): string {
  return `${bookId}/${pageId}`;
}

export function isWebImageUri(imagePath: string): boolean {
  return imagePath.startsWith(WEB_IMAGE_URI_PREFIX);
}

function parseWebImageUri(imagePath: string): string {
  if (!isWebImageUri(imagePath)) {
    throw new Error(`Unsupported web image uri: ${imagePath}`);
  }

  return imagePath.slice(WEB_IMAGE_URI_PREFIX.length);
}

export async function saveWebImage(params: {
  bookId: string;
  pageId: string;
  file: Blob | File | null | undefined;
}): Promise<string> {
  const { bookId, pageId, file } = params;

  if (!file) {
    throw new Error("Web image file is missing.");
  }

  const database = await openWebImageDatabase();
  const transaction = database.transaction(WEB_IMAGE_STORE_NAME, "readwrite");
  const store = transaction.objectStore(WEB_IMAGE_STORE_NAME);
  const id = buildWebImageId(bookId, pageId);

  const record: WebImageRecord = {
    id,
    bookId,
    blob: file,
    createdAt: new Date().toISOString(),
  };

  await waitForRequest(store.put(record));
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Failed to write web image."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Web image write was aborted."));
  });

  return `${WEB_IMAGE_URI_PREFIX}${id}`;
}

export async function getWebImageObjectUrl(imagePath: string): Promise<string> {
  const database = await openWebImageDatabase();
  const transaction = database.transaction(WEB_IMAGE_STORE_NAME, "readonly");
  const store = transaction.objectStore(WEB_IMAGE_STORE_NAME);
  const record = await waitForRequest(
    store.get(parseWebImageUri(imagePath))
  ) as WebImageRecord | undefined;

  if (!record) {
    throw new Error(`Web image not found: ${imagePath}`);
  }

  return URL.createObjectURL(record.blob);
}

export async function deleteWebImagesByBookId(bookId: string): Promise<void> {
  const database = await openWebImageDatabase();
  const transaction = database.transaction(WEB_IMAGE_STORE_NAME, "readwrite");
  const store = transaction.objectStore(WEB_IMAGE_STORE_NAME);

  await new Promise<void>((resolve, reject) => {
    const request = store.openCursor();

    request.onsuccess = () => {
      const cursor = request.result;

      if (!cursor) {
        resolve();
        return;
      }

      const record = cursor.value as WebImageRecord;

      if (record.bookId === bookId) {
        cursor.delete();
      }

      cursor.continue();
    };

    request.onerror = () =>
      reject(request.error ?? new Error("Failed to delete web images."));
  });

  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Failed to finalize web image deletion."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Web image deletion was aborted."));
  });
}

export async function deleteWebImageByPath(imagePath: string): Promise<void> {
  const database = await openWebImageDatabase();
  const transaction = database.transaction(WEB_IMAGE_STORE_NAME, "readwrite");
  const store = transaction.objectStore(WEB_IMAGE_STORE_NAME);

  await waitForRequest(store.delete(parseWebImageUri(imagePath)));

  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Failed to finalize web image deletion."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Web image deletion was aborted."));
  });
}
