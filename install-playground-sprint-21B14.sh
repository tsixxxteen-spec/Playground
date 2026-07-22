#!/usr/bin/env bash

set -euo pipefail

SPRINT_ID="21B.14"
MARKER=".playground-sprint-21B14-installed"
BACKUP_DIR=".playground-backups/sprint-21B14-$(date +%Y%m%d-%H%M%S)"

fail() {
  echo "❌ $*" >&2
  exit 1
}

[[ -f package.json ]] ||
  fail "Run this installer from the worlds project root."

[[ -f src/main.tsx ]] ||
  fail "src/main.tsx was not found."

[[ -f src/collaboration/diagnostics/CollaborationDiagnosticsPanel.tsx ]] ||
  fail "Sprint 21B.13 Diagnostics was not found."

[[ -f src/collaboration/inspector/objectScanner.ts ]] ||
  fail "Object scanner was not found."

if [[ -f "$MARKER" ]]; then
  echo "✅ Sprint $SPRINT_ID is already installed."
  exit 0
fi

mkdir -p "$BACKUP_DIR"
mkdir -p src/collaboration/release-readiness

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

    rm -rf src/collaboration/release-readiness
    rm -f "$MARKER"

    echo "✅ Rollback complete."
  fi

  exit "$code"
}

trap rollback EXIT

# ------------------------------------------------------------
# Release readiness types
# ------------------------------------------------------------

cat > src/collaboration/release-readiness/types.ts <<'EOF'
export type ReadinessTestState =
  | "pending"
  | "running"
  | "passed"
  | "warning"
  | "failed";

export type ReadinessTestResult = {
  id: string;
  title: string;
  description: string;
  state: ReadinessTestState;
  detail: string;
  durationMs?: number;
};

export type ReleaseReadinessReport = {
  generatedAt: string;
  score: number;
  passed: number;
  warnings: number;
  failed: number;
  results: ReadinessTestResult[];
  location: string;
  userAgent: string;
};
EOF

# ------------------------------------------------------------
# Automated readiness tests
# ------------------------------------------------------------

cat > src/collaboration/release-readiness/readinessTests.ts <<'EOF'
import {
  scanInspectableObjects,
} from "../inspector/objectScanner";

import type {
  ReadinessTestResult,
  ReadinessTestState,
  ReleaseReadinessReport,
} from "./types";

type AsyncTestResult = {
  state:
    Exclude<
      ReadinessTestState,
      "pending" |
      "running"
    >;
  detail: string;
};

type TestDefinition = {
  id: string;
  title: string;
  description: string;
  run: () =>
    AsyncTestResult |
    Promise<AsyncTestResult>;
};

const TEST_STORAGE_KEY =
  "__playground_release_readiness_test__";

function mountedTest(
  id: string,
  title: string,
  description: string,
  selector: string,
): TestDefinition {
  return {
    id,
    title,
    description,
    run: () => {
      const element =
        document.querySelector(
          selector,
        );

      return element
        ? {
            state:
              "passed",
            detail:
              `Detected ${selector}`,
          }
        : {
            state:
              "failed",
            detail:
              `Missing ${selector}`,
          };
    },
  };
}

function eventBusTest():
  Promise<AsyncTestResult> {
  return new Promise(
    (resolve) => {
      const requestEvent =
        "playground:release-readiness-ping";

      const responseEvent =
        "playground:release-readiness-pong";

      let completed =
        false;

      const timeout =
        window.setTimeout(
          () => {
            if (completed) {
              return;
            }

            completed = true;

            document.removeEventListener(
              responseEvent,
              handleResponse,
            );

            resolve({
              state:
                "failed",
              detail:
                "Event response timed out.",
            });
          },
          350,
        );

      const handleResponse =
        () => {
          if (completed) {
            return;
          }

          completed = true;

          window.clearTimeout(
            timeout,
          );

          document.removeEventListener(
            responseEvent,
            handleResponse,
          );

          resolve({
            state:
              "passed",
            detail:
              "Document event bus responded successfully.",
          });
        };

      document.addEventListener(
        responseEvent,
        handleResponse,
      );

      document.dispatchEvent(
        new CustomEvent(
          requestEvent,
        ),
      );

      document.dispatchEvent(
        new CustomEvent(
          responseEvent,
        ),
      );
    },
  );
}

