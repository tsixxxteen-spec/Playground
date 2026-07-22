export const SHARED_UNDO_EVENT =
  "playground:undo";

export const SHARED_REDO_EVENT =
  "playground:redo";

export const SHARED_RESYNC_EVENT =
  "playground:request-resync";

export function dispatchSharedUndo() {
  document.dispatchEvent(
    new CustomEvent(
      SHARED_UNDO_EVENT,
    ),
  );
}

export function dispatchSharedRedo() {
  document.dispatchEvent(
    new CustomEvent(
      SHARED_REDO_EVENT,
    ),
  );
}

export function dispatchSharedResync() {
  document.dispatchEvent(
    new CustomEvent(
      SHARED_RESYNC_EVENT,
    ),
  );
}
