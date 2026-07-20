export interface WorldFavorites {
  getFavorites(): string[];

  isFavorite(id: string): boolean;

  addFavorite(id: string): void;

  removeFavorite(id: string): void;

  toggleFavorite(id: string): void;
}
