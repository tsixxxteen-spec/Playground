#!/usr/bin/env bash

set -euo pipefail

SPRINT_ID="21B.10"
MARKER=".playground-sprint-21B10-installed"
BACKUP_DIR=".playground-backups/sprint-21B10-$(date +%Y%m%d-%H%M%S)"

fail() {
  echo "❌ $*" >&2
  exit 1
}

[[ -f package.json ]] || fail "Run this installer from the Playground project root."
[[ -f src/main.tsx ]] || fail "src/main.tsx was not found."
[[ -f src/collaboration/recovery/snapshot.ts ]] || fail "Sprint 21B.9 recovery snapshots were not found."
[[ -f src/collaboration/recovery/SharedRecoveryContext.tsx ]] || fail "SharedRecoveryContext was not found."
[[ -f src/collaboration/mutations/SharedMutationContext.tsx ]] || fail "SharedMutationContext was not found."

if [[ -f "$MARKER" ]]; then
  echo "✅ Sprint $SPRINT_ID is already installed."
  exit 0
fi

mkdir -p "$BACKUP_DIR"
mkdir -p src/collaboration/persistence

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

    rm -rf src/collaboration/persistence
    rm -f "$MARKER"

    echo "✅ Rollback complete."
  fi

  exit "$code"
}

trap rollback EXIT

# ------------------------------------------------------------
# Persistence types
# ------------------------------------------------------------

cat > src/collaboration/persistence/types.ts <<'EOF'
import type {
  SharedObjectSnapshot,
} from "../recovery/types";

export const PLAYGROUND_CHECKPOINT_VERSION = 1;

export type PlaygroundSessionCheckpoint = {
  version: number;
  id: string;
  storageKey: string;
  pathname: string;
  createdAt: number;
  updatedAt: number;
  objects: SharedObjectSnapshot[];
};

export type PlaygroundImportDetail = {
  checkpoint?: PlaygroundSessionCheckpoint;
  json?: string;
};

export type PlaygroundCheckpointEventDetail = {
  checkpoint: PlaygroundSessionCheckpoint;
  source:
    | "automatic"
    | "manual"
    | "restore"
    | "import";
};
EOF

# ------------------------------------------------------------
# Checkpoint storage utilities
# ------------------------------------------------------------

cat > src/collaboration/persistence/checkpointStorage.ts <<'EOF'
import {
  captureAllSharedObjectSnapshots,
  findSharedObjectElement,
  restoreSharedObjectSnapshot,
} from "../recovery/snapshot";

import {
  PLAYGROUND_CHECKPOINT_VERSION,
} from "./types";

import type {
  SharedObjectSnapshot,
} from "../recovery/types";

import type {
  PlaygroundSessionCheckpoint,
} from "./types";

const STORAGE_PREFIX =
  "playground:shared-session:";

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

export function getCheckpointStorageKey(): string {
  const path =
    window.location.pathname || "/";

  const search =
    window.location.search || "";

  return `${STORAGE_PREFIX}${path}${search}`;
}

export function createCheckpoint(): PlaygroundSessionCheckpoint {
  const storageKey =
    getCheckpointStorageKey();

  const previous =
    readCheckpoint(storageKey);

  const now =
    Date.now();

  return {
    version:
      PLAYGROUND_CHECKPOINT_VERSION,
    id:
      previous?.id ??
      createId(),
    storageKey,
    pathname:
      window.location.pathname,
    createdAt:
      previous?.createdAt ??
      now,
    updatedAt:
      now,
    objects:
      captureAllSharedObjectSnapshots(),
  };
}

export function isCheckpoint(
  value: unknown,
): value is PlaygroundSessionCheckpoint {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const candidate =
    value as Partial<
      PlaygroundSessionCheckpoint
    >;

  return (
    candidate.version ===
      PLAYGROUND_CHECKPOINT_VERSION &&
    typeof candidate.id === "string" &&
    typeof candidate.storageKey ===
      "string" &&
    typeof candidate.pathname ===
      "string" &&
    typeof candidate.createdAt ===
      "number" &&
    typeof candidate.updatedAt ===
      "number" &&
    Array.isArray(candidate.objects)
  );
}

export function saveCheckpoint(
  checkpoint:
    PlaygroundSessionCheckpoint,
): void {
  localStorage.setItem(
    checkpoint.storageKey,
    JSON.stringify(checkpoint),
  );
}

