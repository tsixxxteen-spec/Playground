import {
  useCallback,
} from "react";

import {
  useCollaborationSession,
} from "../CollaborationSessionContext";

import {
  useSharedSelection,
} from "../selection/SharedSelectionContext";

import {
  useCollaborationTransport,
} from "../transport/CollaborationTransportContext";

import {
  createTransportMessage,
} from "../transport/messageFactory";

import {
  createSharedMutation,
} from "./mutationFactory";

import {
  useSharedMutations,
} from "./SharedMutationContext";

import type {
  SharedMutationInput,
  SharedWorldMutation,
} from "./types";

export function useSharedMutationController() {
  const {
    session,
  } = useCollaborationSession();

  const {
    send,
  } = useCollaborationTransport();

  const {
    getLock,
    isLockedByOther,
  } = useSharedSelection();

  const {
    applyMutation,
    getObjectRevision,
    getNextObjectRevision,
  } = useSharedMutations();

  const localParticipant =
    session.participants.find(
      (participant) =>
        participant.id ===
          "local-owner" ||
        participant.name === "You",
    ) ?? session.participants[0];

  const publishMutation =
    useCallback(
      (
        input:
          SharedMutationInput,
      ): SharedWorldMutation | null => {
        if (!localParticipant) {
          return null;
        }

        if (
          isLockedByOther(
            input.objectId,
            localParticipant.id,
          )
        ) {
          return null;
        }

        const lock =
          getLock(input.objectId);

        if (
          lock &&
          lock.ownerId !==
            localParticipant.id
        ) {
          return null;
        }

        const mutation =
          createSharedMutation(
            input,
            {
              participantId:
                localParticipant.id,
              participantName:
                localParticipant.name,
              revision:
                getNextObjectRevision(
                  input.objectId,
                ),
            },
          );

        const accepted =
          applyMutation(
            mutation,
          );

        if (!accepted) {
          return null;
        }

        send(
          createTransportMessage({
            type: "world-mutation",
            sessionId: session.id,
            senderId:
              localParticipant.id,
            mutation,
          }),
        );

        return mutation;
      },
      [
        session.id,
        localParticipant,
        isLockedByOther,
        getLock,
        getNextObjectRevision,
        applyMutation,
        send,
      ],
    );

  return {
    publishMutation,
    applyMutation,
    getObjectRevision,
    getNextObjectRevision,
  };
}
