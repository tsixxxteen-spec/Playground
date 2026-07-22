#!/usr/bin/env bash

set -euo pipefail

SPRINT_ID="21B.11B"
MARKER=".playground-sprint-21B11B-installed"
BACKUP_DIR=".playground-backups/sprint-21B11B-$(date +%Y%m%d-%H%M%S)"

fail() {
  echo "❌ $*" >&2
  exit 1
}

[[ -f package.json ]] || fail "Run this installer from the worlds project root."
[[ -f src/main.tsx ]] || fail "src/main.tsx was not found."
[[ -f src/collaboration/persistence/checkpointStorage.ts ]] || fail "Checkpoint storage was not found."
[[ -f src/collaboration/persistence/types.ts ]] || fail "Persistence types were not found."

if [[ -f "$MARKER" ]]; then
  echo "✅ Sprint $SPRINT_ID is already installed."
  exit 0
fi

mkdir -p "$BACKUP_DIR"
mkdir -p src/collaboration/history

FILES_TO_BACK_UP=(
  "src/main.tsx"
)

for file in "${FILES_TO_BACK_UP[@]}"; do
  mkdir -p "$BACKUP_DIR/$(dirname "$file")"
  cp -p "$file" "$BACKUP_DIR/$file"
done

rollback() {
  code=$?

  if [[ $code -ne 0 ]]; then
    echo ""
    echo "⚠️ Installation failed. Restoring previous files..."

    for file in "${FILES_TO_BACK_UP[@]}"; do
      if [[ -f "$BACKUP_DIR/$file" ]]; then
        cp -p "$BACKUP_DIR/$file" "$file"
      fi
    done

    rm -rf src/collaboration/history
    rm -f "$MARKER"

    echo "✅ Rollback complete."
  fi

  exit "$code"
}

trap rollback EXIT

# ------------------------------------------------------------
# History types
# ------------------------------------------------------------

cat > src/collaboration/history/types.ts <<'EOF'
import type {
  PlaygroundSessionCheckpoint,
} from "../persistence/types";

export type HistoryEntryKind =
  | "snapshot"
  | "undo"
  | "redo"
  | "restore"
  | "recovery"
  | "resync"
  | "mutation";

export type PlaygroundHistoryEntry = {
  id: string;
  title: string;
  kind: HistoryEntryKind;
  createdAt: number;
  checkpoint:
    PlaygroundSessionCheckpoint;
};

export type HistoryPanelStatus =
  | "idle"
  | "saved"
  | "restored"
  | "error";
EOF

# ------------------------------------------------------------
# History storage
# ------------------------------------------------------------

cat > src/collaboration/history/historyStorage.ts <<'EOF'
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
EOF

# ------------------------------------------------------------
# Visual history panel
# ------------------------------------------------------------

cat > src/collaboration/history/VisualHistoryPanel.tsx <<'EOF'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  addHistoryEntry,
  clearHistoryEntries,
  createHistoryEntry,
  loadHistoryEntries,
  removeHistoryEntry,
  restoreHistoryEntry,
} from "./historyStorage";

import type {
  HistoryEntryKind,
  HistoryPanelStatus,
  PlaygroundHistoryEntry,
} from "./types";

import "./visual-history-panel.css";

const PLAYGROUND_UNDO_EVENT =
  "playground:undo";

const PLAYGROUND_REDO_EVENT =
  "playground:redo";

const ACTIVITY_EVENTS: Array<{
  eventName: string;
  title: string;
  kind: HistoryEntryKind;
}> = [
  {
    eventName:
      "playground:undo-completed",
    title:
      "Undo",
    kind:
      "undo",
  },
  {
    eventName:
      "playground:redo-completed",
    title:
      "Redo",
    kind:
      "redo",
  },
  {
    eventName:
      "playground:mutation-recovered",
    title:
      "Recovered Change",
    kind:
      "recovery",
  },
  {
    eventName:
      "playground:session-resynced",
    title:
      "Session Resynced",
    kind:
      "resync",
  },
  {
    eventName:
      "playground:checkpoint-restored",
    title:
      "Checkpoint Restored",
    kind:
      "restore",
  },
];

