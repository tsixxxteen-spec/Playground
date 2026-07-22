import {
  createCheckpoint,
  isCheckpoint,
  restoreCheckpoint,
} from "../persistence/checkpointStorage";

import type {
  PlaygroundHistoryEntry,
  HistoryEntryKind,
} from "./types";

const HISTORY_STORAGE_KEY =
  "playground:visual-history:v1";

const MAX_HISTORY_ENTRIES =
  60;

function createId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return [
    Date.now().toString(36),
    Math.random()
      .toString(36)
      .slice(2),
  ].join("-");
}

function isHistoryEntry(
  value: unknown,
): value is PlaygroundHistoryEntry {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const candidate =
    value as Partial<
      PlaygroundHistoryEntry
    >;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.kind === "string" &&
    typeof candidate.createdAt ===
      "number" &&
    isCheckpoint(
      candidate.checkpoint,
    )
  );
}

export function loadHistoryEntries(): PlaygroundHistoryEntry[] {
  const raw =
    localStorage.getItem(
      HISTORY_STORAGE_KEY,
    );

  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown =
      JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(isHistoryEntry)
      .sort(
        (left, right) =>
          right.createdAt -
          left.createdAt,
      );
  } catch {
    return [];
  }
}

export function saveHistoryEntries(
  entries:
    PlaygroundHistoryEntry[],
): void {
  localStorage.setItem(
    HISTORY_STORAGE_KEY,
    JSON.stringify(
      entries.slice(
        0,
        MAX_HISTORY_ENTRIES,
      ),
    ),
  );
}

export function createHistoryEntry(
  title: string,
  kind:
    HistoryEntryKind = "snapshot",
): PlaygroundHistoryEntry {
  const cleanedTitle =
    title.trim() ||
    "Untitled Snapshot";

  return {
    id:
      createId(),
    title:
      cleanedTitle,
    kind,
    createdAt:
      Date.now(),
    checkpoint:
      createCheckpoint(),
  };
}

export function addHistoryEntry(
  entry:
    PlaygroundHistoryEntry,
): PlaygroundHistoryEntry[] {
  const current =
    loadHistoryEntries();

  const next = [
    entry,
    ...current,
  ].slice(
    0,
    MAX_HISTORY_ENTRIES,
  );

  saveHistoryEntries(next);

  return next;
}

export function removeHistoryEntry(
  entryId: string,
): PlaygroundHistoryEntry[] {
  const next =
    loadHistoryEntries()
      .filter(
        (entry) =>
          entry.id !== entryId,
      );

  saveHistoryEntries(next);

  return next;
}

export function clearHistoryEntries(): void {
  localStorage.removeItem(
    HISTORY_STORAGE_KEY,
  );
}

export function restoreHistoryEntry(
  entry:
    PlaygroundHistoryEntry,
): void {
  restoreCheckpoint(
    entry.checkpoint,
  );
}
