import type { WorldRecent } from "./WorldRecent";

const RECENT_KEY = "worlds.recent.v1";
const MAX_RECENT_WORLDS = 20;

function readIds(): string[] {
  try {
    const storedValue = localStorage.getItem(RECENT_KEY);

    if (!storedValue) {
      return [];
    }

    const parsedValue: unknown = JSON.parse(storedValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(
      (value): value is string => typeof value === "string",
    );
  } catch {
    return [];
  }
}

function writeIds(ids: string[]): void {
  localStorage.setItem(
    RECENT_KEY,
    JSON.stringify(ids.slice(0, MAX_RECENT_WORLDS)),
  );
}

export class LocalWorldRecent implements WorldRecent {
  getRecent(): string[] {
    return readIds();
  }

  recordOpen(id: string): void {
    const existingIds = readIds().filter(
      (recentId) => recentId !== id,
    );

    writeIds([id, ...existingIds]);
  }

  clear(): void {
    localStorage.removeItem(RECENT_KEY);
  }
}

export const worldRecent = new LocalWorldRecent();