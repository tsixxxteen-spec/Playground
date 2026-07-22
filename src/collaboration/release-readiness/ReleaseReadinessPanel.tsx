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
