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