function testStorage():
  AsyncTestResult {
  try {
    localStorage.setItem(
      TEST_STORAGE_KEY,
      JSON.stringify({
        createdAt:
          Date.now(),
      }),
    );

    const value =
      localStorage.getItem(
        TEST_STORAGE_KEY,
      );

    localStorage.removeItem(
      TEST_STORAGE_KEY,
    );

    if (!value) {
      return {
        state:
          "failed",
        detail:
          "Storage write succeeded, but read returned no value.",
      };
    }

    return {
      state:
        "passed",
      detail:
        "Local storage read, write, and delete succeeded.",
    };
  } catch (error) {
    return {
      state:
        "failed",
      detail:
        error instanceof Error
          ? error.message
          : "Local storage test failed.",
    };
  }
}

function testObjectScanner():
  AsyncTestResult {
  try {
    const objects =
      scanInspectableObjects();

    if (
      !Array.isArray(
        objects,
      )
    ) {
      return {
        state:
          "failed",
        detail:
          "Object scanner returned an invalid result.",
      };
    }

    return {
      state:
        objects.length > 0
          ? "passed"
          : "warning",
      detail:
        objects.length > 0
          ? `${objects.length} inspectable objects detected.`
          : "Scanner is operational, but no inspectable objects are currently mounted.",
    };
  } catch (error) {
    return {
      state:
        "failed",
      detail:
        error instanceof Error
          ? error.message
          : "Object scanner threw an unknown error.",
    };
  }
}

function testSessionData():
  AsyncTestResult {
  try {
    const keys: string[] =
      [];

    for (
      let index = 0;
      index < localStorage.length;
      index += 1
    ) {
      const key =
        localStorage.key(index);

      if (
        key &&
        (
          key.indexOf(
            "playground:session",
          ) === 0 ||
          key.indexOf(
            "playground:sessions",
          ) === 0
        )
      ) {
        keys.push(key);
      }
    }

    return {
      state:
        keys.length > 0
          ? "passed"
          : "warning",
      detail:
        keys.length > 0
          ? `${keys.length} session storage records detected.`
          : "Session storage is available, but no saved session records were detected.",
    };
  } catch (error) {
    return {
      state:
        "failed",
      detail:
        error instanceof Error
          ? error.message
          : "Session data check failed.",
    };
  }
}

function testHistoryData():
  AsyncTestResult {
  try {
    const keys: string[] =
      [];

    for (
      let index = 0;
      index < localStorage.length;
      index += 1
    ) {
      const key =
        localStorage.key(index);

      if (
        key &&
        (
          key.indexOf(
            "playground:visual-history",
          ) === 0 ||
          key.indexOf(
            "playground:history",
          ) === 0
        )
      ) {
        keys.push(key);
      }
    }

    return {
      state:
        keys.length > 0
          ? "passed"
          : "warning",
      detail:
        keys.length > 0
          ? `${keys.length} history storage records detected.`
          : "History storage is available, but no history records have been created yet.",
    };
  } catch (error) {
    return {
      state:
        "failed",
      detail:
        error instanceof Error
          ? error.message
          : "History data check failed.",
    };
  }
}

function testNetwork():
  AsyncTestResult {
  return {
    state:
      navigator.onLine
        ? "passed"
        : "warning",
    detail:
      navigator.onLine
        ? "Browser runtime reports an online connection."
        : "Browser runtime reports an offline connection.",
  };
}

function testClipboard():
  AsyncTestResult {
  const available =
    Boolean(
      navigator.clipboard &&
      typeof navigator.clipboard
        .writeText ===
        "function",
    );

  return {
    state:
      available
        ? "passed"
        : "warning",
    detail:
      available
        ? "Clipboard reporting is available."
        : "Clipboard API is unavailable in this runtime.",
  };
}

