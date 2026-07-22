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
