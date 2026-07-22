import type { CollaborationParticipant } from "../collaboration/types";
import {
  emitParticipantJoined,
  emitParticipantLeft,
  emitParticipantUpdated,
  emitPresenceSnapshot,
} from "./presenceEvents";

export type PresenceUserInput = {
  id: string;
  name: string;
  avatarUrl?: string;
  isOnline?: boolean;
  isOwner?: boolean;
};

function toCollaborationParticipant(
  user: PresenceUserInput,
): CollaborationParticipant {
  return {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
    isOnline: user.isOnline ?? true,
    role: user.isOwner
      ? "owner"
      : "collaborator",
  };
}

export class PresenceAdapter {
  sync(users: PresenceUserInput[]) {
    emitPresenceSnapshot(
      users.map(toCollaborationParticipant),
    );
  }

  joined(user: PresenceUserInput) {
    emitParticipantJoined(
      toCollaborationParticipant(user),
    );
  }

  updated(user: PresenceUserInput) {
    emitParticipantUpdated(
      toCollaborationParticipant(user),
    );
  }

  left(userId: string) {
    emitParticipantLeft(userId);
  }

  online(user: PresenceUserInput) {
    emitParticipantUpdated(
      toCollaborationParticipant({
        ...user,
        isOnline: true,
      }),
    );
  }

  offline(user: PresenceUserInput) {
    emitParticipantUpdated(
      toCollaborationParticipant({
        ...user,
        isOnline: false,
      }),
    );
  }
}

export const presenceAdapter =
  new PresenceAdapter();