export const RELEASE_READINESS_TESTS:
  TestDefinition[] = [
    mountedTest(
      "command-center-mounted",
      "Workspace Command Center",
      "Verifies that the unified command interface is mounted.",
      ".playground-command-center-launcher",
    ),

    mountedTest(
      "session-manager-mounted",
      "Session Manager",
      "Verifies that session management is mounted.",
      ".playground-session-launcher",
    ),

    mountedTest(
      "history-mounted",
      "Visual History",
      "Verifies that the visual history interface is mounted.",
      ".playground-history-launcher",
    ),

    mountedTest(
      "dashboard-mounted",
      "Collaboration Dashboard",
      "Verifies that collaborator presence is mounted.",
      ".playground-collaboration-launcher",
    ),

    mountedTest(
      "inspector-mounted",
      "Object Inspector",
      "Verifies that object search and inspection is mounted.",
      ".playground-inspector-launcher",
    ),

    {
      id:
        "event-bus",
      title:
        "Collaboration Event Bus",
      description:
        "Dispatches and receives a temporary collaboration event.",
      run:
        eventBusTest,
    },

    {
      id:
        "storage",
      title:
        "Persistence Storage",
      description:
        "Performs a temporary read, write, and delete operation.",
      run:
        testStorage,
    },

    {
      id:
        "session-data",
      title:
        "Session Records",
      description:
        "Checks for persisted session records.",
      run:
        testSessionData,
    },

    {
      id:
        "history-data",
      title:
        "History Records",
      description:
        "Checks for persisted visual history records.",
      run:
        testHistoryData,
    },

    {
      id:
        "object-scanner",
      title:
        "Object Scanner",
      description:
        "Runs the shared object discovery scanner.",
      run:
        testObjectScanner,
    },

    {
      id:
        "network",
      title:
        "Runtime Connection",
      description:
        "Checks the browser runtime connection state.",
      run:
        testNetwork,
    },

    {
      id:
        "clipboard",
      title:
        "Clipboard Reporting",
      description:
        "Checks whether release reports can be copied.",
      run:
        testClipboard,
    },
  ];

export async function runReadinessTest(
  definition:
    TestDefinition,
): Promise<ReadinessTestResult> {
  const startedAt =
    performance.now();

  try {
    const result =
      await definition.run();

    return {
      id:
        definition.id,
      title:
        definition.title,
      description:
        definition.description,
      state:
        result.state,
      detail:
        result.detail,
      durationMs:
        Math.round(
          performance.now() -
          startedAt,
        ),
    };
  } catch (error) {
    return {
      id:
        definition.id,
      title:
        definition.title,
      description:
        definition.description,
      state:
        "failed",
      detail:
        error instanceof Error
          ? error.message
          : "Unknown test failure.",
      durationMs:
        Math.round(
          performance.now() -
          startedAt,
        ),
    };
  }
}

export function calculateReadinessScore(
  results:
    ReadinessTestResult[],
): number {
  if (
    results.length === 0
  ) {
    return 0;
  }

  const earned =
    results.reduce(
      (
        total,
        result,
      ) => {
        if (
          result.state ===
          "passed"
        ) {
          return total + 1;
        }

        if (
          result.state ===
          "warning"
        ) {
          return total + 0.5;
        }

        return total;
      },
      0,
    );

  return Math.round(
    (
      earned /
      results.length
    ) *
      100,
  );
}

export function createReleaseReport(
  results:
    ReadinessTestResult[],
): ReleaseReadinessReport {
  return {
    generatedAt:
      new Date().toISOString(),
    score:
      calculateReadinessScore(
        results,
      ),
    passed:
      results.filter(
        (result) =>
          result.state ===
          "passed",
      ).length,
    warnings:
      results.filter(
        (result) =>
          result.state ===
          "warning",
      ).length,
    failed:
      results.filter(
        (result) =>
          result.state ===
          "failed",
      ).length,
    results,
    location:
      window.location.href,
    userAgent:
      navigator.userAgent,
  };
}

