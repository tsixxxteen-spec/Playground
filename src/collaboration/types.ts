import type {
  CollaborationInvitation,
  IncomingCollaborationInvitation,
} from "./invitationTypes";

export type CollaborationActivityState =
  | "active"
  | "idle"
  | "away";

export type CollaborationRole =
  | "owner"
  | "collaborator";

export type CollaborationParticipant = {
  id: string;
  name: string;
  avatarUrl?: string;
  role: CollaborationRole;
  isOnline: boolean;
  activityState?: CollaborationActivityState;
  selectedObjectId?: string | null;
};

export type CollaborationSession = {
  id: string;
  name: string;
  isShared: boolean;
  createdAt: number;
  ownerId: string;
  participants: CollaborationParticipant[];
  pendingInvitations: CollaborationInvitation[];
  incomingInvitations: IncomingCollaborationInvitation[];
};
