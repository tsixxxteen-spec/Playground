#!/usr/bin/env bash

set -euo pipefail

SPRINT_ID="21B.11A"
MARKER=".playground-sprint-21B11A-installed"
BACKUP_DIR=".playground-backups/sprint-21B11A-$(date +%Y%m%d-%H%M%S)"

fail() {
  echo "❌ $*" >&2
  exit 1
}

[[ -f package.json ]] || fail "Run this installer from the worlds project root."
[[ -f src/main.tsx ]] || fail "src/main.tsx was not found."
[[ -f src/collaboration/persistence/types.ts ]] || fail "Persistence types were not found."
[[ -f src/collaboration/persistence/checkpointStorage.ts ]] || fail "Checkpoint storage was not found."
[[ -f src/collaboration/persistence/events.ts ]] || fail "Persistence events were not found."

if [[ -f "$MARKER" ]]; then
  echo "✅ Sprint $SPRINT_ID is already installed."
  exit 0
fi

mkdir -p "$BACKUP_DIR"
mkdir -p src/collaboration/session-manager

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

    rm -rf src/collaboration/session-manager
    rm -f "$MARKER"

    echo "✅ Rollback complete."
  fi

  exit "$code"
}

trap rollback EXIT

# ------------------------------------------------------------
# Session manager types
# ------------------------------------------------------------

cat > src/collaboration/session-manager/types.ts <<'EOF'
import type {
  PlaygroundSessionCheckpoint,
} from "../persistence/types";

export type ManagedSession =
  PlaygroundSessionCheckpoint & {
    name?: string;
  };

export type SessionSaveStatus =
  | "saved"
  | "saving"
  | "error"
  | "idle";
EOF

# ------------------------------------------------------------
# Session manager storage
# ------------------------------------------------------------

cat > src/collaboration/session-manager/sessionStorage.ts <<'EOF'
import {
  isCheckpoint,
} from "../persistence/checkpointStorage";

import type {
  ManagedSession,
} from "./types";

const STORAGE_PREFIX =
  "playground:shared-session:";

