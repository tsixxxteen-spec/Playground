import {
  useCallback,
  useEffect,
  useRef,
} from "react";

import {
  useCollaborationSession,
} from "../CollaborationSessionContext";

import {
  dispatchSharedWorldMutation,
  SHARED_WORLD_MUTATION_APPLIED_EVENT,
  SHARED_WORLD_MUTATION_REJECTED_EVENT,
} from "../mutations/events";

import {
  useSharedMutations,
} from "../mutations/SharedMutationContext";

import {
  collaborationTransport,
} from "../transport";

import {
  useCollaborationTransport,
} from "../transport/CollaborationTransportContext";

import {
  createTransportMessage,
} from "../transport/messageFactory";

import {
  captureAllSharedObjectSnapshots,
  captureSharedObjectSnapshot,
  restoreSharedObjectSnapshot,
} from "./snapshot";

import {
  useSharedRecovery,
} from "./SharedRecoveryContext";

import type {
  SharedMutationDispatchDetail,
  SharedMutationInput,
  SharedWorldMutation,
} from "../mutations/types";

import type {
  SharedHistoryEntry,
  SharedObjectSnapshot,
  SharedResyncRequest,
  SharedResyncSnapshot,
} from "./types";

function createId() {
  if (
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto
  ) {
    return crypto.randomUUID();
  }

  return [
    Date.now().toString(36),
    Math.random().toString(36).slice(2),
  ].join("-");
}

function mutationToInput(
  mutation: SharedWorldMutation,
): SharedMutationInput {
  switch (mutation.kind) {
    case "object-moved":
      return {
        kind: mutation.kind,
        objectId:
          mutation.objectId,
        position:
          mutation.position,
      };

    case "object-resized":
      return {
        kind: mutation.kind,
        objectId:
          mutation.objectId,
        size: mutation.size,
      };

    case "object-properties-updated":
      return {
        kind: mutation.kind,
        objectId:
          mutation.objectId,
        properties:
          mutation.properties,
      };

    case "object-deleted":
      return {
        kind: mutation.kind,
        objectId:
          mutation.objectId,
      };

    default: {
      const exhaustiveCheck:
        never = mutation;

      return exhaustiveCheck;
    }
  }
}

function snapshotToMutationInput(
  snapshot: SharedObjectSnapshot,
): SharedMutationInput | null {
  if (!snapshot.exists) {
    return {
      kind: "object-deleted",
      objectId:
        snapshot.objectId,
    };
  }

  if (snapshot.position) {
    return {
      kind: "object-moved",
      objectId:
        snapshot.objectId,
      position:
        snapshot.position,
    };
  }

  if (snapshot.size) {
    return {
      kind: "object-resized",
      objectId:
        snapshot.objectId,
      size: snapshot.size,
    };
  }

  if (snapshot.properties) {
    return {
      kind:
        "object-properties-updated",
      objectId:
        snapshot.objectId,
      properties:
        snapshot.properties,
    };
  }

  return null;
}

function restoreWorld(
  objects:
    SharedObjectSnapshot[],
) {
  const incomingIds =
    new Set(
      objects
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
        !incomingIds.has(
          objectId,
        )
      ) {
        element.remove();
      }
    });

  for (const snapshot of objects) {
    restoreSharedObjectSnapshot(
      snapshot,
    );
  }
}

