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
