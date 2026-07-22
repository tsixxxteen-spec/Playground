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
