import type { PlaygroundData } from "../types/playground";

type HistoryEntry = {
  commandId: string;
  label: string;
  snapshot: PlaygroundData;
  timestamp: number;
};

export type HistoryStatus = {
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
};

const clonePlayground = (
  playground: PlaygroundData,
): PlaygroundData =>
  typeof structuredClone === "function"
    ? structuredClone(playground)
    : JSON.parse(
        JSON.stringify(playground),
      ) as PlaygroundData;

export class HistoryManager {
  private readonly limit: number;
  private readonly mergeWindowMs: number;
  private past: HistoryEntry[] = [];
  private future: HistoryEntry[] = [];

  constructor(limit = 100, mergeWindowMs = 450) {
    this.limit = Math.max(1, limit);
    this.mergeWindowMs = Math.max(0, mergeWindowMs);
  }

  record(
    previous: PlaygroundData,
    next: PlaygroundData,
    commandId: string,
    label: string,
  ): void {
    if (previous === next) return;

    const timestamp = Date.now();
    const latest = this.past.at(-1);
    const shouldMerge =
      latest?.commandId === commandId &&
      timestamp - latest.timestamp <= this.mergeWindowMs;

    if (shouldMerge && latest) {
      latest.timestamp = timestamp;
      latest.label = label;
    } else {
      this.past.push({
        commandId,
        label,
        snapshot: clonePlayground(previous),
        timestamp,
      });

      if (this.past.length > this.limit) {
        this.past.shift();
      }
    }

    this.future = [];
  }

  undo(
    current: PlaygroundData,
  ): PlaygroundData | null {
    const entry = this.past.pop();

    if (!entry) return null;

    this.future.push({
      commandId: entry.commandId,
      label: entry.label,
      snapshot: clonePlayground(current),
      timestamp: Date.now(),
    });

    return clonePlayground(entry.snapshot);
  }

  redo(
    current: PlaygroundData,
  ): PlaygroundData | null {
    const entry = this.future.pop();

    if (!entry) return null;

    this.past.push({
      commandId: entry.commandId,
      label: entry.label,
      snapshot: clonePlayground(current),
      timestamp: Date.now(),
    });

    return clonePlayground(entry.snapshot);
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }

  getStatus(): HistoryStatus {
    return {
      canUndo: this.past.length > 0,
      canRedo: this.future.length > 0,
      undoLabel: this.past.at(-1)?.label ?? null,
      redoLabel: this.future.at(-1)?.label ?? null,
    };
  }
}
