export interface WorldRecent {
  getRecent(): string[];

  recordOpen(id: string): void;

  clear(): void;
}
