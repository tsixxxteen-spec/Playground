#!/usr/bin/env bash

set -euo pipefail

SPRINT_ID="21B.13"
MARKER=".playground-sprint-21B13-installed"
BACKUP_DIR=".playground-backups/sprint-21B13-$(date +%Y%m%d-%H%M%S)"

fail() {
  echo "❌ $*" >&2
  exit 1
}

[[ -f package.json ]] || fail "Run this installer from the worlds project root."
[[ -f src/main.tsx ]] || fail "src/main.tsx was not found."

[[ -f src/collaboration/command-center/CollaborationCommandCenter.tsx ]] ||
  fail "Sprint 21B.12 Collaboration Command Center was not found."

if [[ -f "$MARKER" ]]; then
  echo "✅ Sprint $SPRINT_ID is already installed."
  exit 0
fi

mkdir -p "$BACKUP_DIR"
mkdir -p src/collaboration/diagnostics

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

    rm -rf src/collaboration/diagnostics
    rm -f "$MARKER"

    echo "✅ Rollback complete."
  fi

  exit "$code"
}

trap rollback EXIT

# ------------------------------------------------------------
# Diagnostics types
# ------------------------------------------------------------

cat > src/collaboration/diagnostics/types.ts <<'EOF'
export type DiagnosticHealthState =
  | "healthy"
  | "warning"
  | "error";

export type DiagnosticCheck = {
  id: string;
  label: string;
  description: string;
  state: DiagnosticHealthState;
  value: string;
};

export type DiagnosticActivityKind =
  | "event"
  | "error"
  | "warning"
  | "system";

export type DiagnosticActivity = {
  id: string;
  kind: DiagnosticActivityKind;
  title: string;
  detail?: string;
  timestamp: number;
};

export type CollaborationDiagnosticReport = {
  generatedAt: string;
  url: string;
  userAgent: string;
  online: boolean;
  storageAvailable: boolean;
  localStorageKeys: number;
  checks: DiagnosticCheck[];
  recentActivity: DiagnosticActivity[];
};
EOF

# ------------------------------------------------------------
# Diagnostics utilities
# ------------------------------------------------------------

cat > src/collaboration/diagnostics/diagnostics.ts <<'EOF'
import type {
  CollaborationDiagnosticReport,
  DiagnosticActivity,
  DiagnosticCheck,
} from "./types";

const SESSION_STORAGE_PREFIXES = [
  "playground:session",
  "playground:sessions",
];

const HISTORY_STORAGE_PREFIXES = [
  "playground:visual-history",
  "playground:history",
];

function canUseLocalStorage(): boolean {
  try {
    const testKey =
      "__playground_diagnostics_test__";

    localStorage.setItem(
      testKey,
      "1",
    );

    localStorage.removeItem(
      testKey,
    );

    return true;
  } catch {
    return false;
  }
}

function countMatchingKeys(
  prefixes: string[],
): number {
  let count = 0;

  for (
    let index = 0;
    index < localStorage.length;
    index += 1
  ) {
    const key =
      localStorage.key(index);

    if (!key) {
      continue;
    }

    const matches =
      prefixes.some(
        (prefix) =>
          key.indexOf(prefix) ===
          0,
      );

    if (matches) {
      count += 1;
    }
  }

  return count;
}

function checkElement(
  id: string,
  label: string,
  selector: string,
  description: string,
): DiagnosticCheck {
  const found =
    Boolean(
      document.querySelector(
        selector,
      ),
    );

  return {
    id,
    label,
    description,
    state:
      found
        ? "healthy"
        : "warning",
    value:
      found
        ? "Mounted"
        : "Not detected",
  };
}

