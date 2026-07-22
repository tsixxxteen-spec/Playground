import type { PlaygroundData } from "../types/playground";

export type HistoryEntry = {
  commandId: string;
  label: string;
  snapshot: PlaygroundData;
  selectionId: string | null;
  timestamp: number;
};

export type HistoryRestoreResult = {
  playground: PlaygroundData;
  selectionId: string | null;
};

export type HistoryStatus = {
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
  undoDepth: number;
  redoDepth: number;
};

const clonePlayground = (
  playground: PlaygroundData,
): PlaygroundData => {
  if (typeof structuredClone === "function") {
    return structuredClone(playground);
  }

  return JSON.parse(
    JSON.stringify(playground),
  ) as PlaygroundData;
};

export class HistoryManager {
  private readonly limit: number;
  private readonly mergeWindowMs: number;

  private past: HistoryEntry[] = [];
  private future: HistoryEntry[] = [];

  constructor(
    limit = 100,
    mergeWindowMs = 450,
  ) {
    this.limit = Math.max(1, limit);
    this.mergeWindowMs = Math.max(
      0,
      mergeWindowMs,
    );
  }

  record(
    previous: PlaygroundData,
    next: PlaygroundData,
    commandId: string,
    label: string,
    previousSelectionId: string | null,
  ): void {
    if (previous === next) {
      return;
    }

    const timestamp = Date.now();

    const latest =
      this.past.length > 0
        ? this.past[this.past.length - 1]
        : undefined;

    const shouldMerge =
      latest?.commandId === commandId &&
      timestamp - latest.timestamp <=
        this.mergeWindowMs;

    if (shouldMerge && latest) {
      latest.timestamp = timestamp;
      latest.label = label;
    } else {
      this.past.push({
        commandId,
        label,
        snapshot: clonePlayground(previous),
        selectionId: previousSelectionId,
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
    currentSelectionId: string | null,
  ): HistoryRestoreResult | null {
    const entry = this.past.pop();

    if (!entry) {
      return null;
    }

    this.future.push({
      commandId: entry.commandId,
      label: entry.label,
      snapshot: clonePlayground(current),
      selectionId: currentSelectionId,
      timestamp: Date.now(),
    });

    return {
      playground: clonePlayground(entry.snapshot),
      selectionId: entry.selectionId,
    };
  }

  redo(
    current: PlaygroundData,
    currentSelectionId: string | null,
  ): HistoryRestoreResult | null {
    const entry = this.future.pop();

    if (!entry) {
      return null;
    }

    this.past.push({
      commandId: entry.commandId,
      label: entry.label,
      snapshot: clonePlayground(current),
      selectionId: currentSelectionId,
      timestamp: Date.now(),
    });

    return {
      playground: clonePlayground(entry.snapshot),
      selectionId: entry.selectionId,
    };
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }

  getStatus(): HistoryStatus {
    const latestPast =
      this.past.length > 0
        ? this.past[this.past.length - 1]
        : undefined;

    const latestFuture =
      this.future.length > 0
        ? this.future[this.future.length - 1]
        : undefined;

    return {
      canUndo: this.past.length > 0,
      canRedo: this.future.length > 0,
      undoLabel: latestPast?.label ?? null,
      redoLabel: latestFuture?.label ?? null,
      undoDepth: this.past.length,
      redoDepth: this.future.length,
    };
  }
}
