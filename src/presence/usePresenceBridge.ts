import { useEffect } from "react";
import { useCollaborationSession } from "../collaboration/CollaborationSessionContext";
import type { CollaborationParticipant } from "../collaboration/types";
import {
  PRESENCE_EVENT_NAME,
} from "./presenceEvents";
import type {
  PresenceEventDetail,
} from "./presenceEvents";

function mergeParticipant(
  participants: CollaborationParticipant[],
  incomingParticipant: CollaborationParticipant,
) {
  const existingIndex = participants.findIndex(
    (participant) =>
      participant.id === incomingParticipant.id,
  );

  if (existingIndex === -1) {
    return [
      ...participants,
      incomingParticipant,
    ];
  }

  return participants.map((participant) =>
    participant.id === incomingParticipant.id
      ? {
          ...participant,
          ...incomingParticipant,
        }
      : participant,
  );
}

export function usePresenceBridge() {
  const {
    session,
    setParticipants,
  } = useCollaborationSession();

  useEffect(() => {
    const handlePresenceEvent = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<PresenceEventDetail>;

      const detail = customEvent.detail;

      if (!detail) {
        return;
      }

      switch (detail.type) {
        case "snapshot": {
          setParticipants(detail.participants);
          break;
        }

        case "participant-joined":
        case "participant-updated": {
          setParticipants(
            mergeParticipant(
              session.participants,
              detail.participant,
            ),
          );
          break;
        }

        case "participant-left": {
          setParticipants(
            session.participants.filter(
              (participant) =>
                participant.id !==
                detail.participantId,
            ),
          );
          break;
        }

        default:
          break;
      }
    };

    window.addEventListener(
      PRESENCE_EVENT_NAME,
      handlePresenceEvent,
    );

    return () => {
      window.removeEventListener(
        PRESENCE_EVENT_NAME,
        handlePresenceEvent,
      );
    };
  }, [
    session.participants,
    setParticipants,
  ]);
}