export function collectDiagnosticChecks():
  DiagnosticCheck[] {
  const storageAvailable =
    canUseLocalStorage();

  const checks:
    DiagnosticCheck[] = [
      {
        id:
          "browser-online",
        label:
          "Runtime connection",
        description:
          "Browser network availability.",
        state:
          navigator.onLine
            ? "healthy"
            : "warning",
        value:
          navigator.onLine
            ? "Online"
            : "Offline",
      },
      {
        id:
          "local-storage",
        label:
          "Local storage",
        description:
          "Workspace persistence availability.",
        state:
          storageAvailable
            ? "healthy"
            : "error",
        value:
          storageAvailable
            ? "Available"
            : "Unavailable",
      },
      checkElement(
        "command-center",
        "Command Center",
        ".playground-command-center-launcher",
        "Unified workspace command launcher.",
      ),
      checkElement(
        "session-manager",
        "Session Manager",
        ".playground-session-launcher",
        "Session persistence interface.",
      ),
      checkElement(
        "history-panel",
        "Visual History",
        ".playground-history-launcher",
        "Snapshot and restore interface.",
      ),
      checkElement(
        "collaboration-dashboard",
        "Collaboration Dashboard",
        ".playground-collaboration-launcher",
        "Presence and locking interface.",
      ),
      checkElement(
        "object-inspector",
        "Object Inspector",
        ".playground-inspector-launcher",
        "Object search and metadata interface.",
      ),
    ];

  if (storageAvailable) {
    const sessionKeyCount =
      countMatchingKeys(
        SESSION_STORAGE_PREFIXES,
      );

    const historyKeyCount =
      countMatchingKeys(
        HISTORY_STORAGE_PREFIXES,
      );

    checks.push({
      id:
        "session-storage-data",
      label:
        "Session data",
      description:
        "Stored session-related records.",
      state:
        sessionKeyCount > 0
          ? "healthy"
          : "warning",
      value:
        `${sessionKeyCount} keys`,
    });

    checks.push({
      id:
        "history-storage-data",
      label:
        "History data",
      description:
        "Stored history-related records.",
      state:
        historyKeyCount > 0
          ? "healthy"
          : "warning",
      value:
        `${historyKeyCount} keys`,
    });
  }

  return checks;
}

export function createDiagnosticReport(
  checks: DiagnosticCheck[],
  recentActivity:
    DiagnosticActivity[],
): CollaborationDiagnosticReport {
  return {
    generatedAt:
      new Date().toISOString(),
    url:
      window.location.href,
    userAgent:
      navigator.userAgent,
    online:
      navigator.onLine,
    storageAvailable:
      canUseLocalStorage(),
    localStorageKeys:
      localStorage.length,
    checks,
    recentActivity,
  };
}

export function formatDiagnosticReport(
  report:
    CollaborationDiagnosticReport,
): string {
  const lines: string[] = [
    "PLAYGROUND COLLABORATION DIAGNOSTICS",
    "====================================",
    "",
    `Generated: ${report.generatedAt}`,
    `URL: ${report.url}`,
    `Online: ${report.online ? "Yes" : "No"}`,
    `Storage available: ${
      report.storageAvailable
        ? "Yes"
        : "No"
    }`,
    `Local storage keys: ${report.localStorageKeys}`,
    "",
    "HEALTH CHECKS",
    "-------------",
  ];

  report.checks.forEach(
    (check) => {
      lines.push(
        `[${check.state.toUpperCase()}] ${check.label}: ${check.value}`,
      );

      lines.push(
        `  ${check.description}`,
      );
    },
  );

  lines.push(
    "",
    "RECENT ACTIVITY",
    "---------------",
  );

  if (
    report.recentActivity.length ===
    0
  ) {
    lines.push(
      "No recent diagnostic activity.",
    );
  } else {
    report.recentActivity.forEach(
      (activity) => {
        lines.push(
          `${new Date(
            activity.timestamp,
          ).toISOString()} [${activity.kind.toUpperCase()}] ${activity.title}`,
        );

        if (activity.detail) {
          lines.push(
            `  ${activity.detail}`,
          );
        }
      },
    );
  }

  lines.push(
    "",
    "USER AGENT",
    "----------",
    report.userAgent,
  );

  return lines.join("\n");
}
EOF

# ------------------------------------------------------------
# Diagnostics panel
# ------------------------------------------------------------

cat > src/collaboration/diagnostics/CollaborationDiagnosticsPanel.tsx <<'EOF'
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
EOF