function dispatchEditorEvent(
  eventName: string,
): void {
  document.dispatchEvent(
    new CustomEvent(eventName),
  );
}

function formatTime(
  timestamp: number,
): string {
  return new Date(timestamp)
    .toLocaleString(
      undefined,
      {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      },
    );
}

function getKindSymbol(
  kind:
    HistoryEntryKind,
): string {
  switch (kind) {
    case "undo":
      return "↶";

    case "redo":
      return "↷";

    case "restore":
      return "◷";

    case "recovery":
      return "✦";

    case "resync":
      return "⟳";

    case "mutation":
      return "◆";

    case "snapshot":
    default:
      return "◇";
  }
}

export default function VisualHistoryPanel() {
  const [
    isOpen,
    setIsOpen,
  ] = useState(false);

  const [
    entries,
    setEntries,
  ] = useState<
    PlaygroundHistoryEntry[]
  >([]);

  const [
    selectedId,
    setSelectedId,
  ] = useState<
    string | null
  >(null);

  const [
    snapshotName,
    setSnapshotName,
  ] = useState("");

  const [
    status,
    setStatus,
  ] = useState<
    HistoryPanelStatus
  >("idle");

  const [
    statusMessage,
    setStatusMessage,
  ] = useState(
    "History ready",
  );

  const refresh =
    useCallback(() => {
      const loaded =
        loadHistoryEntries();

      setEntries(loaded);

      setSelectedId(
        (current) => {
          if (
            current &&
            loaded.some(
              (entry) =>
                entry.id === current,
            )
          ) {
            return current;
          }

          return (
            loaded[0]?.id ??
            null
          );
        },
      );
    }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      const modifier =
        event.metaKey ||
        event.ctrlKey;

      if (
        modifier &&
        event.key.toLowerCase() ===
          "h"
      ) {
        event.preventDefault();

        setIsOpen(
          (current) => !current,
        );
      }

      if (
        event.key === "Escape"
      ) {
        setIsOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, []);

  useEffect(() => {
    const cleanups =
      ACTIVITY_EVENTS.map(
        ({
          eventName,
          title,
          kind,
        }) => {
          const handler =
            () => {
              try {
                const entry =
                  createHistoryEntry(
                    title,
                    kind,
                  );

                setEntries(
                  addHistoryEntry(
                    entry,
                  ),
                );

                setSelectedId(
                  entry.id,
                );

                setStatus(
                  "saved",
                );

                setStatusMessage(
                  `${title} recorded`,
                );
              } catch {
                setStatus(
                  "error",
                );

                setStatusMessage(
                  "Could not record history",
                );
              }
            };

          document.addEventListener(
            eventName,
            handler,
          );

          return () => {
            document.removeEventListener(
              eventName,
              handler,
            );
          };
        },
      );

    return () => {
      cleanups.forEach(
        (cleanup) => {
          cleanup();
        },
      );
    };
  }, []);

  const selectedEntry =
    useMemo(
      () =>
        entries.find(
          (entry) =>
            entry.id ===
            selectedId,
        ) ?? null,
      [
        entries,
        selectedId,
      ],
    );

  const handleCreateSnapshot =
    () => {
      try {
        const entry =
          createHistoryEntry(
            snapshotName ||
              "Manual Snapshot",
            "snapshot",
          );

        const next =
          addHistoryEntry(
            entry,
          );

        setEntries(next);
        setSelectedId(
          entry.id,
        );

        setSnapshotName("");

        setStatus(
          "saved",
        );

        setStatusMessage(
          "Snapshot created",
        );
      } catch {
        setStatus(
          "error",
        );

        setStatusMessage(
          "Snapshot failed",
        );
      }
    };

  const handleRestore =
    (
      entry:
        PlaygroundHistoryEntry,
    ) => {
      try {
        restoreHistoryEntry(
          entry,
        );

        const restoredEntry =
          createHistoryEntry(
            `Restored: ${entry.title}`,
            "restore",
          );

        const next =
          addHistoryEntry(
            restoredEntry,
          );

        setEntries(next);
        setSelectedId(
          restoredEntry.id,
        );

        setStatus(
          "restored",
        );

        setStatusMessage(
          "Workspace restored",
        );

        document.dispatchEvent(
          new CustomEvent(
            "playground:history-restored",
            {
              detail: {
                entry,
              },
            },
          ),
        );
      } catch {
        setStatus(
          "error",
        );

        setStatusMessage(
          "Restore failed",
        );
      }
    };

  const handleDelete =
    (
      entry:
        PlaygroundHistoryEntry,
    ) => {
      const next =
        removeHistoryEntry(
          entry.id,
        );

      setEntries(next);

      setSelectedId(
        next[0]?.id ??
        null,
      );

      setStatus(
        "idle",
      );

      setStatusMessage(
        "History entry deleted",
      );
    };

  const handleClear =
    () => {
      const confirmed =
        window.confirm(
          "Clear the entire visual history? This cannot be undone.",
        );

      if (!confirmed) {
        return;
      }

      clearHistoryEntries();

      setEntries([]);
      setSelectedId(null);

      setStatus(
        "idle",
      );

      setStatusMessage(
        "History cleared",
      );
    };

  return (
    <>
      <button
        type="button"
        className="playground-history-launcher"
        onClick={() => {
          setIsOpen(true);
        }}
        title="History — Command/Ctrl + H"
        aria-label="Open visual history"
      >
        <span
          aria-hidden="true"
        >
          ◷
        </span>

        <span>
          History
        </span>
      </button>

      {isOpen && (
        <div
          className="playground-history-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setIsOpen(false);
            }
          }}
        >
          <section
            className="playground-history-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Visual History"
          >
            <header className="playground-history-panel__header">
              <div>
                <p className="playground-history-panel__eyebrow">
                  Playground
                </p>

                <h2>
                  Visual History
                </h2>
              </div>

              <div className="playground-history-panel__header-actions">
                <div
                  className={`playground-history-panel__status playground-history-panel__status--${status}`}
                >
                  {statusMessage}
                </div>

                <button
                  type="button"
                  className="playground-history-panel__close"
                  onClick={() => {
                    setIsOpen(false);
                  }}
                  aria-label="Close history"
                >
                  ×
                </button>
              </div>
            </header>

            <div className="playground-history-panel__toolbar">
              <button
                type="button"
                onClick={() => {
                  dispatchEditorEvent(
                    PLAYGROUND_UNDO_EVENT,
                  );
                }}
              >
                <span
                  aria-hidden="true"
                >
                  ↶
                </span>

                Undo
              </button>

              <button
                type="button"
                onClick={() => {
                  dispatchEditorEvent(
                    PLAYGROUND_REDO_EVENT,
                  );
                }}
              >
                <span
                  aria-hidden="true"
                >
                  ↷
                </span>

                Redo
              </button>

              <div className="playground-history-panel__toolbar-spacer" />

              <span className="playground-history-panel__shortcut">
                ⌘H
              </span>
            </div>

            <div className="playground-history-panel__snapshot-bar">
              <input
                value={
                  snapshotName
                }
                placeholder="Name this restore point"
                onChange={(event) => {
                  setSnapshotName(
                    event.target.value,
                  );
                }}
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    handleCreateSnapshot();
                  }
                }}
              />

              <button
                type="button"
                onClick={
                  handleCreateSnapshot
                }
              >
                Save snapshot
              </button>
            </div>

            <div className="playground-history-panel__body">
              <div className="playground-history-panel__timeline">
                {entries.length === 0 ? (
                  <div className="playground-history-panel__empty">
                    <span
                      aria-hidden="true"
                    >
                      ◷
                    </span>

                    <h3>
                      No history yet
                    </h3>

                    <p>
                      Create a snapshot or make an undo, redo, recovery, or restore action.
                    </p>
                  </div>
                ) : (
                  entries.map(
                    (entry) => {
                      const selected =
                        entry.id ===
                        selectedId;

                      return (
                        <article
                          key={
                            entry.id
                          }
                          className={
                            selected
                              ? "playground-history-entry playground-history-entry--selected"
                              : "playground-history-entry"
                          }
                          onClick={() => {
                            setSelectedId(
                              entry.id,
                            );
                          }}
                        >
                          <button
                            type="button"
                            className="playground-history-entry__main"
                            onDoubleClick={() => {
                              handleRestore(
                                entry,
                              );
                            }}
                          >
                            <span
                              className={`playground-history-entry__icon playground-history-entry__icon--${entry.kind}`}
                              aria-hidden="true"
                            >
                              {getKindSymbol(
                                entry.kind,
                              )}
                            </span>

                            <span className="playground-history-entry__content">
                              <strong>
                                {entry.title}
                              </strong>

                              <small>
                                {formatTime(
                                  entry.createdAt,
                                )}
                              </small>
                            </span>
                          </button>

                          <button
                            type="button"
                            className="playground-history-entry__delete"
                            aria-label={`Delete ${entry.title}`}
                            onClick={(event) => {
                              event.stopPropagation();

                              handleDelete(
                                entry,
                              );
                            }}
                          >
                            ×
                          </button>
                        </article>
                      );
                    },
                  )
                )}
              </div>

              <aside className="playground-history-panel__details">
                {selectedEntry ? (
                  <>
                    <div className="playground-history-panel__preview">
                      <span
                        aria-hidden="true"
                      >
                        {getKindSymbol(
                          selectedEntry.kind,
                        )}
                      </span>
                    </div>

                    <p className="playground-history-panel__detail-label">
                      Restore point
                    </p>

                    <h3>
                      {selectedEntry.title}
                    </h3>

                    <dl>
                      <div>
                        <dt>
                          Type
                        </dt>

                        <dd>
                          {selectedEntry.kind}
                        </dd>
                      </div>

                      <div>
                        <dt>
                          Created
                        </dt>

                        <dd>
                          {new Date(
                            selectedEntry.createdAt,
                          ).toLocaleString()}
                        </dd>
                      </div>

                      <div>
                        <dt>
                          Objects
                        </dt>

                        <dd>
                          {
                            selectedEntry
                              .checkpoint
                              .objects
                              .length
                          }
                        </dd>
                      </div>

                      <div>
                        <dt>
                          Version
                        </dt>

                        <dd>
                          {
                            selectedEntry
                              .checkpoint
                              .version
                          }
                        </dd>
                      </div>
                    </dl>

                    <button
                      type="button"
                      className="playground-history-panel__restore"
                      onClick={() => {
                        handleRestore(
                          selectedEntry,
                        );
                      }}
                    >
                      Restore this version
                    </button>
                  </>
                ) : (
                  <div className="playground-history-panel__details-empty">
                    Select a history entry.
                  </div>
                )}

                {entries.length > 0 && (
                  <button
                    type="button"
                    className="playground-history-panel__clear"
                    onClick={
                      handleClear
                    }
                  >
                    Clear history
                  </button>
                )}
              </aside>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