export function readCheckpoint(
  storageKey =
    getCheckpointStorageKey(),
): PlaygroundSessionCheckpoint | null {
  const raw =
    localStorage.getItem(storageKey);

  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown =
      JSON.parse(raw);

    if (!isCheckpoint(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function deleteCheckpoint(
  storageKey =
    getCheckpointStorageKey(),
): void {
  localStorage.removeItem(
    storageKey,
  );
}

function removeObjectsMissingFromCheckpoint(
  snapshots:
    SharedObjectSnapshot[],
): void {
  const incomingIds =
    new Set(
      snapshots
        .filter(
          (snapshot) =>
            snapshot.exists,
        )
        .map(
          (snapshot) =>
            snapshot.objectId,
        ),
    );

  document
    .querySelectorAll<HTMLElement>(
      "[data-playground-object-id]",
    )
    .forEach((element) => {
      const objectId =
        element.dataset
          .playgroundObjectId;

      if (
        objectId &&
        !incomingIds.has(objectId)
      ) {
        element.remove();
      }
    });
}

function restoreSnapshotsInPasses(
  snapshots:
    SharedObjectSnapshot[],
): void {
  const pending =
    [...snapshots];

  const maximumPasses =
    Math.max(
      pending.length + 1,
      2,
    );

  for (
    let pass = 0;
    pass < maximumPasses;
    pass += 1
  ) {
    if (pending.length === 0) {
      break;
    }

    let restoredThisPass = 0;

    for (
      let index =
        pending.length - 1;
      index >= 0;
      index -= 1
    ) {
      const snapshot =
        pending[index];

      const parentReady =
        !snapshot.parentObjectId ||
        Boolean(
          findSharedObjectElement(
            snapshot.parentObjectId,
          ),
        );

      if (!parentReady) {
        continue;
      }

      restoreSharedObjectSnapshot(
        snapshot,
      );

      pending.splice(
        index,
        1,
      );

      restoredThisPass += 1;
    }

    if (restoredThisPass === 0) {
      break;
    }
  }

  for (const snapshot of pending) {
    restoreSharedObjectSnapshot(
      snapshot,
    );
  }
}

export function restoreCheckpoint(
  checkpoint:
    PlaygroundSessionCheckpoint,
): void {
  if (!isCheckpoint(checkpoint)) {
    throw new Error(
      "Invalid Playground checkpoint.",
    );
  }

  removeObjectsMissingFromCheckpoint(
    checkpoint.objects,
  );

  restoreSnapshotsInPasses(
    checkpoint.objects,
  );
}

export function checkpointToJson(
  checkpoint:
    PlaygroundSessionCheckpoint,
): string {
  return JSON.stringify(
    checkpoint,
    null,
    2,
  );
}

export function checkpointFromJson(
  json: string,
): PlaygroundSessionCheckpoint {
  const parsed: unknown =
    JSON.parse(json);

  if (!isCheckpoint(parsed)) {
    throw new Error(
      "The selected file is not a valid Playground session checkpoint.",
    );
  }

  return parsed;
}
EOF

# ------------------------------------------------------------
# Public persistence events
# ------------------------------------------------------------

cat > src/collaboration/persistence/events.ts <<'EOF'
import type {
  PlaygroundImportDetail,
  PlaygroundSessionCheckpoint,
} from "./types";

export const PLAYGROUND_SAVE_CHECKPOINT_EVENT =
  "playground:save-checkpoint";

export const PLAYGROUND_RESTORE_CHECKPOINT_EVENT =
  "playground:restore-checkpoint";

export const PLAYGROUND_EXPORT_SESSION_EVENT =
  "playground:export-session";

export const PLAYGROUND_IMPORT_SESSION_EVENT =
  "playground:import-session";

export const PLAYGROUND_CLEAR_CHECKPOINT_EVENT =
  "playground:clear-checkpoint";

export const PLAYGROUND_CHECKPOINT_SAVED_EVENT =
  "playground:checkpoint-saved";

export const PLAYGROUND_CHECKPOINT_RESTORED_EVENT =
  "playground:checkpoint-restored";

export const PLAYGROUND_CHECKPOINT_ERROR_EVENT =
  "playground:checkpoint-error";

export function dispatchSaveCheckpoint(): void {
  document.dispatchEvent(
    new CustomEvent(
      PLAYGROUND_SAVE_CHECKPOINT_EVENT,
    ),
  );
}

export function dispatchRestoreCheckpoint(): void {
  document.dispatchEvent(
    new CustomEvent(
      PLAYGROUND_RESTORE_CHECKPOINT_EVENT,
    ),
  );
}

export function dispatchExportSession(): void {
  document.dispatchEvent(
    new CustomEvent(
      PLAYGROUND_EXPORT_SESSION_EVENT,
    ),
  );
}

export function dispatchImportSession(
  detail:
    PlaygroundImportDetail,
): void {
  document.dispatchEvent(
    new CustomEvent(
      PLAYGROUND_IMPORT_SESSION_EVENT,
      {
        detail,
      },
    ),
  );
}

export function dispatchClearCheckpoint(): void {
  document.dispatchEvent(
    new CustomEvent(
      PLAYGROUND_CLEAR_CHECKPOINT_EVENT,
    ),
  );
}

export function dispatchCheckpointRestored(
  checkpoint:
    PlaygroundSessionCheckpoint,
): void {
  document.dispatchEvent(
    new CustomEvent(
      PLAYGROUND_CHECKPOINT_RESTORED_EVENT,
      {
        detail: {
          checkpoint,
        },
      },
    ),
  );
}
EOF

# ------------------------------------------------------------
# Persistent session bridge
# ------------------------------------------------------------

cat > src/collaboration/persistence/PersistentSessionBridge.tsx <<'EOF'
import {
  useEffect,
  useRef,
} from "react";

import {
  useSharedMutations,
} from "../mutations/SharedMutationContext";

import {
  useSharedRecovery,
} from "../recovery/SharedRecoveryContext";

import {
  checkpointFromJson,
  checkpointToJson,
  createCheckpoint,
  deleteCheckpoint,
  getCheckpointStorageKey,
  readCheckpoint,
  restoreCheckpoint,
  saveCheckpoint,
} from "./checkpointStorage";

import {
  PLAYGROUND_CHECKPOINT_ERROR_EVENT,
  PLAYGROUND_CHECKPOINT_RESTORED_EVENT,
  PLAYGROUND_CHECKPOINT_SAVED_EVENT,
  PLAYGROUND_CLEAR_CHECKPOINT_EVENT,
  PLAYGROUND_EXPORT_SESSION_EVENT,
  PLAYGROUND_IMPORT_SESSION_EVENT,
  PLAYGROUND_RESTORE_CHECKPOINT_EVENT,
  PLAYGROUND_SAVE_CHECKPOINT_EVENT,
} from "./events";

import type {
  PlaygroundCheckpointEventDetail,
  PlaygroundImportDetail,
  PlaygroundSessionCheckpoint,
} from "./types";

const AUTOSAVE_INTERVAL_MS =
  2_000;

const INITIAL_RESTORE_DELAY_MS =
  150;

function notifyError(
  error: unknown,
): void {
  const message =
    error instanceof Error
      ? error.message
      : "Unknown persistence error.";

  document.dispatchEvent(
    new CustomEvent(
      PLAYGROUND_CHECKPOINT_ERROR_EVENT,
      {
        detail: {
          message,
          error,
        },
      },
    ),
  );
}

function notifySaved(
  checkpoint:
    PlaygroundSessionCheckpoint,
  source:
    PlaygroundCheckpointEventDetail["source"],
): void {
  const detail:
    PlaygroundCheckpointEventDetail = {
      checkpoint,
      source,
    };

  document.dispatchEvent(
    new CustomEvent(
      PLAYGROUND_CHECKPOINT_SAVED_EVENT,
      {
        detail,
      },
    ),
  );
}

function notifyRestored(
  checkpoint:
    PlaygroundSessionCheckpoint,
  source:
    PlaygroundCheckpointEventDetail["source"],
): void {
  const detail:
    PlaygroundCheckpointEventDetail = {
      checkpoint,
      source,
    };

  document.dispatchEvent(
    new CustomEvent(
      PLAYGROUND_CHECKPOINT_RESTORED_EVENT,
      {
        detail,
      },
    ),
  );
}

function downloadCheckpoint(
  checkpoint:
    PlaygroundSessionCheckpoint,
): void {
  const json =
    checkpointToJson(checkpoint);

  const blob =
    new Blob(
      [json],
      {
        type:
          "application/json",
      },
    );

  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  const date =
    new Date(
      checkpoint.updatedAt,
    )
      .toISOString()
      .replace(
        /[:.]/g,
        "-",
      );

  anchor.href = url;
  anchor.download =
    `playground-session-${date}.json`;

  document.body.appendChild(
    anchor,
  );

  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

export default function PersistentSessionBridge() {
  const {
    clearMutationHistory,
  } = useSharedMutations();

  const {
    clearRecoveryHistory,
  } = useSharedRecovery();

  const restoredRef =
    useRef(false);

  const save = (
    source:
      PlaygroundCheckpointEventDetail["source"],
  ): PlaygroundSessionCheckpoint | null => {
    try {
      const checkpoint =
        createCheckpoint();

      saveCheckpoint(
        checkpoint,
      );

      notifySaved(
        checkpoint,
        source,
      );

      return checkpoint;
    } catch (error) {
      notifyError(error);
      return null;
    }
  };

  const restore = (
    checkpoint:
      PlaygroundSessionCheckpoint,
    source:
      PlaygroundCheckpointEventDetail["source"],
  ): boolean => {
    try {
      restoreCheckpoint(
        checkpoint,
      );

      clearMutationHistory();
      clearRecoveryHistory();

      notifyRestored(
        checkpoint,
        source,
      );

      return true;
    } catch (error) {
      notifyError(error);
      return false;
    }
  };

  useEffect(() => {
    const timeout =
      window.setTimeout(() => {
        if (restoredRef.current) {
          return;
        }

        restoredRef.current =
          true;

        const checkpoint =
          readCheckpoint();

        if (!checkpoint) {
          return;
        }

        restore(
          checkpoint,
          "restore",
        );
      }, INITIAL_RESTORE_DELAY_MS);

    return () => {
      window.clearTimeout(
        timeout,
      );
    };
  }, []);

  useEffect(() => {
    const interval =
      window.setInterval(() => {
        save("automatic");
      }, AUTOSAVE_INTERVAL_MS);

    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          "hidden"
        ) {
          save("automatic");
        }
      };

    const handlePageHide =
      () => {
        save("automatic");
      };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    window.addEventListener(
      "pagehide",
      handlePageHide,
    );

    return () => {
      window.clearInterval(
        interval,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

      window.removeEventListener(
        "pagehide",
        handlePageHide,
      );
    };
  }, []);

  useEffect(() => {
    const handleManualSave =
      () => {
        save("manual");
      };

    const handleManualRestore =
      () => {
        const checkpoint =
          readCheckpoint();

        if (!checkpoint) {
          notifyError(
            new Error(
              "No saved Playground checkpoint was found.",
            ),
          );

          return;
        }

        restore(
          checkpoint,
          "restore",
        );
      };

    const handleExport =
      () => {
        const checkpoint =
          save("manual");

        if (!checkpoint) {
          return;
        }

        downloadCheckpoint(
          checkpoint,
        );
      };

    const handleImport = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<
          PlaygroundImportDetail
        >;

      try {
        const detail =
          customEvent.detail;

        const checkpoint =
          detail?.checkpoint ??
          (
            detail?.json
              ? checkpointFromJson(
                  detail.json,
                )
              : null
          );

        if (!checkpoint) {
          throw new Error(
            "Import requires a checkpoint or JSON string.",
          );
        }

        const normalized:
          PlaygroundSessionCheckpoint = {
            ...checkpoint,
            storageKey:
              getCheckpointStorageKey(),
            pathname:
              window.location.pathname,
            updatedAt:
              Date.now(),
          };

        const restored =
          restore(
            normalized,
            "import",
          );

        if (!restored) {
          return;
        }

        saveCheckpoint(
          normalized,
        );

        notifySaved(
          normalized,
          "import",
        );
      } catch (error) {
        notifyError(error);
      }
    };

    const handleClear =
      () => {
        deleteCheckpoint();

        document.dispatchEvent(
          new CustomEvent(
            "playground:checkpoint-cleared",
          ),
        );
      };

    document.addEventListener(
      PLAYGROUND_SAVE_CHECKPOINT_EVENT,
      handleManualSave,
    );

    document.addEventListener(
      PLAYGROUND_RESTORE_CHECKPOINT_EVENT,
      handleManualRestore,
    );

    document.addEventListener(
      PLAYGROUND_EXPORT_SESSION_EVENT,
      handleExport,
    );

    document.addEventListener(
      PLAYGROUND_IMPORT_SESSION_EVENT,
      handleImport,
    );

    document.addEventListener(
      PLAYGROUND_CLEAR_CHECKPOINT_EVENT,
      handleClear,
    );

    return () => {
      document.removeEventListener(
        PLAYGROUND_SAVE_CHECKPOINT_EVENT,
        handleManualSave,
      );

      document.removeEventListener(
        PLAYGROUND_RESTORE_CHECKPOINT_EVENT,
        handleManualRestore,
      );

      document.removeEventListener(
        PLAYGROUND_EXPORT_SESSION_EVENT,
        handleExport,
      );

      document.removeEventListener(
        PLAYGROUND_IMPORT_SESSION_EVENT,
        handleImport,
      );

      document.removeEventListener(
        PLAYGROUND_CLEAR_CHECKPOINT_EVENT,
        handleClear,
      );
    };
  }, [
    clearMutationHistory,
    clearRecoveryHistory,
  ]);

  return null;
}
EOF

# ------------------------------------------------------------
# Public API
# ------------------------------------------------------------

cat > src/collaboration/persistence/index.ts <<'EOF'
export {
  checkpointFromJson,
  checkpointToJson,
  createCheckpoint,
  deleteCheckpoint,
  getCheckpointStorageKey,
  isCheckpoint,
  readCheckpoint,
  restoreCheckpoint,
  saveCheckpoint,
} from "./checkpointStorage";

export {
  dispatchClearCheckpoint,
  dispatchExportSession,
  dispatchImportSession,
  dispatchRestoreCheckpoint,
  dispatchSaveCheckpoint,
  PLAYGROUND_CHECKPOINT_ERROR_EVENT,
  PLAYGROUND_CHECKPOINT_RESTORED_EVENT,
  PLAYGROUND_CHECKPOINT_SAVED_EVENT,
  PLAYGROUND_CLEAR_CHECKPOINT_EVENT,
  PLAYGROUND_EXPORT_SESSION_EVENT,
  PLAYGROUND_IMPORT_SESSION_EVENT,
  PLAYGROUND_RESTORE_CHECKPOINT_EVENT,
  PLAYGROUND_SAVE_CHECKPOINT_EVENT,
} from "./events";

export {
  PLAYGROUND_CHECKPOINT_VERSION,
} from "./types";

export type {
  PlaygroundCheckpointEventDetail,
  PlaygroundImportDetail,
  PlaygroundSessionCheckpoint,
} from "./types";
EOF

# ------------------------------------------------------------
# Mount PersistentSessionBridge
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
        keepends=True
    )

    last_import_end = -1
    in_import = False

    for index, line in enumerate(lines):
        stripped = line.strip()

        if not in_import:
            if stripped.startswith("import "):
                in_import = True
                last_import_end = index

                if stripped.endswith(";"):
                    in_import = False

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
            in_import = False

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
        'import PersistentSessionBridge '
        'from "./collaboration/persistence/PersistentSessionBridge";\n'
    ),
    'from "./collaboration/persistence/PersistentSessionBridge"',
)

if "<PersistentSessionBridge />" not in text:
    anchors = [
        "<SharedRecoveryBridge />",
        "<EditorMutationAdapter />",
        "<SharedMutationBridge />",
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
            "❌ No collaboration bridge mounting anchor was found in src/main.tsx."
        )

    replacement = (
        selected_anchor
        + "\n                "
        + "<PersistentSessionBridge />"
    )

    text = text.replace(
        selected_anchor,
        replacement,
        1,
    )

path.write_text(text)

print("✅ PersistentSessionBridge imported.")
print("✅ PersistentSessionBridge mounted.")
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
echo "Automatic persistence:"
echo "  • Saves every 2 seconds"
echo "  • Saves when the app is hidden"
echo "  • Saves when the page closes"
echo "  • Restores after refresh or restart"
echo ""
echo "Commands:"
echo "  playground:save-checkpoint"
echo "  playground:restore-checkpoint"
echo "  playground:export-session"
echo "  playground:import-session"
echo "  playground:clear-checkpoint"
echo ""
echo "Result events:"
echo "  playground:checkpoint-saved"
echo "  playground:checkpoint-restored"
echo "  playground:checkpoint-cleared"
echo "  playground:checkpoint-error"
