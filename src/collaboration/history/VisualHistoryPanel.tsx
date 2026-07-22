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