# ------------------------------------------------------------
# Diagnostics styling
# ------------------------------------------------------------

cat > src/collaboration/diagnostics/collaboration-diagnostics-panel.css <<'EOF'
.playground-diagnostics-overlay {
  position: fixed;
  inset: 0;
  z-index: 14000;
  display: grid;
  place-items: center;
  padding: 28px;
  background:
    rgba(0, 0, 0, 0.58);
  backdrop-filter:
    blur(18px);
  animation:
    playground-diagnostics-fade
    150ms ease-out;
}

.playground-diagnostics-panel {
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
    rgba(13, 13, 15, 0.99);
  color: #fff;
  box-shadow:
    0 38px 110px
    rgba(0, 0, 0, 0.64);
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  animation:
    playground-diagnostics-rise
    200ms
    cubic-bezier(
      0.22,
      1,
      0.36,
      1
    );
}

.playground-diagnostics-panel__header {
  min-height: 90px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 20px 24px;
  border-bottom: 1px solid
    rgba(255, 255, 255, 0.08);
}

.playground-diagnostics-panel__eyebrow {
  margin: 0 0 4px;
  color:
    rgba(255, 255, 255, 0.36);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.playground-diagnostics-panel__header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 680;
  letter-spacing: -0.035em;
}

.playground-diagnostics-panel__header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.playground-diagnostics-panel__health {
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 11px;
  border-radius: 999px;
  background:
    rgba(255, 255, 255, 0.055);
  color:
    rgba(255, 255, 255, 0.54);
  font-size: 10px;
}

.playground-diagnostics-panel__health span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background:
    rgba(255, 255, 255, 0.35);
}

.playground-diagnostics-panel__health--healthy {
  color: #a7ecb9;
  background:
    rgba(66, 180, 96, 0.12);
}

.playground-diagnostics-panel__health--healthy span {
  background: #75da91;
}

.playground-diagnostics-panel__health--warning {
  color: #f0d28b;
  background:
    rgba(210, 164, 63, 0.12);
}

.playground-diagnostics-panel__health--warning span {
  background: #e7bd63;
}

.playground-diagnostics-panel__health--error {
  color: #ffb4b4;
  background:
    rgba(221, 70, 70, 0.13);
}

.playground-diagnostics-panel__health--error span {
  background: #f07b7b;
}

.playground-diagnostics-panel__close {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background:
    rgba(255, 255, 255, 0.07);
  color:
    rgba(255, 255, 255, 0.7);
  font-size: 20px;
  cursor: pointer;
}

.playground-diagnostics-panel__summary {
  min-height: 72px;
  display: flex;
  align-items: center;
  gap: 30px;
  padding: 12px 24px;
  border-bottom: 1px solid
    rgba(255, 255, 255, 0.07);
}

.playground-diagnostics-panel__summary > div {
  display: grid;
  gap: 3px;
}

.playground-diagnostics-panel__summary strong {
  font-size: 17px;
  font-weight: 680;
}

.playground-diagnostics-panel__summary span {
  color:
    rgba(255, 255, 255, 0.36);
  font-size: 8px;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.playground-diagnostics-panel__summary p {
  margin: 0 0 0 auto;
  color:
    rgba(255, 255, 255, 0.31);
  font-size: 9px;
}

.playground-diagnostics-panel__toolbar {
  min-height: 56px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  border-bottom: 1px solid
    rgba(255, 255, 255, 0.07);
}

.playground-diagnostics-panel__toolbar button {
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid
    rgba(255, 255, 255, 0.09);
  border-radius: 9px;
  background:
    rgba(255, 255, 255, 0.05);
  color:
    rgba(255, 255, 255, 0.73);
  font: inherit;
  font-size: 9px;
  font-weight: 630;
  cursor: pointer;
}

.playground-diagnostics-panel__toolbar button:hover {
  background:
    rgba(255, 255, 255, 0.09);
}

.playground-diagnostics-panel__toolbar-spacer {
  flex: 1;
}

.playground-diagnostics-panel__body {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns:
    minmax(0, 1fr)
    390px;
}

.playground-diagnostics-panel__checks,
.playground-diagnostics-panel__activity {
  min-width: 0;
  overflow-y: auto;
  padding: 18px;
}

.playground-diagnostics-panel__activity {
  border-left: 1px solid
    rgba(255, 255, 255, 0.07);
  background:
    rgba(255, 255, 255, 0.014);
}

.playground-diagnostics-panel__section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 13px;
}

