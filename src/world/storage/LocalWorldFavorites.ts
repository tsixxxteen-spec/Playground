import type { WorldFavorites } from "./WorldFavorites";

const FAVORITES_KEY = "worlds.favorites.v1";

function readIds(): string[] {
  try {
    const storedValue = localStorage.getItem(FAVORITES_KEY);

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
    FAVORITES_KEY,
    JSON.stringify([...new Set(ids)]),
  );
}

export class LocalWorldFavorites implements WorldFavorites {
  getFavorites(): string[] {
    return readIds();
  }

  isFavorite(id: string): boolean {
    return readIds().includes(id);
  }

  addFavorite(id: string): void {
    const favorites = readIds();

    if (!favorites.includes(id)) {
      writeIds([...favorites, id]);
    }
  }

  removeFavorite(id: string): void {
    writeIds(readIds().filter((favoriteId) => favoriteId !== id));
  }

  toggleFavorite(id: string): void {
    if (this.isFavorite(id)) {
      this.removeFavorite(id);
    } else {
      this.addFavorite(id);
    }
  }
}

export const worldFavorites = new LocalWorldFavorites();