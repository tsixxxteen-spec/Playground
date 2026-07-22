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