.playground-diagnostics-panel__section-heading p {
  margin: 0 0 3px;
  color:
    rgba(255, 255, 255, 0.31);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.playground-diagnostics-panel__section-heading h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 650;
}

.playground-diagnostics-panel__section-heading > span {
  min-width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background:
    rgba(255, 255, 255, 0.06);
  color:
    rgba(255, 255, 255, 0.4);
  font-size: 9px;
}

.playground-diagnostics-panel__section-heading button {
  border: 0;
  background: transparent;
  color:
    rgba(255, 255, 255, 0.36);
  font: inherit;
  font-size: 9px;
  cursor: pointer;
}

.playground-diagnostics-panel__check-list,
.playground-diagnostics-panel__activity-list {
  display: grid;
  gap: 7px;
}

.playground-diagnostic-check {
  display: grid;
  grid-template-columns:
    auto
    minmax(0, 1fr)
    auto;
  align-items: center;
  gap: 11px;
  min-height: 62px;
  padding: 10px 12px;
  border: 1px solid
    rgba(255, 255, 255, 0.055);
  border-radius: 13px;
  background:
    rgba(255, 255, 255, 0.025);
}

.playground-diagnostic-check__indicator {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background:
    rgba(255, 255, 255, 0.35);
}

.playground-diagnostic-check--healthy
.playground-diagnostic-check__indicator {
  background: #70d98c;
}

.playground-diagnostic-check--warning
.playground-diagnostic-check__indicator {
  background: #e7bd63;
}

.playground-diagnostic-check--error
.playground-diagnostic-check__indicator {
  background: #f07b7b;
}

.playground-diagnostic-check > div {
  min-width: 0;
  display: grid;
  gap: 5px;
}

.playground-diagnostic-check strong {
  color:
    rgba(255, 255, 255, 0.86);
  font-size: 11px;
  font-weight: 630;
}

.playground-diagnostic-check small {
  color:
    rgba(255, 255, 255, 0.35);
  font-size: 8px;
}

.playground-diagnostic-check__value {
  color:
    rgba(255, 255, 255, 0.47);
  font-size: 9px;
  text-align: right;
}

.playground-diagnostic-activity {
  display: grid;
  grid-template-columns:
    auto
    minmax(0, 1fr)
    auto;
  align-items: start;
  gap: 9px;
  padding: 10px;
  border: 1px solid
    rgba(255, 255, 255, 0.05);
  border-radius: 11px;
  background:
    rgba(255, 255, 255, 0.022);
}

.playground-diagnostic-activity > span {
  width: 25px;
  height: 25px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  background:
    rgba(255, 255, 255, 0.055);
  color:
    rgba(255, 255, 255, 0.48);
  font-size: 11px;
}

.playground-diagnostic-activity--error > span {
  color: #ffaaaa;
  background:
    rgba(221, 70, 70, 0.12);
}

.playground-diagnostic-activity--warning > span {
  color: #f0d28b;
  background:
    rgba(210, 164, 63, 0.12);
}

