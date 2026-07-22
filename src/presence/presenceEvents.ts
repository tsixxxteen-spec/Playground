import type { CollaborationParticipant } from "../collaboration/types";

export const PRESENCE_EVENT_NAME =
  "playground:presence-update";

export type PresenceSnapshot = {
  participants: CollaborationParticipant[];
};

export type PresenceEventDetail =
  | {
      type: "snapshot";
      participants: CollaborationParticipant[];
    }
  | {
      type: "participant-joined";
      participant: CollaborationParticipant;
    }
  | {
      type: "participant-updated";
      participant: CollaborationParticipant;
    }
  | {
      type: "participant-left";
      participantId: string;
    };

export function emitPresenceEvent(
  detail: PresenceEventDetail,
) {
  window.dispatchEvent(
    new CustomEvent<PresenceEventDetail>(
      PRESENCE_EVENT_NAME,
      {
        detail,
      },
    ),
  );
}

export function emitPresenceSnapshot(
  participants: CollaborationParticipant[],
) {
  emitPresenceEvent({
    type: "snapshot",
    participants,
  });
}

export function emitParticipantJoined(
  participant: CollaborationParticipant,
) {
  emitPresenceEvent({
    type: "participant-joined",
    participant,
  });
}

export function emitParticipantUpdated(
  participant: CollaborationParticipant,
) {
  emitPresenceEvent({
    type: "participant-updated",
    participant,
  });
}

export function emitParticipantLeft(
  participantId: string,
) {
  emitPresenceEvent({
    type: "participant-left",
    participantId,
  });
}