function createSessionId(): string {
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

function sanitizeName(
  name: string,
): string {
  const trimmed =
    name.trim();

  return trimmed ||
    "Untitled Session";
}

export function getDefaultSessionName(
  session: ManagedSession,
): string {
  if (
    session.name &&
    session.name.trim()
  ) {
    return session.name.trim();
  }

  const pathParts =
    session.pathname
      .split("/")
      .filter(Boolean);

  const pathname =
    pathParts.length > 0
      ? pathParts[
          pathParts.length - 1
        ]
      : undefined;

  return pathname
    ? `${pathname} Session`
    : "Playground Session";
}

export function listManagedSessions(): ManagedSession[] {
  const sessions:
    ManagedSession[] = [];

  for (
    let index = 0;
    index < localStorage.length;
    index += 1
  ) {
    const key =
      localStorage.key(index);

    if (
      !key ||
      !key.startsWith(STORAGE_PREFIX)
    ) {
      continue;
    }

    const raw =
      localStorage.getItem(key);

    if (!raw) {
      continue;
    }

    try {
      const parsed: unknown =
        JSON.parse(raw);

      if (!isCheckpoint(parsed)) {
        continue;
      }

      sessions.push({
        ...parsed,
        storageKey: key,
      });
    } catch {
      continue;
    }
  }

  return sessions.sort(
    (left, right) =>
      right.updatedAt -
      left.updatedAt,
  );
}

export function saveManagedSession(
  session: ManagedSession,
): void {
  localStorage.setItem(
    session.storageKey,
    JSON.stringify(session),
  );
}

export function renameManagedSession(
  session: ManagedSession,
  nextName: string,
): ManagedSession {
  const renamed: ManagedSession = {
    ...session,
    name:
      sanitizeName(nextName),
    updatedAt:
      Date.now(),
  };

  saveManagedSession(renamed);

  return renamed;
}

export function duplicateManagedSession(
  session: ManagedSession,
): ManagedSession {
  const now =
    Date.now();

  const duplicateId =
    createSessionId();

  const duplicate:
    ManagedSession = {
      ...session,
      id:
        duplicateId,
      name:
        `${getDefaultSessionName(session)} Copy`,
      storageKey:
        `${STORAGE_PREFIX}saved:${duplicateId}`,
      createdAt:
        now,
      updatedAt:
        now,
    };

  saveManagedSession(duplicate);

  return duplicate;
}

export function deleteManagedSession(
  session: ManagedSession,
): void {
  localStorage.removeItem(
    session.storageKey,
  );
}

export function importManagedSession(
  json: string,
): ManagedSession {
  const parsed: unknown =
    JSON.parse(json);

  if (!isCheckpoint(parsed)) {
    throw new Error(
      "This file is not a valid Playground session.",
    );
  }

  const now =
    Date.now();

  const importId =
    createSessionId();

  const imported:
    ManagedSession = {
      ...parsed,
      id:
        importId,
      name:
        (
          parsed as ManagedSession
        ).name ||
        "Imported Session",
      storageKey:
        `${STORAGE_PREFIX}imported:${importId}`,
      createdAt:
        now,
      updatedAt:
        now,
  };

  saveManagedSession(imported);

  return imported;
}

export function exportManagedSession(
  session: ManagedSession,
): void {
  const blob =
    new Blob(
      [
        JSON.stringify(
          session,
          null,
          2,
        ),
      ],
      {
        type:
          "application/json",
      },
    );

  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  const safeName =
    getDefaultSessionName(session)
      .replace(
        /[^a-z0-9-_]+/gi,
        "-",
      )
      .replace(
        /^-+|-+$/g,
        "",
      )
      .toLowerCase() ||
    "playground-session";

  anchor.href = url;
  anchor.download =
    `${safeName}.json`;

  document.body.appendChild(
    anchor,
  );

  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

export function getSessionSize(
  session: ManagedSession,
): number {
  return new Blob([
    JSON.stringify(session),
  ]).size;
}
EOF

# ------------------------------------------------------------
# Session manager component
# ------------------------------------------------------------

cat > src/collaboration/session-manager/SessionManager.tsx <<'EOF'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  ChangeEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";

import {
  PLAYGROUND_CHECKPOINT_ERROR_EVENT,
  PLAYGROUND_CHECKPOINT_SAVED_EVENT,
  PLAYGROUND_IMPORT_SESSION_EVENT,
} from "../persistence/events";

import {
  deleteManagedSession,
  duplicateManagedSession,
  exportManagedSession,
  getDefaultSessionName,
  getSessionSize,
  importManagedSession,
  listManagedSessions,
  renameManagedSession,
} from "./sessionStorage";

import type {
  ManagedSession,
  SessionSaveStatus,
} from "./types";

import "./session-manager.css";

const REFRESH_INTERVAL_MS =
  2_000;

function formatRelativeTime(
  timestamp: number,
): string {
  const difference =
    Date.now() - timestamp;

  if (difference < 10_000) {
    return "just now";
  }

  const minutes =
    Math.floor(
      difference / 60_000,
    );

  if (minutes < 1) {
    return "less than a minute ago";
  }

  if (minutes === 1) {
    return "1 minute ago";
  }

  if (minutes < 60) {
    return `${minutes} minutes ago`;
  }

  const hours =
    Math.floor(
      minutes / 60,
    );

  if (hours === 1) {
    return "1 hour ago";
  }

  if (hours < 24) {
    return `${hours} hours ago`;
  }

  const days =
    Math.floor(
      hours / 24,
    );

  if (days === 1) {
    return "yesterday";
  }

  if (days < 7) {
    return `${days} days ago`;
  }

  return new Date(timestamp)
    .toLocaleDateString(
      undefined,
      {
        month: "short",
        day: "numeric",
        year:
          new Date(timestamp)
            .getFullYear() !==
          new Date()
            .getFullYear()
            ? "numeric"
            : undefined,
      },
    );
}

function formatSize(
  bytes: number,
): string {
  if (bytes < 1_024) {
    return `${bytes} B`;
  }

  if (bytes < 1_048_576) {
    return `${(
      bytes / 1_024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes / 1_048_576
  ).toFixed(1)} MB`;
}

function restoreSession(
  session: ManagedSession,
): void {
  document.dispatchEvent(
    new CustomEvent(
      PLAYGROUND_IMPORT_SESSION_EVENT,
      {
        detail: {
          checkpoint:
            session,
        },
      },
    ),
  );
}

export default function SessionManager() {
  const [
    isOpen,
    setIsOpen,
  ] = useState(false);

  const [
    sessions,
    setSessions,
  ] = useState<
    ManagedSession[]
  >([]);

  const [
    selectedId,
    setSelectedId,
  ] = useState<
    string | null
  >(null);

  const [
    renamingId,
    setRenamingId,
  ] = useState<
    string | null
  >(null);

  const [
    renameValue,
    setRenameValue,
  ] = useState("");

  const [
    saveStatus,
    setSaveStatus,
  ] = useState<
    SessionSaveStatus
  >("idle");

  const [
    statusMessage,
    setStatusMessage,
  ] = useState(
    "Autosave active",
  );

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const renameInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const refreshSessions =
    useCallback(() => {
      const nextSessions =
        listManagedSessions();

      setSessions(nextSessions);

      setSelectedId(
        (current) => {
          if (
            current &&
            nextSessions.some(
              (session) =>
                session.id ===
                current,
            )
          ) {
            return current;
          }

          return (
            nextSessions[0]?.id ??
            null
          );
        },
      );
    }, []);

  useEffect(() => {
    refreshSessions();

    const interval =
      window.setInterval(
        refreshSessions,
        REFRESH_INTERVAL_MS,
      );

    const handleStorage =
      () => {
        refreshSessions();
      };

    window.addEventListener(
      "storage",
      handleStorage,
    );

    return () => {
      window.clearInterval(
        interval,
      );

      window.removeEventListener(
        "storage",
        handleStorage,
      );
    };
  }, [refreshSessions]);

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
          "j"
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
        setRenamingId(null);
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
    let timeout:
      number | undefined;

    const showSaved =
      () => {
        setSaveStatus(
          "saved",
        );

        setStatusMessage(
          "Saved just now",
        );

        refreshSessions();

        timeout =
          window.setTimeout(() => {
            setSaveStatus(
              "idle",
            );

            setStatusMessage(
              "Autosave active",
            );
          }, 2_500);
      };

    const showError = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<{
          message?: string;
        }>;

      setSaveStatus(
        "error",
      );

      setStatusMessage(
        customEvent.detail
          ?.message ||
        "Save failed",
      );
    };

    document.addEventListener(
      PLAYGROUND_CHECKPOINT_SAVED_EVENT,
      showSaved,
    );

    document.addEventListener(
      PLAYGROUND_CHECKPOINT_ERROR_EVENT,
      showError,
    );

    return () => {
      document.removeEventListener(
        PLAYGROUND_CHECKPOINT_SAVED_EVENT,
        showSaved,
      );

      document.removeEventListener(
        PLAYGROUND_CHECKPOINT_ERROR_EVENT,
        showError,
      );

      if (timeout) {
        window.clearTimeout(
          timeout,
        );
      }
    };
  }, [refreshSessions]);

  useEffect(() => {
    if (
      renamingId &&
      renameInputRef.current
    ) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const selectedSession =
    useMemo(
      () =>
        sessions.find(
          (session) =>
            session.id ===
            selectedId,
        ) ?? null,
      [
        selectedId,
        sessions,
      ],
    );

  const handleOpenSession =
    (
      session:
        ManagedSession,
    ) => {
      restoreSession(session);

      setSelectedId(
        session.id,
      );

      setStatusMessage(
        `Opened ${getDefaultSessionName(
          session,
        )}`,
      );

      setSaveStatus(
        "saved",
      );
    };

  const handleStartRename =
    (
      session:
        ManagedSession,
    ) => {
      setRenamingId(
        session.id,
      );

      setRenameValue(
        getDefaultSessionName(
          session,
        ),
      );
    };

  const handleCommitRename =
    (
      session:
        ManagedSession,
    ) => {
      renameManagedSession(
        session,
        renameValue,
      );

      setRenamingId(null);
      refreshSessions();
    };

  const handleRenameKeyDown =
    (
      event:
        ReactKeyboardEvent<HTMLInputElement>,
      session:
        ManagedSession,
    ) => {
      if (
        event.key === "Enter"
      ) {
        event.preventDefault();

        handleCommitRename(
          session,
        );
      }

      if (
        event.key === "Escape"
      ) {
        setRenamingId(null);
      }
    };

  const handleDuplicate =
    (
      session:
        ManagedSession,
    ) => {
      const duplicate =
        duplicateManagedSession(
          session,
        );

      refreshSessions();

      setSelectedId(
        duplicate.id,
      );

      setStatusMessage(
        "Session duplicated",
      );

      setSaveStatus(
        "saved",
      );
    };

  const handleDelete =
    (
      session:
        ManagedSession,
    ) => {
      const confirmed =
        window.confirm(
          `Delete “${getDefaultSessionName(
            session,
          )}”? This cannot be undone.`,
        );

      if (!confirmed) {
        return;
      }

      deleteManagedSession(
        session,
      );

      refreshSessions();

      setStatusMessage(
        "Session deleted",
      );

      setSaveStatus(
        "idle",
      );
    };

  const handleImport = async (
    event:
      ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const json =
        await file.text();

      const imported =
        importManagedSession(
          json,
        );

      refreshSessions();

      setSelectedId(
        imported.id,
      );

      setStatusMessage(
        "Session imported",
      );

      setSaveStatus(
        "saved",
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Import failed",
      );

      setSaveStatus(
        "error",
      );
    }
  };

  return (
    <>
      <button
        type="button"
        className="playground-session-launcher"
        onClick={() => {
          setIsOpen(true);
        }}
        aria-label="Open session manager"
        title="Session Manager — Command/Ctrl + J"
      >
        <span
          className="playground-session-launcher__icon"
          aria-hidden="true"
        >
          ◫
        </span>

        <span>
          Sessions
        </span>
      </button>

      {isOpen && (
        <div
          className="playground-session-overlay"
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
            className="playground-session-manager"
            role="dialog"
            aria-modal="true"
            aria-label="Session Manager"
          >
            <header className="playground-session-manager__header">
              <div>
                <p className="playground-session-manager__eyebrow">
                  Playground
                </p>

                <h2 className="playground-session-manager__title">
                  Sessions
                </h2>
              </div>

              <div className="playground-session-manager__header-actions">
                <div
                  className={`playground-session-manager__save-status playground-session-manager__save-status--${saveStatus}`}
                >
                  <span
                    className="playground-session-manager__status-dot"
                    aria-hidden="true"
                  />

                  {statusMessage}
                </div>

                <button
                  type="button"
                  className="playground-session-manager__close"
                  onClick={() => {
                    setIsOpen(false);
                  }}
                  aria-label="Close session manager"
                >
                  ×
                </button>
              </div>
            </header>

            <div className="playground-session-manager__toolbar">
              <button
                type="button"
                className="playground-session-manager__primary-button"
                onClick={() => {
                  fileInputRef.current
                    ?.click();
                }}
              >
                Import session
              </button>

              <button
                type="button"
                className="playground-session-manager__secondary-button"
                disabled={
                  !selectedSession
                }
                onClick={() => {
                  if (
                    selectedSession
                  ) {
                    exportManagedSession(
                      selectedSession,
                    );
                  }
                }}
              >
                Export selected
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="playground-session-manager__hidden-input"
                onChange={handleImport}
              />

              <span className="playground-session-manager__shortcut">
                ⌘J
              </span>
            </div>

            <div className="playground-session-manager__content">
              <div className="playground-session-manager__list">
                {sessions.length === 0 ? (
                  <div className="playground-session-manager__empty">
                    <div
                      className="playground-session-manager__empty-icon"
                      aria-hidden="true"
                    >
                      ◫
                    </div>

                    <h3>
                      No saved sessions
                    </h3>

                    <p>
                      Playground will create one automatically after you edit your world.
                    </p>
                  </div>
                ) : (
                  sessions.map(
                    (session) => {
                      const selected =
                        session.id ===
                        selectedId;

                      const renaming =
                        session.id ===
                        renamingId;

                      return (
                        <article
                          key={
                            session.storageKey
                          }
                          className={
                            selected
                              ? "playground-session-card playground-session-card--selected"
                              : "playground-session-card"
                          }
                          onClick={() => {
                            setSelectedId(
                              session.id,
                            );
                          }}
                        >
                          <button
                            type="button"
                            className="playground-session-card__main"
                            onDoubleClick={() => {
                              handleOpenSession(
                                session,
                              );
                            }}
                            onClick={() => {
                              setSelectedId(
                                session.id,
                              );
                            }}
                          >
                            <div className="playground-session-card__preview">
                              <span
                                aria-hidden="true"
                              >
                                ◇
                              </span>
                            </div>

                            <div className="playground-session-card__content">
                              {renaming ? (
                                <input
                                  ref={
                                    renameInputRef
                                  }
                                  value={
                                    renameValue
                                  }
                                  className="playground-session-card__rename-input"
                                  onChange={(
                                    event,
                                  ) => {
                                    setRenameValue(
                                      event
                                        .target
                                        .value,
                                    );
                                  }}
                                  onBlur={() => {
                                    handleCommitRename(
                                      session,
                                    );
                                  }}
                                  onKeyDown={(
                                    event,
                                  ) => {
                                    handleRenameKeyDown(
                                      event,
                                      session,
                                    );
                                  }}
                                  onClick={(
                                    event,
                                  ) => {
                                    event.stopPropagation();
                                  }}
                                />
                              ) : (
                                <h3 className="playground-session-card__name">
                                  {getDefaultSessionName(
                                    session,
                                  )}
                                </h3>
                              )}

                              <div className="playground-session-card__metadata">
                                <span>
                                  {
                                    session
                                      .objects
                                      .length
                                  }{" "}
                                  objects
                                </span>

                                <span>
                                  {formatSize(
                                    getSessionSize(
                                      session,
                                    ),
                                  )}
                                </span>

                                <span>
                                  Updated{" "}
                                  {formatRelativeTime(
                                    session.updatedAt,
                                  )}
                                </span>
                              </div>
                            </div>
                          </button>

                          <div className="playground-session-card__actions">
                            <button
                              type="button"
                              onClick={(
                                event,
                              ) => {
                                event.stopPropagation();

                                handleOpenSession(
                                  session,
                                );
                              }}
                            >
                              Open
                            </button>

                            <button
                              type="button"
                              onClick={(
                                event,
                              ) => {
                                event.stopPropagation();

                                handleStartRename(
                                  session,
                                );
                              }}
                            >
                              Rename
                            </button>

                            <button
                              type="button"
                              onClick={(
                                event,
                              ) => {
                                event.stopPropagation();

                                handleDuplicate(
                                  session,
                                );
                              }}
                            >
                              Duplicate
                            </button>

                            <button
                              type="button"
                              onClick={(
                                event,
                              ) => {
                                event.stopPropagation();

                                exportManagedSession(
                                  session,
                                );
                              }}
                            >
                              Export
                            </button>

                            <button
                              type="button"
                              className="playground-session-card__delete"
                              onClick={(
                                event,
                              ) => {
                                event.stopPropagation();

                                handleDelete(
                                  session,
                                );
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </article>
                      );
                    },
                  )
                )}
              </div>

              <aside className="playground-session-manager__details">
                {selectedSession ? (
                  <>
                    <div className="playground-session-manager__detail-preview">
                      <span
                        aria-hidden="true"
                      >
                        ◇
                      </span>
                    </div>

                    <h3>
                      {getDefaultSessionName(
                        selectedSession,
                      )}
                    </h3>

                    <dl>
                      <div>
                        <dt>
                          Objects
                        </dt>

                        <dd>
                          {
                            selectedSession
                              .objects
                              .length
                          }
                        </dd>
                      </div>

                      <div>
                        <dt>
                          Modified
                        </dt>

                        <dd>
                          {new Date(
                            selectedSession.updatedAt,
                          ).toLocaleString()}
                        </dd>
                      </div>

                      <div>
                        <dt>
                          Created
                        </dt>

                        <dd>
                          {new Date(
                            selectedSession.createdAt,
                          ).toLocaleString()}
                        </dd>
                      </div>

                      <div>
                        <dt>
                          Size
                        </dt>

                        <dd>
                          {formatSize(
                            getSessionSize(
                              selectedSession,
                            ),
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt>
                          Version
                        </dt>

                        <dd>
                          {
                            selectedSession.version
                          }
                        </dd>
                      </div>
                    </dl>

                    <button
                      type="button"
                      className="playground-session-manager__open-button"
                      onClick={() => {
                        handleOpenSession(
                          selectedSession,
                        );
                      }}
                    >
                      Open session
                    </button>
                  </>
                ) : (
                  <div className="playground-session-manager__details-empty">
                    Select a session to see its details.
                  </div>
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
# Session manager styling
# ------------------------------------------------------------

cat > src/collaboration/session-manager/session-manager.css <<'EOF'
.playground-session-launcher {
  position: fixed;
  right: 18px;
  bottom: 72px;
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
  letter-spacing: 0.01em;
  cursor: pointer;
  box-shadow:
    0 12px 36px
    rgba(0, 0, 0, 0.32);
  backdrop-filter:
    blur(18px);
}

.playground-session-launcher:hover {
  background:
    rgba(28, 28, 31, 0.98);
  transform:
    translateY(-1px);
}

.playground-session-launcher__icon {
  font-size: 16px;
  opacity: 0.76;
}

.playground-session-overlay {
  position: fixed;
  inset: 0;
  z-index: 12000;
  display: grid;
  place-items: center;
  padding: 28px;
  background:
    rgba(0, 0, 0, 0.54);
  backdrop-filter:
    blur(16px);
  animation:
    playground-session-fade-in
    160ms ease-out;
}

.playground-session-manager {
  width:
    min(1040px, 96vw);
  height:
    min(720px, 88vh);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid
    rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  background:
    rgba(14, 14, 16, 0.975);
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
    playground-session-rise
    210ms
    cubic-bezier(
      0.22,
      1,
      0.36,
      1
    );
}

.playground-session-manager__header {
  min-height: 92px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 20px 24px;
  border-bottom: 1px solid
    rgba(255, 255, 255, 0.08);
}

.playground-session-manager__eyebrow {
  margin: 0 0 4px;
  color:
    rgba(255, 255, 255, 0.4);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.playground-session-manager__title {
  margin: 0;
  font-size: 26px;
  font-weight: 680;
  letter-spacing: -0.035em;
}

.playground-session-manager__header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.playground-session-manager__save-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 32px;
  padding: 0 11px;
  border-radius: 999px;
  background:
    rgba(255, 255, 255, 0.055);
  color:
    rgba(255, 255, 255, 0.56);
  font-size: 11px;
}

.playground-session-manager__status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background:
    rgba(255, 255, 255, 0.32);
}

.playground-session-manager__save-status--saved {
  color: #a8efbb;
  background:
    rgba(62, 180, 95, 0.12);
}

.playground-session-manager__save-status--saved
.playground-session-manager__status-dot {
  background: #75da91;
}

.playground-session-manager__save-status--saving
.playground-session-manager__status-dot {
  background: #f4c76a;
}

.playground-session-manager__save-status--error {
  color: #ffb4b4;
  background:
    rgba(221, 70, 70, 0.13);
}

.playground-session-manager__save-status--error
.playground-session-manager__status-dot {
  background: #f07b7b;
}

.playground-session-manager__close {
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
  line-height: 1;
  cursor: pointer;
}

.playground-session-manager__close:hover {
  background:
    rgba(255, 255, 255, 0.12);
  color: #fff;
}

.playground-session-manager__toolbar {
  min-height: 58px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  border-bottom: 1px solid
    rgba(255, 255, 255, 0.07);
}

.playground-session-manager__primary-button,
.playground-session-manager__secondary-button,
.playground-session-manager__open-button {
  min-height: 34px;
  padding: 0 13px;
  border-radius: 9px;
  font: inherit;
  font-size: 11px;
  font-weight: 650;
  cursor: pointer;
}

.playground-session-manager__primary-button,
.playground-session-manager__open-button {
  border: 1px solid
    rgba(255, 255, 255, 0.18);
  background: #f4f4f4;
  color: #111;
}

.playground-session-manager__secondary-button {
  border: 1px solid
    rgba(255, 255, 255, 0.1);
  background:
    rgba(255, 255, 255, 0.055);
  color:
    rgba(255, 255, 255, 0.82);
}

.playground-session-manager__secondary-button:disabled {
  opacity: 0.36;
  cursor: default;
}

.playground-session-manager__shortcut {
  margin-left: auto;
  color:
    rgba(255, 255, 255, 0.35);
  font-size: 11px;
}

.playground-session-manager__hidden-input {
  display: none;
}

.playground-session-manager__content {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns:
    minmax(0, 1fr)
    280px;
}

.playground-session-manager__list {
  min-width: 0;
  overflow-y: auto;
  padding: 14px;
}

.playground-session-card {
  display: grid;
  grid-template-columns:
    minmax(0, 1fr)
    auto;
  gap: 12px;
  align-items: center;
  margin-bottom: 8px;
  padding: 9px;
  border: 1px solid
    transparent;
  border-radius: 15px;
  background:
    rgba(255, 255, 255, 0.026);
  transition:
    border-color 140ms ease,
    background 140ms ease,
    transform 140ms ease;
}

.playground-session-card:hover {
  background:
    rgba(255, 255, 255, 0.05);
}

.playground-session-card--selected {
  border-color:
    rgba(255, 255, 255, 0.15);
  background:
    rgba(255, 255, 255, 0.075);
}

.playground-session-card__main {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.playground-session-card__preview {
  width: 58px;
  height: 48px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border: 1px solid
    rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  background:
    radial-gradient(
      circle at 30% 25%,
      rgba(255, 255, 255, 0.12),
      transparent 46%
    ),
    rgba(255, 255, 255, 0.035);
  color:
    rgba(255, 255, 255, 0.35);
  font-size: 20px;
}

.playground-session-card__content {
  min-width: 0;
}

.playground-session-card__name {
  margin: 0 0 7px;
  overflow: hidden;
  color:
    rgba(255, 255, 255, 0.91);
  font-size: 13px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.playground-session-card__metadata {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  color:
    rgba(255, 255, 255, 0.4);
  font-size: 10px;
}

.playground-session-card__rename-input {
  width:
    min(280px, 100%);
  height: 29px;
  margin-bottom: 5px;
  padding: 0 8px;
  border: 1px solid
    rgba(255, 255, 255, 0.22);
  border-radius: 7px;
  outline: none;
  background:
    rgba(0, 0, 0, 0.28);
  color: #fff;
  font: inherit;
  font-size: 12px;
}

.playground-session-card__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transition:
    opacity 120ms ease;
}

.playground-session-card:hover
.playground-session-card__actions,
.playground-session-card--selected
.playground-session-card__actions {
  opacity: 1;
}

.playground-session-card__actions button {
  min-height: 28px;
  padding: 0 8px;
  border: 0;
  border-radius: 7px;
  background:
    transparent;
  color:
    rgba(255, 255, 255, 0.48);
  font: inherit;
  font-size: 9px;
  cursor: pointer;
}

.playground-session-card__actions button:hover {
  background:
    rgba(255, 255, 255, 0.07);
  color:
    rgba(255, 255, 255, 0.9);
}

.playground-session-card__actions
.playground-session-card__delete:hover {
  color: #ff9b9b;
  background:
    rgba(219, 73, 73, 0.12);
}

.playground-session-manager__details {
  min-width: 0;
  padding: 22px;
  border-left: 1px solid
    rgba(255, 255, 255, 0.07);
  background:
    rgba(255, 255, 255, 0.016);
}

.playground-session-manager__detail-preview {
  height: 145px;
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
    rgba(255, 255, 255, 0.28);
  font-size: 34px;
}

.playground-session-manager__details h3 {
  margin: 0 0 18px;
  font-size: 16px;
  font-weight: 650;
}

.playground-session-manager__details dl {
  margin: 0 0 20px;
}

.playground-session-manager__details dl div {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 9px 0;
  border-bottom: 1px solid
    rgba(255, 255, 255, 0.055);
}

.playground-session-manager__details dt {
  color:
    rgba(255, 255, 255, 0.38);
  font-size: 10px;
}

.playground-session-manager__details dd {
  margin: 0;
  color:
    rgba(255, 255, 255, 0.73);
  font-size: 10px;
  text-align: right;
}

.playground-session-manager__open-button {
  width: 100%;
}

.playground-session-manager__details-empty,
.playground-session-manager__empty {
  display: grid;
  place-items: center;
  align-content: center;
  height: 100%;
  color:
    rgba(255, 255, 255, 0.38);
  text-align: center;
}

.playground-session-manager__empty {
  min-height: 380px;
}

.playground-session-manager__empty-icon {
  margin-bottom: 12px;
  font-size: 30px;
  opacity: 0.55;
}

.playground-session-manager__empty h3 {
  margin: 0 0 8px;
  color:
    rgba(255, 255, 255, 0.72);
  font-size: 14px;
}

.playground-session-manager__empty p {
  max-width: 300px;
  margin: 0;
  font-size: 11px;
  line-height: 1.55;
}

@keyframes playground-session-fade-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes playground-session-rise {
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

@media (max-width: 860px) {
  .playground-session-manager__content {
    grid-template-columns: 1fr;
  }

  .playground-session-manager__details {
    display: none;
  }

  .playground-session-card {
    grid-template-columns: 1fr;
  }

  .playground-session-card__actions {
    opacity: 1;
    padding-left: 71px;
  }
}

@media (max-width: 620px) {
  .playground-session-overlay {
    padding: 10px;
  }

  .playground-session-manager {
    width: 100%;
    height: 94vh;
    border-radius: 18px;
  }

  .playground-session-manager__header {
    min-height: 78px;
    padding: 16px;
  }

  .playground-session-manager__toolbar {
    padding: 10px 16px;
  }

  .playground-session-manager__save-status {
    display: none;
  }

  .playground-session-card__metadata {
    display: grid;
    gap: 3px;
  }

  .playground-session-card__actions {
    padding-left: 0;
    flex-wrap: wrap;
  }

  .playground-session-launcher {
    right: 10px;
    bottom: 64px;
  }
}
EOF

# ------------------------------------------------------------
# Public exports
# ------------------------------------------------------------

cat > src/collaboration/session-manager/index.ts <<'EOF'
export {
  default as SessionManager,
} from "./SessionManager";

export {
  deleteManagedSession,
  duplicateManagedSession,
  exportManagedSession,
  getDefaultSessionName,
  getSessionSize,
  importManagedSession,
  listManagedSessions,
  renameManagedSession,
  saveManagedSession,
} from "./sessionStorage";

export type {
  ManagedSession,
  SessionSaveStatus,
} from "./types";
EOF

# ------------------------------------------------------------
# Mount SessionManager in main.tsx
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
        'import SessionManager '
        'from "./collaboration/session-manager/SessionManager";\n'
    ),
    'from "./collaboration/session-manager/SessionManager"',
)

if "<SessionManager />" not in text:
    anchors = [
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
            "❌ No suitable SessionManager mount location was found in src/main.tsx."
        )

    text = text.replace(
        selected_anchor,
        (
            selected_anchor
            + "\n                "
            + "<SessionManager />"
        ),
        1,
    )

path.write_text(text)

print("✅ SessionManager imported.")
print("✅ SessionManager mounted.")
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
echo "Session Manager features:"
echo "  • Saved session browser"
echo "  • Open and restore"
echo "  • Rename"
echo "  • Duplicate"
echo "  • Delete"
echo "  • Export"
echo "  • Import"
echo "  • Autosave status"
echo "  • Object count"
echo "  • Storage size"
echo "  • Command/Ctrl + J shortcut"
echo ""
echo "Launch the Tauri app with:"
echo "  ./open-playground-tauri.sh"
