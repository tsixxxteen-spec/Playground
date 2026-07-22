import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  collectDiagnosticChecks,
  createDiagnosticReport,
  formatDiagnosticReport,
} from "./diagnostics";

import type {
  DiagnosticActivity,
  DiagnosticActivityKind,
  DiagnosticCheck,
  DiagnosticHealthState,
} from "./types";

import "./collaboration-diagnostics-panel.css";

const MAX_ACTIVITY_ENTRIES =
  80;

const TRACKED_EVENTS = [
  "playground:undo",
  "playground:redo",
  "playground:undo-completed",
  "playground:redo-completed",
  "playground:history-restored",
  "playground:checkpoint-restored",
  "playground:session-resynced",
  "playground:mutation-recovered",
  "playground:collaboration-request",
  "playground:collaboration-snapshot",
  "playground:collaboration-user-joined",
  "playground:collaboration-user-updated",
  "playground:collaboration-user-left",
  "playground:collaboration-lock-updated",
  "playground:collaboration-connection",
  "playground:object-selected",
  "playground:object-focus",
  "playground:object-inspect",
  "playground:objects-changed",
];

function createId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID ===
      "function"
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

function stringifyDetail(
  value: unknown,
): string | undefined {
  if (
    value === undefined ||
    value === null
  ) {
    return undefined;
  }

  if (
    typeof value === "string"
  ) {
    return value;
  }

  try {
    return JSON.stringify(
      value,
      null,
      2,
    );
  } catch {
    return String(value);
  }
}

function getSummaryState(
  checks: DiagnosticCheck[],
): DiagnosticHealthState {
  if (
    checks.some(
      (check) =>
        check.state === "error",
    )
  ) {
    return "error";
  }

  if (
    checks.some(
      (check) =>
        check.state === "warning",
    )
  ) {
    return "warning";
  }

  return "healthy";
}

function getSummaryLabel(
  state:
    DiagnosticHealthState,
): string {
  switch (state) {
    case "healthy":
      return "Systems healthy";

    case "warning":
      return "Review recommended";

    case "error":
    default:
      return "Action required";
  }
}

function getActivitySymbol(
  kind:
    DiagnosticActivityKind,
): string {
  switch (kind) {
    case "error":
      return "!";

    case "warning":
      return "△";

    case "system":
      return "◇";

    case "event":
    default:
      return "·";
  }
}

function formatTime(
  timestamp: number,
): string {
  return new Date(timestamp)
    .toLocaleTimeString(
      undefined,
      {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      },
    );
}