.playground-diagnostic-activity > div {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.playground-diagnostic-activity strong {
  overflow: hidden;
  color:
    rgba(255, 255, 255, 0.78);
  font-size: 9px;
  font-weight: 620;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.playground-diagnostic-activity small {
  max-height: 48px;
  overflow: hidden;
  color:
    rgba(255, 255, 255, 0.31);
  font-family:
    ui-monospace,
    SFMono-Regular,
    Menlo,
    Monaco,
    Consolas,
    monospace;
  font-size: 7px;
  line-height: 1.45;
  white-space: pre-wrap;
}

.playground-diagnostic-activity time {
  color:
    rgba(255, 255, 255, 0.25);
  font-size: 7px;
}

.playground-diagnostics-panel__empty {
  min-height: 160px;
  display: grid;
  place-items: center;
  padding: 18px;
  border: 1px dashed
    rgba(255, 255, 255, 0.075);
  border-radius: 12px;
  color:
    rgba(255, 255, 255, 0.3);
  font-size: 9px;
  text-align: center;
}

.playground-diagnostics-panel__footer {
  min-height: 46px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 0 24px;
  border-top: 1px solid
    rgba(255, 255, 255, 0.07);
  color:
    rgba(255, 255, 255, 0.28);
  font-size: 8px;
}

@keyframes playground-diagnostics-fade {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes playground-diagnostics-rise {
  from {
    opacity: 0;
    transform:
      translateY(14px)
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
  .playground-diagnostics-panel__body {
    grid-template-columns: 1fr;
  }

  .playground-diagnostics-panel__activity {
    display: none;
  }
}

@media (max-width: 620px) {
  .playground-diagnostics-overlay {
    padding: 10px;
  }

  .playground-diagnostics-panel {
    width: 100%;
    height: 94vh;
    border-radius: 18px;
  }

  .playground-diagnostics-panel__header {
    padding: 16px;
  }

  .playground-diagnostics-panel__health {
    display: none;
  }

  .playground-diagnostics-panel__summary {
    gap: 18px;
    padding-right: 16px;
    padding-left: 16px;
  }

  .playground-diagnostics-panel__summary p {
    display: none;
  }

  .playground-diagnostics-panel__toolbar {
    flex-wrap: wrap;
    padding-right: 16px;
    padding-left: 16px;
  }

  .playground-diagnostics-panel__toolbar-spacer {
    display: none;
  }
}
EOF

# ------------------------------------------------------------
# Public exports
# ------------------------------------------------------------

cat > src/collaboration/diagnostics/index.ts <<'EOF'
export {
  default as CollaborationDiagnosticsPanel,
} from "./CollaborationDiagnosticsPanel";

export {
  collectDiagnosticChecks,
  createDiagnosticReport,
  formatDiagnosticReport,
} from "./diagnostics";

export type {
  CollaborationDiagnosticReport,
  DiagnosticActivity,
  DiagnosticActivityKind,
  DiagnosticCheck,
  DiagnosticHealthState,
} from "./types";
EOF

# ------------------------------------------------------------
# Mount diagnostics in main.tsx
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
        'import CollaborationDiagnosticsPanel '
        'from "./collaboration/diagnostics/CollaborationDiagnosticsPanel";\n'
    ),
    'from "./collaboration/diagnostics/CollaborationDiagnosticsPanel"',
)

if "<CollaborationDiagnosticsPanel />" not in text:
    anchors = [
        "<CollaborationCommandCenter />",
        "<ObjectInspectorPanel />",
        "<CollaborationDashboard />",
        "<VisualHistoryPanel />",
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
            "❌ No suitable CollaborationDiagnosticsPanel mount location was found in src/main.tsx."
        )

    text = text.replace(
        selected_anchor,
        (
            selected_anchor
            + "\n                "
            + "<CollaborationDiagnosticsPanel />"
        ),
        1,
    )

path.write_text(text)

print("✅ CollaborationDiagnosticsPanel imported.")
print("✅ CollaborationDiagnosticsPanel mounted.")
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
echo "Reliability and Diagnostics features:"
echo "  • Collaboration health checks"
echo "  • Mounted-panel detection"
echo "  • Local storage integrity check"
echo "  • Session and history storage visibility"
echo "  • Runtime error capture"
echo "  • Promise rejection capture"
echo "  • Collaboration event tracing"
echo "  • Online and offline state logging"
echo "  • Manual refresh"
echo "  • Session resync request"
echo "  • Recovery request"
echo "  • Copy diagnostics report"
echo "  • Command/Ctrl + Shift + D shortcut"
echo ""
echo "Launch the Tauri app with:"
echo "  ./open-playground-tauri.sh"
