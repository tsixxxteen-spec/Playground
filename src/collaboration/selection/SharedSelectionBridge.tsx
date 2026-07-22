import {
  useEffect,
} from "react";

import {
  useCollaborationSession,
} from "../CollaborationSessionContext";

import {
  collaborationTransport,
} from "../transport";

import {
  useSharedSelection,
} from "./SharedSelectionContext";

import {
  useSharedSelectionController,
} from "./useSharedSelectionController";

export default function SharedSelectionBridge() {
  const {
    session,
  } = useCollaborationSession();

  const {
    upsertSelection,
    removeSelection,
    upsertLock,
    removeLock,
    addTakeoverRequest,
  } = useSharedSelection();

  const {
    selectObject,
    clearSelection,
    isLockedByOther,
    requestTakeover,
  } = useSharedSelectionController();

  const localParticipant =
    session.participants.find(
      (participant) =>
        participant.id ===
          "local-owner" ||
        participant.name === "You",
    ) ?? session.participants[0];

  useEffect(() => {
    return collaborationTransport.subscribe(
      (message) => {
        switch (message.type) {
          case "selection-updated": {
            upsertSelection(
              message.selection,
            );

            break;
          }

          case "selection-cleared": {
            removeSelection(
              message.participantId,
            );

            break;
          }

          case "lock-acquired": {
            upsertLock(
              message.lock,
            );

            break;
          }

          case "lock-released": {
            removeLock(
              message.objectId,
            );

            break;
          }

          case "lock-takeover-requested": {
            addTakeoverRequest(
              message.request,
            );

            break;
          }

          case "session-leave": {
            removeSelection(
              message.participantId,
            );

            break;
          }

          default:
            break;
        }
      },
    );
  }, [
    upsertSelection,
    removeSelection,
    upsertLock,
    removeLock,
    addTakeoverRequest,
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

      const objectElement =
        target.closest<HTMLElement>(
          "[data-playground-object-id]",
        );

      if (!objectElement) {
        clearSelection();
        return;
      }

      const objectId =
        objectElement.dataset
          .playgroundObjectId;

      if (
        !objectId ||
        !localParticipant
      ) {
        return;
      }

      if (
        isLockedByOther(
          objectId,
          localParticipant.id,
        )
      ) {
        event.preventDefault();
        event.stopPropagation();

        objectElement.dispatchEvent(
          new CustomEvent(
            "playground:object-locked",
            {
              bubbles: true,
              detail: {
                objectId,
              },
            },
          ),
        );

        return;
      }

      selectObject(
        objectId,
        true,
      );
    };

    const handleTakeoverRequest = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<{
          objectId?: string;
        }>;

      const objectId =
        customEvent.detail?.objectId;

      if (objectId) {
        requestTakeover(
          objectId,
        );
      }
    };

    document.addEventListener(
      "pointerdown",
      handlePointerDown,
      true,
    );

    document.addEventListener(
      "playground:request-lock-takeover",
      handleTakeoverRequest,
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
        true,
      );

      document.removeEventListener(
        "playground:request-lock-takeover",
        handleTakeoverRequest,
      );
    };
  }, [
    localParticipant,
    selectObject,
    clearSelection,
    isLockedByOther,
    requestTakeover,
  ]);

  return null;
}