export default function CollaborationDiagnosticsPanel() {
  const [
    isOpen,
    setIsOpen,
  ] = useState(false);

  const [
    checks,
    setChecks,
  ] = useState<
    DiagnosticCheck[]
  >([]);

  const [
    activity,
    setActivity,
  ] = useState<
    DiagnosticActivity[]
  >([]);

  const [
    copied,
    setCopied,
  ] = useState(false);

  const [
    lastCheckedAt,
    setLastCheckedAt,
  ] = useState(
    Date.now(),
  );

  const addActivity =
    useCallback(
      (
        kind:
          DiagnosticActivityKind,
        title: string,
        detail?: string,
      ) => {
        const entry:
          DiagnosticActivity = {
            id:
              createId(),
            kind,
            title,
            detail,
            timestamp:
              Date.now(),
          };

        setActivity(
          (current) =>
            [
              entry,
              ...current,
            ].slice(
              0,
              MAX_ACTIVITY_ENTRIES,
            ),
        );
      },
      [],
    );

  const refreshChecks =
    useCallback(() => {
      const next =
        collectDiagnosticChecks();

      setChecks(next);
      setLastCheckedAt(
        Date.now(),
      );
    }, []);

  useEffect(() => {
    refreshChecks();
  }, [refreshChecks]);

  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      const modifier =
        event.metaKey ||
        event.ctrlKey;

      if (
        modifier &&
        event.shiftKey &&
        event.key.toLowerCase() ===
          "d"
      ) {
        event.preventDefault();

        setIsOpen(
          (current) => {
            const next =
              !current;

            if (next) {
              window.setTimeout(
                refreshChecks,
                0,
              );
            }

            return next;
          },
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
  }, [refreshChecks]);

  useEffect(() => {
    const cleanups =
      TRACKED_EVENTS.map(
        (eventName) => {
          const handler =
            (event: Event) => {
              const customEvent =
                event as CustomEvent<
                  unknown
                >;

              addActivity(
                "event",
                eventName,
                stringifyDetail(
                  customEvent.detail,
                ),
              );
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
  }, [addActivity]);

  useEffect(() => {
    const handleError = (
      event: ErrorEvent,
    ) => {
      addActivity(
        "error",
        event.message ||
          "Runtime error",
        [
          event.filename,
          event.lineno
            ? `Line ${event.lineno}`
            : "",
          event.colno
            ? `Column ${event.colno}`
            : "",
        ]
          .filter(Boolean)
          .join(" · "),
      );
    };

    const handleUnhandledRejection =
      (
        event:
          PromiseRejectionEvent,
      ) => {
        addActivity(
          "error",
          "Unhandled promise rejection",
          stringifyDetail(
            event.reason,
          ),
        );
      };

    window.addEventListener(
      "error",
      handleError,
    );

    window.addEventListener(
      "unhandledrejection",
      handleUnhandledRejection,
    );

    return () => {
      window.removeEventListener(
        "error",
        handleError,
      );

      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
    };
  }, [addActivity]);

  useEffect(() => {
    const handleOnline =
      () => {
        addActivity(
          "system",
          "Runtime online",
        );

        refreshChecks();
      };

    const handleOffline =
      () => {
        addActivity(
          "warning",
          "Runtime offline",
        );

        refreshChecks();
      };

    window.addEventListener(
      "online",
      handleOnline,
    );

    window.addEventListener(
      "offline",
      handleOffline,
    );

    return () => {
      window.removeEventListener(
        "online",
        handleOnline,
      );

      window.removeEventListener(
        "offline",
        handleOffline,
      );
    };
  }, [
    addActivity,
    refreshChecks,
  ]);

  const summaryState =
    useMemo(
      () =>
        getSummaryState(
          checks,
        ),
      [checks],
    );

  const healthyCount =
    checks.filter(
      (check) =>
        check.state === "healthy",
    ).length;

  const warningCount =
    checks.filter(
      (check) =>
        check.state === "warning",
    ).length;

  const errorCount =
    checks.filter(
      (check) =>
        check.state === "error",
    ).length;

  const handleCopyReport =
    async () => {
      const report =
        createDiagnosticReport(
          checks,
          activity,
        );

      const text =
        formatDiagnosticReport(
          report,
        );

      try {
        await navigator.clipboard
          .writeText(text);

        setCopied(true);

        addActivity(
          "system",
          "Diagnostics copied",
        );

        window.setTimeout(
          () => {
            setCopied(false);
          },
          1_500,
        );
      } catch {
        addActivity(
          "error",
          "Could not copy diagnostics",
        );
      }
    };

  const triggerRecovery =
    () => {
      document.dispatchEvent(
        new CustomEvent(
          "playground:recovery-request",
        ),
      );

      addActivity(
        "system",
        "Recovery requested",
      );
    };

  const triggerResync =
    () => {
      document.dispatchEvent(
        new CustomEvent(
          "playground:collaboration-request",
        ),
      );

      document.dispatchEvent(
        new CustomEvent(
          "playground:session-resync-request",
        ),
      );

      addActivity(
        "system",
        "Session resync requested",
      );
    };

  return (
    <>
      {isOpen && (
        <div
          className="playground-diagnostics-overlay"
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
            className="playground-diagnostics-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Collaboration Diagnostics"
          >
            <header className="playground-diagnostics-panel__header">
              <div>
                <p className="playground-diagnostics-panel__eyebrow">
                  Playground Internal
                </p>

                <h2>
                  Collaboration Diagnostics
                </h2>
              </div>

              <div className="playground-diagnostics-panel__header-actions">
                <div
                  className={`playground-diagnostics-panel__health playground-diagnostics-panel__health--${summaryState}`}
                >
                  <span
                    aria-hidden="true"
                  />

                  {getSummaryLabel(
                    summaryState,
                  )}
                </div>

                <button
                  type="button"
                  className="playground-diagnostics-panel__close"
                  onClick={() => {
                    setIsOpen(false);
                  }}
                  aria-label="Close diagnostics"
                >
                  ×
                </button>
              </div>
            </header>

            <div className="playground-diagnostics-panel__summary">
              <div>
                <strong>
                  {healthyCount}
                </strong>

                <span>
                  Healthy
                </span>
              </div>

              <div>
                <strong>
                  {warningCount}
                </strong>

                <span>
                  Warnings
                </span>
              </div>

              <div>
                <strong>
                  {errorCount}
                </strong>

                <span>
                  Errors
                </span>
              </div>

              <div>
                <strong>
                  {activity.length}
                </strong>

                <span>
                  Events
                </span>
              </div>

              <p>
                Last checked{" "}
                {formatTime(
                  lastCheckedAt,
                )}
              </p>
            </div>

            <div className="playground-diagnostics-panel__toolbar">
              <button
                type="button"
                onClick={() => {
                  refreshChecks();

                  addActivity(
                    "system",
                    "Health checks refreshed",
                  );
                }}
              >
                Refresh health
              </button>

              <button
                type="button"
                onClick={
                  triggerResync
                }
              >
                Request resync
              </button>

              <button
                type="button"
                onClick={
                  triggerRecovery
                }
              >
                Trigger recovery
              </button>

              <div className="playground-diagnostics-panel__toolbar-spacer" />

              <button
                type="button"
                onClick={
                  handleCopyReport
                }
              >
                {copied
                  ? "Copied"
                  : "Copy report"}
              </button>
            </div>

            <div className="playground-diagnostics-panel__body">
              <section className="playground-diagnostics-panel__checks">
                <div className="playground-diagnostics-panel__section-heading">
                  <div>
                    <p>
                      Runtime
                    </p>

                    <h3>
                      Health Checks
                    </h3>
                  </div>

                  <span>
                    {checks.length}
                  </span>
                </div>

                <div className="playground-diagnostics-panel__check-list">
                  {checks.map(
                    (check) => (
                      <article
                        key={
                          check.id
                        }
                        className={`playground-diagnostic-check playground-diagnostic-check--${check.state}`}
                      >
                        <span
                          className="playground-diagnostic-check__indicator"
                          aria-hidden="true"
                        />

                        <div>
                          <strong>
                            {
                              check.label
                            }
                          </strong>

                          <small>
                            {
                              check.description
                            }
                          </small>
                        </div>

                        <span className="playground-diagnostic-check__value">
                          {
                            check.value
                          }
                        </span>
                      </article>
                    ),
                  )}
                </div>
              </section>

              <aside className="playground-diagnostics-panel__activity">
                <div className="playground-diagnostics-panel__section-heading">
                  <div>
                    <p>
                      Trace
                    </p>

                    <h3>
                      Recent Activity
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActivity([]);
                    }}
                  >
                    Clear
                  </button>
                </div>

                {activity.length ===
                0 ? (
                  <div className="playground-diagnostics-panel__empty">
                    No diagnostic activity recorded yet.
                  </div>
                ) : (
                  <div className="playground-diagnostics-panel__activity-list">
                    {activity.map(
                      (entry) => (
                        <article
                          key={
                            entry.id
                          }
                          className={`playground-diagnostic-activity playground-diagnostic-activity--${entry.kind}`}
                        >
                          <span
                            aria-hidden="true"
                          >
                            {getActivitySymbol(
                              entry.kind,
                            )}
                          </span>

                          <div>
                            <strong>
                              {
                                entry.title
                              }
                            </strong>

                            {entry.detail && (
                              <small>
                                {
                                  entry.detail
                                }
                              </small>
                            )}
                          </div>

                          <time>
                            {formatTime(
                              entry.timestamp,
                            )}
                          </time>
                        </article>
                      ),
                    )}
                  </div>
                )}
              </aside>
            </div>

            <footer className="playground-diagnostics-panel__footer">
              <span>
                Internal diagnostics do not modify workspace content unless a recovery action is triggered.
              </span>

              <span>
                ⌘⇧D
              </span>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