EOF

# ------------------------------------------------------------
# Visual history styling
# ------------------------------------------------------------

cat > src/collaboration/history/visual-history-panel.css <<'EOF'
.playground-history-launcher {
  position: fixed;
  right: 18px;
  bottom: 124px;
  z-index: 9998;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 13px;
  border: 1px solid
    rgba(255, 255, 255, 0.13);
  border-radius: 12px;
  background:
    rgba(18, 18, 20, 0.94);
  color:
    rgba(255, 255, 255, 0.9);
  font:
    650 12px/1
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  cursor: pointer;
  box-shadow:
    0 12px 36px
    rgba(0, 0, 0, 0.32);
  backdrop-filter:
    blur(18px);
}

.playground-history-launcher:hover {
  background:
    rgba(28, 28, 31, 0.98);
  transform:
    translateY(-1px);
}

.playground-history-overlay {
  position: fixed;
  inset: 0;
  z-index: 12100;
  display: grid;
  place-items: center;
  padding: 28px;
  background:
    rgba(0, 0, 0, 0.54);
  backdrop-filter:
    blur(16px);
  animation:
    playground-history-fade
    160ms ease-out;
}

.playground-history-panel {
  width:
    min(940px, 96vw);
  height:
    min(700px, 88vh);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid
    rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  background:
    rgba(14, 14, 16, 0.98);
  color: #fff;
  box-shadow:
    0 36px 100px
    rgba(0, 0, 0, 0.58);
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  animation:
    playground-history-rise
    210ms
    cubic-bezier(
      0.22,
      1,
      0.36,
      1
    );
}

