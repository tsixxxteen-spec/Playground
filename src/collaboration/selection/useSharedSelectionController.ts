import {
  useCallback,
  useEffect,
  useRef,
} from "react";

import {
  useCollaborationSession,
} from "../CollaborationSessionContext";

import {
  useCollaborationTransport,
} from "../transport/CollaborationTransportContext";

import {
  createTransportMessage,
} from "../transport/messageFactory";

import {
  useSharedSelection,
} from "./SharedSelectionContext";

import type {
  SharedLockTakeoverRequest,
  SharedObjectLock,
  SharedObjectSelection,
} from "./types";

const DEFAULT_LOCK_DURATION_MS =
  30_000;

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

export function useSharedSelectionController() {
  const {
    session,
  } = useCollaborationSession();

  const {
    send,
  } = useCollaborationTransport();

  const {
    selections,
    locks,
    takeoverRequests,
    upsertSelection,
    removeSelection,
    upsertLock,
    removeLock,
    addTakeoverRequest,
    removeTakeoverRequest,
    getLock,
    isLockedByOther,
  } = useSharedSelection();

  const localSelectionRef =
    useRef<string | null>(null);

  const localParticipant =
    session.participants.find(
      (participant) =>
        participant.id ===
          "local-owner" ||
        participant.name === "You",
    ) ?? session.participants[0];

  const releaseLock = useCallback(
    (objectId: string) => {
      if (!localParticipant) {
        return;
      }

      const lock =
        getLock(objectId);

      if (
        lock &&
        lock.ownerId !==
          localParticipant.id
      ) {
        return;
      }

      removeLock(objectId);

      send(
        createTransportMessage({
          type: "lock-released",
          sessionId: session.id,
          senderId:
            localParticipant.id,
          objectId,
        }),
      );
    },
    [
      session.id,
      localParticipant,
      getLock,
      removeLock,
      send,
    ],
  );

  const acquireLock = useCallback(
    (
      objectId: string,
      durationMs =
        DEFAULT_LOCK_DURATION_MS,
    ): boolean => {
      if (!localParticipant) {
        return false;
      }

      if (
        isLockedByOther(
          objectId,
          localParticipant.id,
        )
      ) {
        return false;
      }

      const now = Date.now();

      const lock:
        SharedObjectLock = {
          objectId,
          ownerId:
            localParticipant.id,
          ownerName:
            localParticipant.name,
          acquiredAt: now,
          expiresAt:
            now + durationMs,
        };

      upsertLock(lock);

      send(
        createTransportMessage({
          type: "lock-acquired",
          sessionId: session.id,
          senderId:
            localParticipant.id,
          lock,
        }),
      );

      return true;
    },
    [
      session.id,
      localParticipant,
      isLockedByOther,
      upsertLock,
      send,
    ],
  );

  const selectObject = useCallback(
    (
      objectId: string,
      acquireEditingLock = true,
    ): boolean => {
      if (!localParticipant) {
        return false;
      }

      if (
        acquireEditingLock &&
        !acquireLock(objectId)
      ) {
        return false;
      }

      const previousObjectId =
        localSelectionRef.current;

      if (
        previousObjectId &&
        previousObjectId !== objectId
      ) {
        releaseLock(
          previousObjectId,
        );
      }

      localSelectionRef.current =
        objectId;

      const selection:
        SharedObjectSelection = {
          participantId:
            localParticipant.id,
          participantName:
            localParticipant.name,
          objectId,
          selectedAt: Date.now(),
        };

      upsertSelection(selection);

      send(
        createTransportMessage({
          type: "selection-updated",
          sessionId: session.id,
          senderId:
            localParticipant.id,
          selection,
        }),
      );

      return true;
    },
    [
      session.id,
      localParticipant,
      acquireLock,
      releaseLock,
      upsertSelection,
      send,
    ],
  );

  const clearSelection =
    useCallback(() => {
      if (!localParticipant) {
        return;
      }

      const objectId =
        localSelectionRef.current;

      if (objectId) {
        releaseLock(objectId);
      }

      localSelectionRef.current =
        null;

      removeSelection(
        localParticipant.id,
      );

      send(
        createTransportMessage({
          type: "selection-cleared",
          sessionId: session.id,
          senderId:
            localParticipant.id,
          participantId:
            localParticipant.id,
        }),
      );
    }, [
      session.id,
      localParticipant,
      releaseLock,
      removeSelection,
      send,
    ]);

  const requestTakeover =
    useCallback(
      (objectId: string) => {
        if (!localParticipant) {
          return;
        }

        const lock =
          getLock(objectId);

        if (
          !lock ||
          lock.ownerId ===
            localParticipant.id
        ) {
          return;
        }

        const request:
          SharedLockTakeoverRequest = {
            id: createId(),
            objectId,
            requesterId:
              localParticipant.id,
            requesterName:
              localParticipant.name,
            currentOwnerId:
              lock.ownerId,
            requestedAt:
              Date.now(),
          };

        addTakeoverRequest(
          request,
        );

        send(
          createTransportMessage({
            type:
              "lock-takeover-requested",
            sessionId:
              session.id,
            senderId:
              localParticipant.id,
            request,
          }),
        );
      },
      [
        session.id,
        localParticipant,
        getLock,
        addTakeoverRequest,
        send,
      ],
    );

  const approveTakeover =
    useCallback(
      (requestId: string) => {
        const request =
          takeoverRequests.find(
            (item) =>
              item.id === requestId,
          );

        if (!request) {
          return;
        }

        releaseLock(
          request.objectId,
        );

        removeTakeoverRequest(
          requestId,
        );
      },
      [
        takeoverRequests,
        releaseLock,
        removeTakeoverRequest,
      ],
    );

  useEffect(() => {
    return () => {
      const objectId =
        localSelectionRef.current;

      if (objectId) {
        releaseLock(objectId);
      }
    };
  }, [releaseLock]);

  return {
    selections,
    locks,
    takeoverRequests,
    selectObject,
    clearSelection,
    acquireLock,
    releaseLock,
    requestTakeover,
    approveTakeover,
    removeTakeoverRequest,
    getLock,
    isLockedByOther,
  };
}