export function formatReleaseReport(
  report:
    ReleaseReadinessReport,
): string {
  const lines = [
    "PLAYGROUND RELEASE READINESS",
    "============================",
    "",
    `Generated: ${report.generatedAt}`,
    `Readiness score: ${report.score}%`,
    `Passed: ${report.passed}`,
    `Warnings: ${report.warnings}`,
    `Failed: ${report.failed}`,
    `Location: ${report.location}`,
    "",
    "TEST RESULTS",
    "------------",
  ];

  report.results.forEach(
    (result) => {
      lines.push(
        `[${result.state.toUpperCase()}] ${result.title}`,
      );

      lines.push(
        `  ${result.detail}`,
      );

      if (
        typeof result.durationMs ===
        "number"
      ) {
        lines.push(
          `  Duration: ${result.durationMs}ms`,
        );
      }
    },
  );

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
# Release readiness panel
# ------------------------------------------------------------

cat > src/collaboration/release-readiness/ReleaseReadinessPanel.tsx <<'EOF'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  calculateReadinessScore,
  createReleaseReport,
  formatReleaseReport,
  RELEASE_READINESS_TESTS,
  runReadinessTest,
} from "./readinessTests";

import type {
  ReadinessTestResult,
  ReadinessTestState,
} from "./types";

import "./release-readiness-panel.css";

function getStateSymbol(
  state:
    ReadinessTestState,
): string {
  switch (state) {
    case "passed":
      return "✓";

    case "warning":
      return "△";

    case "failed":
      return "!";

    case "running":
      return "…";

    case "pending":
    default:
      return "·";
  }
}

function getScoreLabel(
  score: number,
  failed: number,
): string {
  if (
    failed === 0 &&
    score >= 90
  ) {
    return "Ready for release";
  }

  if (
    failed === 0 &&
    score >= 75
  ) {
    return "Nearly ready";
  }

  if (score >= 50) {
    return "Review required";
  }

  return "Not ready";
}

