/* ==========================================
   Playground Profile Asset Store
   Sprint 16A — Milestone 16.1
========================================== */

export type AssetKind =
  | "avatar"
  | "banner"
  | "gallery"
  | "video"
  | "audio";

export interface AssetTransform {
  x: number;
  y: number;
  zoom: number;
  rotation: number;
  brightness: number;
}

export interface ProfileAsset {
  id: string;
  type: AssetKind;

  /** Original uploaded file */
  file: Blob;

  /** Local preview URL */
  previewUrl: string;

  width?: number;
  height?: number;

  createdAt: number;
  updatedAt: number;

  transform: AssetTransform;
}

const DATABASE_NAME = "playground-profile-assets";
const STORE_NAME = "assets";
const VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "type",
        });
      }
    };

    request.onsuccess = () => resolve(request.result);

    request.onerror = () => reject(request.error);
  });
}

async function transaction(mode: IDBTransactionMode) {
  const db = await openDatabase();
  return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
}

export async function saveAsset(asset: ProfileAsset): Promise<void> {
  const store = await transaction("readwrite");

  return new Promise((resolve, reject) => {
    const request = store.put(asset);

    request.onsuccess = () => resolve();

    request.onerror = () => reject(request.error);
  });
}

export async function getAsset(
  type: AssetKind
): Promise<ProfileAsset | null> {
  const store = await transaction("readonly");

  return new Promise((resolve, reject) => {
    const request = store.get(type);

    request.onsuccess = () => resolve(request.result ?? null);

    request.onerror = () => reject(request.error);
  });
}

export async function deleteAsset(type: AssetKind): Promise<void> {
  const store = await transaction("readwrite");

  return new Promise((resolve, reject) => {
    const request = store.delete(type);

    request.onsuccess = () => resolve();

    request.onerror = () => reject(request.error);
  });
}

export const DEFAULT_TRANSFORM: AssetTransform = {
  x: 0,
  y: 0,
  zoom: 1,
  rotation: 0,
  brightness: 1,
};
export const ProfileAssetStore = {
  save: saveAsset,
  get: getAsset,
  remove: deleteAsset,

  async has(type: AssetKind): Promise<boolean> {
    return (await getAsset(type)) !== null;
  },

  async replace(asset: ProfileAsset): Promise<void> {
    await saveAsset(asset);
  },
};