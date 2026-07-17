const DATABASE_NAME = "playground-profile-media";
const DATABASE_VERSION = 1;
const STORE_NAME = "media";

export type ProfileMediaKey =
  | "profile-avatar"
  | "profile-music";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(
      DATABASE_NAME,
      DATABASE_VERSION,
    );

    request.onupgradeneeded = () => {
      const database = request.result;

      if (
        !database.objectStoreNames.contains(
          STORE_NAME,
        )
      ) {
        database.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(
        request.error ??
          new Error(
            "Could not open profile media storage.",
          ),
      );
    };
  });
}

export async function saveProfileMedia(
  key: ProfileMediaKey,
  blob: Blob,
): Promise<void> {
  const database = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(
        STORE_NAME,
        "readwrite",
      );

      const store =
        transaction.objectStore(STORE_NAME);

      store.put(blob, key);

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(
          transaction.error ??
            new Error(
              `Could not save ${key}.`,
            ),
        );
      };

      transaction.onabort = () => {
        reject(
          transaction.error ??
            new Error(
              `Saving ${key} was cancelled.`,
            ),
        );
      };
    });
  } finally {
    database.close();
  }
}

export async function readProfileMedia(
  key: ProfileMediaKey,
): Promise<Blob | null> {
  const database = await openDatabase();

  try {
    return await new Promise<Blob | null>(
      (resolve, reject) => {
        const transaction = database.transaction(
          STORE_NAME,
          "readonly",
        );

        const store =
          transaction.objectStore(STORE_NAME);

        const request = store.get(key);

        request.onsuccess = () => {
          resolve(
            request.result instanceof Blob
              ? request.result
              : null,
          );
        };

        request.onerror = () => {
          reject(
            request.error ??
              new Error(
                `Could not read ${key}.`,
              ),
          );
        };
      },
    );
  } finally {
    database.close();
  }
}

export async function deleteProfileMedia(
  key: ProfileMediaKey,
): Promise<void> {
  const database = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(
        STORE_NAME,
        "readwrite",
      );

      const store =
        transaction.objectStore(STORE_NAME);

      store.delete(key);

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(
          transaction.error ??
            new Error(
              `Could not delete ${key}.`,
            ),
        );
      };

      transaction.onabort = () => {
        reject(
          transaction.error ??
            new Error(
              `Deleting ${key} was cancelled.`,
            ),
        );
      };
    });
  } finally {
    database.close();
  }
}

export async function blobFromSource(
  source: string,
): Promise<Blob> {
  const response = await fetch(source);

  if (!response.ok) {
    throw new Error(
      `Could not load local media: ${response.status}`,
    );
  }

  return response.blob();
}