.playground-history-panel__header {
  min-height: 88px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 20px 24px;
  border-bottom: 1px solid
    rgba(255, 255, 255, 0.08);
}

.playground-history-panel__eyebrow {
  margin: 0 0 4px;
  color:
    rgba(255, 255, 255, 0.4);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.playground-history-panel__header h2 {
  margin: 0;
  font-size: 25px;
  font-weight: 680;
  letter-spacing: -0.035em;
}

.playground-history-panel__header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.playground-history-panel__status {
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  padding: 0 11px;
  border-radius: 999px;
  background:
    rgba(255, 255, 255, 0.055);
  color:
    rgba(255, 255, 255, 0.5);
  font-size: 11px;
}

.playground-history-panel__status--saved,
.playground-history-panel__status--restored {
  color: #a8efbb;
  background:
    rgba(62, 180, 95, 0.12);
}

.playground-history-panel__status--error {
  color: #ffb4b4;
  background:
    rgba(221, 70, 70, 0.13);
}

.playground-history-panel__close {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background:
    rgba(255, 255, 255, 0.07);
  color:
    rgba(255, 255, 255, 0.72);
  font-size: 20px;
  cursor: pointer;
}

.playground-history-panel__toolbar {
  min-height: 55px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  border-bottom: 1px solid
    rgba(255, 255, 255, 0.07);
}

.playground-history-panel__toolbar button,
.playground-history-panel__snapshot-bar button {
  min-height: 34px;
  padding: 0 13px;
  border: 1px solid
    rgba(255, 255, 255, 0.1);
  border-radius: 9px;
  background:
    rgba(255, 255, 255, 0.055);
  color:
    rgba(255, 255, 255, 0.82);
  font: inherit;
  font-size: 11px;
  font-weight: 650;
  cursor: pointer;
}

.playground-history-panel__toolbar button:hover {
  background:
    rgba(255, 255, 255, 0.1);
}

.playground-history-panel__toolbar-spacer {
  flex: 1;
}

.playground-history-panel__shortcut {
  color:
    rgba(255, 255, 255, 0.34);
  font-size: 11px;
}

.playground-history-panel__snapshot-bar {
  display: flex;
  gap: 8px;
  padding: 12px 24px;
  border-bottom: 1px solid
    rgba(255, 255, 255, 0.07);
}

.playground-history-panel__snapshot-bar input {
  min-width: 0;
  flex: 1;
  height: 36px;
  padding: 0 12px;
  border: 1px solid
    rgba(255, 255, 255, 0.1);
  border-radius: 9px;
  outline: none;
  background:
    rgba(255, 255, 255, 0.04);
  color: #fff;
  font: inherit;
  font-size: 11px;
}

.playground-history-panel__snapshot-bar input:focus {
  border-color:
    rgba(255, 255, 255, 0.25);
}

.playground-history-panel__snapshot-bar button {
  background: #f4f4f4;
  color: #111;
}

.playground-history-panel__body {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns:
    minmax(0, 1fr)
    280px;
}

.playground-history-panel__timeline {
  overflow-y: auto;
  padding: 14px;
}

.playground-history-entry {
  display: grid;
  grid-template-columns:
    minmax(0, 1fr)
    auto;
  align-items: center;
  margin-bottom: 7px;
  padding: 7px;
  border: 1px solid
    transparent;
  border-radius: 13px;
  background:
    rgba(255, 255, 255, 0.025);
}

.playground-history-entry:hover {
  background:
    rgba(255, 255, 255, 0.05);
}

.playground-history-entry--selected {
  border-color:
    rgba(255, 255, 255, 0.15);
  background:
    rgba(255, 255, 255, 0.075);
}

.playground-history-entry__main {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.playground-history-entry__icon {
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background:
    rgba(255, 255, 255, 0.06);
  color:
    rgba(255, 255, 255, 0.63);
  font-size: 17px;
}

.playground-history-entry__icon--snapshot {
  color: #c8c8ff;
}

.playground-history-entry__icon--undo,
.playground-history-entry__icon--redo {
  color: #b9e5ff;
}

.playground-history-entry__icon--recovery,
.playground-history-entry__icon--restore {
  color: #b8f0c5;
}

.playground-history-entry__content {
  min-width: 0;
  display: grid;
  gap: 5px;
}

.playground-history-entry__content strong {
  overflow: hidden;
  color:
    rgba(255, 255, 255, 0.9);
  font-size: 12px;
  font-weight: 630;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.playground-history-entry__content small {
  color:
    rgba(255, 255, 255, 0.38);
  font-size: 9px;
}

.playground-history-entry__delete {
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color:
    rgba(255, 255, 255, 0.32);
  cursor: pointer;
}

.playground-history-entry__delete:hover {
  background:
    rgba(218, 70, 70, 0.12);
  color: #ff9c9c;
}

.playground-history-panel__details {
  position: relative;
  min-width: 0;
  padding: 22px;
  border-left: 1px solid
    rgba(255, 255, 255, 0.07);
  background:
    rgba(255, 255, 255, 0.016);
}

.playground-history-panel__preview {
  height: 130px;
  display: grid;
  place-items: center;
  margin-bottom: 18px;
  border: 1px solid
    rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  background:
    radial-gradient(
      circle at 34% 24%,
      rgba(255, 255, 255, 0.12),
      transparent 43%
    ),
    rgba(255, 255, 255, 0.025);
  color:
    rgba(255, 255, 255, 0.32);
  font-size: 34px;
}

.playground-history-panel__detail-label {
  margin: 0 0 5px;
  color:
    rgba(255, 255, 255, 0.35);
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.playground-history-panel__details h3 {
  margin: 0 0 18px;
  font-size: 16px;
  font-weight: 650;
}

.playground-history-panel__details dl {
  margin: 0 0 20px;
}

.playground-history-panel__details dl div {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 9px 0;
  border-bottom: 1px solid
    rgba(255, 255, 255, 0.055);
}

.playground-history-panel__details dt {
  color:
    rgba(255, 255, 255, 0.38);
  font-size: 10px;
}

.playground-history-panel__details dd {
  margin: 0;
  color:
    rgba(255, 255, 255, 0.73);
  font-size: 10px;
  text-align: right;
}

.playground-history-panel__restore {
  width: 100%;
  min-height: 36px;
  border: 1px solid
    rgba(255, 255, 255, 0.18);
  border-radius: 9px;
  background: #f4f4f4;
  color: #111;
  font: inherit;
  font-size: 11px;
  font-weight: 650;
  cursor: pointer;
}

.playground-history-panel__clear {
  position: absolute;
  right: 22px;
  bottom: 20px;
  left: 22px;
  min-height: 32px;
  border: 0;
  background: transparent;
  color:
    rgba(255, 140, 140, 0.64);
  font: inherit;
  font-size: 10px;
  cursor: pointer;
}

.playground-history-panel__clear:hover {
  color: #ffaaaa;
}

.playground-history-panel__empty,
.playground-history-panel__details-empty {
  height: 100%;
  display: grid;
  place-items: center;
  align-content: center;
  color:
    rgba(255, 255, 255, 0.36);
  text-align: center;
}

.playground-history-panel__empty span {
  margin-bottom: 12px;
  font-size: 30px;
}

.playground-history-panel__empty h3 {
  margin: 0 0 7px;
  color:
    rgba(255, 255, 255, 0.72);
  font-size: 14px;
}

.playground-history-panel__empty p {
  max-width: 290px;
  margin: 0;
  font-size: 11px;
  line-height: 1.55;
}

@keyframes playground-history-fade {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes playground-history-rise {
  from {
    opacity: 0;
    transform:
      translateY(16px)
      scale(0.985);
  }

  to {
    opacity: 1;
    transform:
      translateY(0)
      scale(1);
  }
}

@media (max-width: 800px) {
  .playground-history-panel__body {
    grid-template-columns: 1fr;
  }

  .playground-history-panel__details {
    display: none;
  }
}

@media (max-width: 620px) {
  .playground-history-overlay {
    padding: 10px;
  }

  .playground-history-panel {
    width: 100%;
    height: 94vh;
    border-radius: 18px;
  }

  .playground-history-panel__header {
    padding: 16px;
  }

  .playground-history-panel__status {
    display: none;
  }

  .playground-history-panel__toolbar,
  .playground-history-panel__snapshot-bar {
    padding-right: 16px;
    padding-left: 16px;
  }

  .playground-history-launcher {
    right: 10px;
    bottom: 116px;
  }
}
EOF

# ------------------------------------------------------------
# Public exports
# ------------------------------------------------------------

cat > src/collaboration/history/index.ts <<'EOF'
export {
  default as VisualHistoryPanel,
} from "./VisualHistoryPanel";

export {
  addHistoryEntry,
  clearHistoryEntries,
  createHistoryEntry,
  loadHistoryEntries,
  removeHistoryEntry,
  restoreHistoryEntry,
  saveHistoryEntries,
} from "./historyStorage";

export type {
  HistoryEntryKind,
  HistoryPanelStatus,
  PlaygroundHistoryEntry,
} from "./types";
EOF

# ------------------------------------------------------------
# Mount VisualHistoryPanel in main.tsx
# ------------------------------------------------------------

python3 <<'PY'
from pathlib import Path


def insert_import(
    source: str,
    statement: str,
    identity: str,
) -> str:
    if identity in source:
        return source

    lines = source.splitlines(
        keepends=True,
    )

    last_import_end = -1
    inside_import = False

    for index, line in enumerate(lines):
        stripped = line.strip()

        if not inside_import:
            if stripped.startswith("import "):
                inside_import = True
                last_import_end = index

                if stripped.endswith(";"):
                    inside_import = False

                continue

            if (
                stripped == ""
                or stripped.startswith("//")
                or stripped.startswith("/*")
            ):
                continue

            break

        last_import_end = index

        if stripped.endswith(";"):
            inside_import = False

    insertion_index = (
        last_import_end + 1
        if last_import_end >= 0
        else 0
    )

    lines.insert(
        insertion_index,
        statement,
    )

    return "".join(lines)


path = Path("src/main.tsx")
text = path.read_text()

text = insert_import(
    text,
    (
        'import VisualHistoryPanel '
        'from "./collaboration/history/VisualHistoryPanel";\n'
    ),
    'from "./collaboration/history/VisualHistoryPanel"',
)

if "<VisualHistoryPanel />" not in text:
    anchors = [
        "<SessionManager />",
        "<SessionControls />",
        "<PersistentSessionBridge />",
        "<SharedRecoveryBridge />",
        "<EditorMutationAdapter />",
        "<SharedMutationBridge />",
        "<App />",
    ]

    selected_anchor = next(
        (
            anchor
            for anchor in anchors
            if anchor in text
        ),
        None,
    )

    if selected_anchor is None:
        raise SystemExit(
            "❌ No suitable VisualHistoryPanel mount location was found in src/main.tsx."
        )

    text = text.replace(
        selected_anchor,
        (
            selected_anchor
            + "\n                "
            + "<VisualHistoryPanel />"
        ),
        1,
    )

path.write_text(text)

print("✅ VisualHistoryPanel imported.")
print("✅ VisualHistoryPanel mounted.")
PY

echo ""
echo "Running clean build..."
echo ""

npm run build

touch "$MARKER"

trap - EXIT

echo ""
echo "✅ Sprint $SPRINT_ID installed successfully."
echo "✅ Clean build completed."
echo ""
echo "Backup:"
echo "  $BACKUP_DIR"
echo ""
echo "Visual History features:"
echo "  • Undo and redo controls"
echo "  • Named snapshots"
echo "  • Restore any entry"
echo "  • Automatic recovery activity"
echo "  • Automatic resync activity"
echo "  • Restore history"
echo "  • Entry deletion"
echo "  • Clear history"
echo "  • Command/Ctrl + H shortcut"
echo ""
echo "Launch the Tauri app with:"
echo "  ./open-playground-tauri.sh"