export default function SharedRecoveryBridge() {
  const {
    session,
  } = useCollaborationSession();

  const {
    send,
  } = useCollaborationTransport();

  const {
    clearMutationHistory,
  } = useSharedMutations();

  const {
    pushHistoryEntry,
    popUndoEntry,
    popRedoEntry,
    pushRedoEntry,
    pushUndoEntry,
    clearRecoveryHistory,
  } = useSharedRecovery();

  const beforeSnapshotsRef =
    useRef<
      Map<
        string,
        SharedObjectSnapshot
      >
    >(new Map());

  const resyncInProgressRef =
    useRef(false);

  const localParticipant =
    session.participants.find(
      (participant) =>
        participant.id ===
          "local-owner" ||
        participant.name === "You",
    ) ?? session.participants[0];

  const performUndo =
    useCallback(() => {
      if (!localParticipant) {
        return;
      }

      const entry =
        popUndoEntry(
          localParticipant.id,
        );

      if (!entry) {
        return;
      }

      restoreSharedObjectSnapshot(
        entry.before,
      );

      const inverse =
        snapshotToMutationInput(
          entry.before,
        );

      if (inverse) {
        dispatchSharedWorldMutation(
          inverse,
        );
      }

      pushRedoEntry(entry);

      document.dispatchEvent(
        new CustomEvent(
          "playground:undo-completed",
          {
            detail: {
              entry,
            },
          },
        ),
      );
    }, [
      localParticipant,
      popUndoEntry,
      pushRedoEntry,
    ]);

  const performRedo =
    useCallback(() => {
      if (!localParticipant) {
        return;
      }

      const entry =
        popRedoEntry(
          localParticipant.id,
        );

      if (!entry) {
        return;
      }

      restoreSharedObjectSnapshot(
        entry.after,
      );

      dispatchSharedWorldMutation(
        mutationToInput(
          entry.mutation,
        ),
      );

      pushUndoEntry(entry);

      document.dispatchEvent(
        new CustomEvent(
          "playground:redo-completed",
          {
            detail: {
              entry,
            },
          },
        ),
      );
    }, [
      localParticipant,
      popRedoEntry,
      pushUndoEntry,
    ]);

  const requestResync =
    useCallback(() => {
      if (!localParticipant) {
        return;
      }

      const request:
        SharedResyncRequest = {
          id: createId(),
          participantId:
            localParticipant.id,
          requestedAt:
            Date.now(),
        };

      resyncInProgressRef.current =
        true;

      send(
        createTransportMessage({
          type:
            "session-resync-requested",
          sessionId:
            session.id,
          senderId:
            localParticipant.id,
          request,
        }),
      );
    }, [
      session.id,
      localParticipant,
      send,
    ]);

  useEffect(() => {
    const handlePointerDown = (
      event: PointerEvent,
    ) => {
      const target =
        event.target;

      if (
        !(target instanceof Element)
      ) {
        return;
      }

      const element =
        target.closest<HTMLElement>(
          "[data-playground-object-id]",
        );

      const objectId =
        element?.dataset
          .playgroundObjectId;

      if (!objectId) {
        return;
      }

      beforeSnapshotsRef.current.set(
        objectId,
        captureSharedObjectSnapshot(
          objectId,
        ),
      );
    };

    document.addEventListener(
      "pointerdown",
      handlePointerDown,
      true,
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
        true,
      );
    };
  }, []);

  useEffect(() => {
    const handleMutationApplied = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<
          SharedMutationDispatchDetail
        >;

      const detail =
        customEvent.detail;

      if (
        !detail ||
        !detail.mutation ||
        detail.remote
      ) {
        return;
      }

      const mutation =
        detail.mutation;

      const before =
        beforeSnapshotsRef.current.get(
          mutation.objectId,
        ) ?? {
          objectId:
            mutation.objectId,
          exists:
            mutation.kind ===
              "object-deleted",
        };

      const after =
        captureSharedObjectSnapshot(
          mutation.objectId,
        );

      const entry:
        SharedHistoryEntry = {
          id: createId(),
          participantId:
            mutation.participantId,
          participantName:
            mutation.participantName,
          mutation,
          before,
          after,
          createdAt:
            Date.now(),
        };

      pushHistoryEntry(
        entry,
      );

      beforeSnapshotsRef.current.delete(
        mutation.objectId,
      );
    };

    document.addEventListener(
      SHARED_WORLD_MUTATION_APPLIED_EVENT,
      handleMutationApplied,
    );

    return () => {
      document.removeEventListener(
        SHARED_WORLD_MUTATION_APPLIED_EVENT,
        handleMutationApplied,
      );
    };
  }, [pushHistoryEntry]);

  useEffect(() => {
    const handleRejectedMutation = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<{
          input?:
            SharedMutationInput;
          reason?: string;
        }>;

      const input =
        customEvent.detail
          ?.input;

      if (!input) {
        return;
      }

      const snapshot =
        beforeSnapshotsRef.current.get(
          input.objectId,
        );

      if (snapshot) {
        restoreSharedObjectSnapshot(
          snapshot,
        );
      }

      document.dispatchEvent(
        new CustomEvent(
          "playground:mutation-recovered",
          {
            detail: {
              input,
              reason:
                customEvent.detail
                  ?.reason ??
                "Mutation rejected.",
            },
          },
        ),
      );
    };

    document.addEventListener(
      SHARED_WORLD_MUTATION_REJECTED_EVENT,
      handleRejectedMutation,
    );

    return () => {
      document.removeEventListener(
        SHARED_WORLD_MUTATION_REJECTED_EVENT,
        handleRejectedMutation,
      );
    };
  }, []);

  useEffect(() => {
    const handleKeyboard = (
      event: KeyboardEvent,
    ) => {
      const target =
        event.target;

      if (
        target instanceof
          HTMLInputElement ||
        target instanceof
          HTMLTextAreaElement ||
        (
          target instanceof
            HTMLElement &&
          target.isContentEditable
        )
      ) {
        return;
      }

      const command =
        event.metaKey ||
        event.ctrlKey;

      if (!command) {
        return;
      }

      const key =
        event.key.toLowerCase();

      if (
        key === "z" &&
        event.shiftKey
      ) {
        event.preventDefault();
        performRedo();
        return;
      }

      if (key === "z") {
        event.preventDefault();
        performUndo();
        return;
      }

      if (
        key === "y" &&
        event.ctrlKey
      ) {
        event.preventDefault();
        performRedo();
      }
    };

    const handleUndoEvent = () => {
      performUndo();
    };

    const handleRedoEvent = () => {
      performRedo();
    };

    const handleResyncEvent = () => {
      requestResync();
    };

    window.addEventListener(
      "keydown",
      handleKeyboard,
    );

    document.addEventListener(
      "playground:undo",
      handleUndoEvent,
    );

    document.addEventListener(
      "playground:redo",
      handleRedoEvent,
    );

    document.addEventListener(
      "playground:request-resync",
      handleResyncEvent,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyboard,
      );

      document.removeEventListener(
        "playground:undo",
        handleUndoEvent,
      );

      document.removeEventListener(
        "playground:redo",
        handleRedoEvent,
      );

      document.removeEventListener(
        "playground:request-resync",
        handleResyncEvent,
      );
    };
  }, [
    performUndo,
    performRedo,
    requestResync,
  ]);

  useEffect(() => {
    return collaborationTransport.subscribe(
      (message) => {
        if (!localParticipant) {
          return;
        }

        switch (message.type) {
          case "session-resync-requested": {
            if (
              message.request
                .participantId ===
              localParticipant.id
            ) {
              return;
            }

            const snapshot:
              SharedResyncSnapshot = {
                id: createId(),
                sourceParticipantId:
                  localParticipant.id,
                createdAt:
                  Date.now(),
                objects:
                  captureAllSharedObjectSnapshots(),
              };

            send(
              createTransportMessage({
                type:
                  "session-resync-snapshot",
                sessionId:
                  session.id,
                senderId:
                  localParticipant.id,
                snapshot,
              }),
            );

            break;
          }

          case "session-resync-snapshot": {
            if (
              !resyncInProgressRef.current
            ) {
              return;
            }

            restoreWorld(
              message.snapshot
                .objects,
            );

            clearMutationHistory();
            clearRecoveryHistory();

            resyncInProgressRef.current =
              false;

            document.dispatchEvent(
              new CustomEvent(
                "playground:session-resynced",
                {
                  detail: {
                    snapshot:
                      message.snapshot,
                  },
                },
              ),
            );

            break;
          }

          default:
            break;
        }
      },
    );
  }, [
    session.id,
    localParticipant,
    send,
    clearMutationHistory,
    clearRecoveryHistory,
  ]);

  return null;
}