export default function ReleaseReadinessPanel() {
  const [
    isOpen,
    setIsOpen,
  ] = useState(false);

  const [
    results,
    setResults,
  ] = useState<
    ReadinessTestResult[]
  >([]);

  const [
    isRunning,
    setIsRunning,
  ] = useState(false);

  const [
    copied,
    setCopied,
  ] = useState(false);

  const runAllTests =
    useCallback(
      async () => {
        setIsRunning(true);
        setCopied(false);

        const pendingResults =
          RELEASE_READINESS_TESTS.map(
            (test) => ({
              id:
                test.id,
              title:
                test.title,
              description:
                test.description,
              state:
                "pending" as const,
              detail:
                "Waiting to run.",
            }),
          );

        setResults(
          pendingResults,
        );

        const completed:
          ReadinessTestResult[] =
          [];

        for (
          let index = 0;
          index <
          RELEASE_READINESS_TESTS.length;
          index += 1
        ) {
          const definition =
            RELEASE_READINESS_TESTS[
              index
            ];

          setResults(
            (current) =>
              current.map(
                (result) =>
                  result.id ===
                  definition.id
                    ? {
                        ...result,
                        state:
                          "running",
                        detail:
                          "Running test…",
                      }
                    : result,
              ),
          );

          const result =
            await runReadinessTest(
              definition,
            );

          completed.push(
            result,
          );

          setResults(
            (current) =>
              current.map(
                (currentResult) =>
                  currentResult.id ===
                  result.id
                    ? result
                    : currentResult,
              ),
          );
        }

        setResults(
          completed,
        );

        setIsRunning(false);

        document.dispatchEvent(
          new CustomEvent(
            "playground:release-readiness-completed",
            {
              detail: {
                score:
                  calculateReadinessScore(
                    completed,
                  ),
                results:
                  completed,
              },
            },
          ),
        );
      },
      [],
    );

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
          "r"
      ) {
        event.preventDefault();

        setIsOpen(
          (current) => {
            const next =
              !current;

            if (
              next &&
              results.length === 0
            ) {
              window.setTimeout(
                () => {
                  void runAllTests();
                },
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
  }, [
    results.length,
    runAllTests,
  ]);

  useEffect(() => {
    const runStartupValidation =
      () => {
        window.setTimeout(
          () => {
            void runAllTests();
          },
          1_000,
        );
      };

    if (
      document.readyState ===
      "complete"
    ) {
      runStartupValidation();
    } else {
      window.addEventListener(
        "load",
        runStartupValidation,
        {
          once: true,
        },
      );
    }

    return () => {
      window.removeEventListener(
        "load",
        runStartupValidation,
      );
    };
  }, [runAllTests]);

  const score =
    useMemo(
      () =>
        calculateReadinessScore(
          results,
        ),
      [results],
    );

  const passed =
    results.filter(
      (result) =>
        result.state ===
        "passed",
    ).length;

  const warnings =
    results.filter(
      (result) =>
        result.state ===
        "warning",
    ).length;

  const failed =
    results.filter(
      (result) =>
        result.state ===
        "failed",
    ).length;

  const completed =
    results.filter(
      (result) =>
        result.state !==
          "pending" &&
        result.state !==
          "running",
    ).length;

  const handleCopyReport =
    async () => {
      const report =
        createReleaseReport(
          results,
        );

      const text =
        formatReleaseReport(
          report,
        );

      try {
        await navigator.clipboard
          .writeText(text);

        setCopied(true);

        window.setTimeout(
          () => {
            setCopied(false);
          },
          1_500,
        );
      } catch {
        setCopied(false);
      }
    };

  return (
    <>
      {isOpen && (
        <div
          className="playground-readiness-overlay"
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
            className="playground-readiness-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Release Readiness"
          >
            <header className="playground-readiness-panel__header">
              <div>
                <p className="playground-readiness-panel__eyebrow">
                  Playground Internal
                </p>

                <h2>
                  Release Readiness
                </h2>
              </div>

              <div className="playground-readiness-panel__header-actions">
                <div
                  className={`playground-readiness-panel__score playground-readiness-panel__score--${
                    failed > 0
                      ? "failed"
                      : score >= 90
                        ? "ready"
                        : "warning"
                  }`}
                >
                  <strong>
                    {score}%
                  </strong>

                  <span>
                    {getScoreLabel(
                      score,
                      failed,
                    )}
                  </span>
                </div>

                <button
                  type="button"
                  className="playground-readiness-panel__close"
                  onClick={() => {
                    setIsOpen(false);
                  }}
                  aria-label="Close release readiness"
                >
                  ×
                </button>
              </div>
            </header>

            <div className="playground-readiness-panel__summary">
              <div>
                <strong>
                  {passed}
                </strong>

                <span>
                  Passed
                </span>
              </div>

              <div>
                <strong>
                  {warnings}
                </strong>

                <span>
                  Warnings
                </span>
              </div>

              <div>
                <strong>
                  {failed}
                </strong>

                <span>
                  Failed
                </span>
              </div>

              <div>
                <strong>
                  {completed}
                  /
                  {
                    RELEASE_READINESS_TESTS.length
                  }
                </strong>

                <span>
                  Completed
                </span>
              </div>
            </div>

            <div className="playground-readiness-panel__toolbar">
              <button
                type="button"
                disabled={
                  isRunning
                }
                onClick={() => {
                  void runAllTests();
                }}
              >
                {isRunning
                  ? "Running tests…"
                  : "Run all tests"}
              </button>

              <button
                type="button"
                disabled={
                  results.length === 0
                }
                onClick={() => {
                  void handleCopyReport();
                }}
              >
                {copied
                  ? "Report copied"
                  : "Copy report"}
              </button>

              <div className="playground-readiness-panel__toolbar-spacer" />

              <span>
                Automatic startup validation enabled
              </span>
            </div>

            <div className="playground-readiness-panel__body">
              {results.length ===
              0 ? (
                <div className="playground-readiness-panel__empty">
                  <span
                    aria-hidden="true"
                  >
                    ◇
                  </span>

                  <h3>
                    No test results
                  </h3>

                  <p>
                    Run the release-readiness suite to validate collaboration, persistence, events, and inspection systems.
                  </p>
                </div>
              ) : (
                <div className="playground-readiness-panel__test-list">
                  {results.map(
                    (
                      result,
                      index,
                    ) => (
                      <article
                        key={
                          result.id
                        }
                        className={`playground-readiness-test playground-readiness-test--${result.state}`}
                      >
                        <div className="playground-readiness-test__number">
                          {String(
                            index + 1,
                          ).padStart(
                            2,
                            "0",
                          )}
                        </div>

                        <div
                          className={`playground-readiness-test__state playground-readiness-test__state--${result.state}`}
                          aria-hidden="true"
                        >
                          {getStateSymbol(
                            result.state,
                          )}
                        </div>

                        <div className="playground-readiness-test__copy">
                          <div>
                            <strong>
                              {
                                result.title
                              }
                            </strong>

                            <span>
                              {
                                result.state
                              }
                            </span>
                          </div>

                          <p>
                            {
                              result.description
                            }
                          </p>

                          <small>
                            {
                              result.detail
                            }
                          </small>
                        </div>

                        <time>
                          {typeof result.durationMs ===
                          "number"
                            ? `${result.durationMs}ms`
                            : "—"}
                        </time>
                      </article>
                    ),
                  )}
                </div>
              )}
            </div>

            <footer className="playground-readiness-panel__footer">
              <span>
                Warnings may represent empty workspace data rather than broken functionality.
              </span>

              <span>
                ⌘⇧R
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
# Release readiness styling
# ------------------------------------------------------------

cat > src/collaboration/release-readiness/release-readiness-panel.css <<'EOF'
.playground-readiness-overlay {
  position: fixed;
  inset: 0;
  z-index: 15000;
  display: grid;
  place-items: center;
  padding: 28px;
  background:
    rgba(0, 0, 0, 0.59);
  backdrop-filter:
    blur(18px);
  animation:
    playground-readiness-fade
    150ms ease-out;
}

.playground-readiness-panel {
  width:
    min(1000px, 96vw);
  height:
    min(730px, 89vh);
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
    0 38px 115px
    rgba(0, 0, 0, 0.65);
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  animation:
    playground-readiness-rise
    200ms
    cubic-bezier(
      0.22,
      1,
      0.36,
      1
    );
}

.playground-readiness-panel__header {
  min-height: 94px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 20px 24px;
  border-bottom: 1px solid
    rgba(255, 255, 255, 0.08);
}

.playground-readiness-panel__eyebrow {
  margin: 0 0 4px;
  color:
    rgba(255, 255, 255, 0.36);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.playground-readiness-panel__header h2 {
  margin: 0;
  font-size: 25px;
  font-weight: 680;
  letter-spacing: -0.035em;
}

.playground-readiness-panel__header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.playground-readiness-panel__score {
  min-height: 48px;
  display: grid;
  grid-template-columns:
    auto auto;
  align-items: center;
  gap: 9px;
  padding: 0 13px;
  border-radius: 13px;
  background:
    rgba(255, 255, 255, 0.055);
}

.playground-readiness-panel__score strong {
  font-size: 17px;
}

.playground-readiness-panel__score span {
  color:
    rgba(255, 255, 255, 0.48);
  font-size: 9px;
}

.playground-readiness-panel__score--ready {
  background:
    rgba(66, 180, 96, 0.12);
}

.playground-readiness-panel__score--ready strong,
.playground-readiness-panel__score--ready span {
  color: #a7ecb9;
}

.playground-readiness-panel__score--warning {
  background:
    rgba(210, 164, 63, 0.12);
}

.playground-readiness-panel__score--warning strong,
.playground-readiness-panel__score--warning span {
  color: #f0d28b;
}

.playground-readiness-panel__score--failed {
  background:
    rgba(221, 70, 70, 0.13);
}

.playground-readiness-panel__score--failed strong,
.playground-readiness-panel__score--failed span {
  color: #ffb4b4;
}

.playground-readiness-panel__close {
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

.playground-readiness-panel__summary {
  min-height: 70px;
  display: flex;
  align-items: center;
  gap: 34px;
  padding: 12px 24px;
  border-bottom: 1px solid
    rgba(255, 255, 255, 0.07);
}

.playground-readiness-panel__summary > div {
  display: grid;
  gap: 3px;
}

.playground-readiness-panel__summary strong {
  font-size: 17px;
  font-weight: 680;
}

.playground-readiness-panel__summary span {
  color:
    rgba(255, 255, 255, 0.36);
  font-size: 8px;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.playground-readiness-panel__toolbar {
  min-height: 56px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  border-bottom: 1px solid
    rgba(255, 255, 255, 0.07);
}

.playground-readiness-panel__toolbar button {
  min-height: 34px;
  padding: 0 13px;
  border: 1px solid
    rgba(255, 255, 255, 0.09);
  border-radius: 9px;
  background:
    rgba(255, 255, 255, 0.05);
  color:
    rgba(255, 255, 255, 0.74);
  font: inherit;
  font-size: 9px;
  font-weight: 630;
  cursor: pointer;
}

.playground-readiness-panel__toolbar button:hover:not(
  :disabled
) {
  background:
    rgba(255, 255, 255, 0.1);
}

.playground-readiness-panel__toolbar button:disabled {
  opacity: 0.45;
  cursor: default;
}

.playground-readiness-panel__toolbar-spacer {
  flex: 1;
}

.playground-readiness-panel__toolbar > span {
  color:
    rgba(255, 255, 255, 0.29);
  font-size: 8px;
}

.playground-readiness-panel__body {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 15px;
}

.playground-readiness-panel__test-list {
  display: grid;
  gap: 7px;
}

.playground-readiness-test {
  display: grid;
  grid-template-columns:
    28px
    34px
    minmax(0, 1fr)
    auto;
  align-items: center;
  gap: 11px;
  min-height: 76px;
  padding: 10px 13px;
  border: 1px solid
    rgba(255, 255, 255, 0.055);
  border-radius: 14px;
  background:
    rgba(255, 255, 255, 0.024);
}

.playground-readiness-test__number {
  color:
    rgba(255, 255, 255, 0.25);
  font-family:
    ui-monospace,
    SFMono-Regular,
    Menlo,
    Monaco,
    Consolas,
    monospace;
  font-size: 8px;
}

.playground-readiness-test__state {
  width: 31px;
  height: 31px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background:
    rgba(255, 255, 255, 0.055);
  color:
    rgba(255, 255, 255, 0.48);
  font-size: 12px;
}

.playground-readiness-test__state--passed {
  color: #a7ecb9;
  background:
    rgba(66, 180, 96, 0.12);
}

.playground-readiness-test__state--warning {
  color: #f0d28b;
  background:
    rgba(210, 164, 63, 0.12);
}

.playground-readiness-test__state--failed {
  color: #ffb4b4;
  background:
    rgba(221, 70, 70, 0.13);
}

.playground-readiness-test__state--running {
  animation:
    playground-readiness-pulse
    900ms ease-in-out
    infinite;
}

.playground-readiness-test__copy {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.playground-readiness-test__copy > div {
  display: flex;
  align-items: center;
  gap: 8px;
}

.playground-readiness-test__copy strong {
  color:
    rgba(255, 255, 255, 0.86);
  font-size: 11px;
  font-weight: 630;
}

.playground-readiness-test__copy > div span {
  padding: 3px 6px;
  border-radius: 999px;
  background:
    rgba(255, 255, 255, 0.05);
  color:
    rgba(255, 255, 255, 0.33);
  font-size: 7px;
  text-transform: uppercase;
}

.playground-readiness-test__copy p {
  margin: 0;
  color:
    rgba(255, 255, 255, 0.35);
  font-size: 8px;
}

.playground-readiness-test__copy small {
  overflow: hidden;
  color:
    rgba(255, 255, 255, 0.52);
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.playground-readiness-test time {
  color:
    rgba(255, 255, 255, 0.25);
  font-family:
    ui-monospace,
    SFMono-Regular,
    Menlo,
    Monaco,
    Consolas,
    monospace;
  font-size: 7px;
}

.playground-readiness-panel__empty {
  min-height: 360px;
  display: grid;
  place-items: center;
  align-content: center;
  color:
    rgba(255, 255, 255, 0.34);
  text-align: center;
}

.playground-readiness-panel__empty > span {
  margin-bottom: 14px;
  font-size: 34px;
}

.playground-readiness-panel__empty h3 {
  margin: 0 0 7px;
  color:
    rgba(255, 255, 255, 0.72);
  font-size: 14px;
}

.playground-readiness-panel__empty p {
  max-width: 370px;
  margin: 0;
  font-size: 10px;
  line-height: 1.55;
}

.playground-readiness-panel__footer {
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

@keyframes playground-readiness-fade {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes playground-readiness-rise {
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

@keyframes playground-readiness-pulse {
  0%,
  100% {
    opacity: 0.45;
  }

  50% {
    opacity: 1;
  }
}

@media (max-width: 700px) {
  .playground-readiness-overlay {
    padding: 10px;
  }

  .playground-readiness-panel {
    width: 100%;
    height: 94vh;
    border-radius: 18px;
  }

  .playground-readiness-panel__header {
    padding: 16px;
  }

  .playground-readiness-panel__score span {
    display: none;
  }

  .playground-readiness-panel__summary {
    gap: 20px;
    padding-right: 16px;
    padding-left: 16px;
  }

  .playground-readiness-panel__toolbar {
    padding-right: 16px;
    padding-left: 16px;
  }

  .playground-readiness-panel__toolbar > span {
    display: none;
  }

  .playground-readiness-test {
    grid-template-columns:
      28px
      minmax(0, 1fr)
      auto;
  }

  .playground-readiness-test__number {
    display: none;
  }

  .playground-readiness-test__copy small {
    white-space: normal;
  }
}
EOF

# ------------------------------------------------------------
# Public exports
# ------------------------------------------------------------

cat > src/collaboration/release-readiness/index.ts <<'EOF'
export {
  default as ReleaseReadinessPanel,
} from "./ReleaseReadinessPanel";

export {
  calculateReadinessScore,
  createReleaseReport,
  formatReleaseReport,
  RELEASE_READINESS_TESTS,
  runReadinessTest,
} from "./readinessTests";

export type {
  ReadinessTestResult,
  ReadinessTestState,
  ReleaseReadinessReport,
} from "./types";
EOF

# ------------------------------------------------------------
# Mount release readiness panel in main.tsx
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
        'import ReleaseReadinessPanel '
        'from "./collaboration/release-readiness/ReleaseReadinessPanel";\n'
    ),
    'from "./collaboration/release-readiness/ReleaseReadinessPanel"',
)

if "<ReleaseReadinessPanel />" not in text:
    anchors = [
        "<CollaborationDiagnosticsPanel />",
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
            "❌ No suitable ReleaseReadinessPanel mount location was found in src/main.tsx."
        )

    text = text.replace(
        selected_anchor,
        (
            selected_anchor
            + "\n                "
            + "<ReleaseReadinessPanel />"
        ),
        1,
    )

path.write_text(text)

print("✅ ReleaseReadinessPanel imported.")
print("✅ ReleaseReadinessPanel mounted.")
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
echo "Release Readiness features:"
echo "  • Automated startup validation"
echo "  • Collaboration event-bus test"
echo "  • Persistence storage test"
echo "  • Session storage verification"
echo "  • Visual history verification"
echo "  • Object scanner verification"
echo "  • Panel mount verification"
echo "  • Runtime connection check"
echo "  • Clipboard capability check"
echo "  • Release readiness score"
echo "  • Copyable release report"
echo "  • Command/Ctrl + Shift + R shortcut"
echo ""
echo "Launch the Tauri app with:"
echo "  ./open-playground-tauri.sh"
