export type CollaborationRole = "owner" | "collaborator";

export type CollaborationParticipant = {
  id: string;
  name: string;
  avatarUrl?: string;
  role: CollaborationRole;
  isOnline: boolean;
};

export type CollaborationSession = {
  id: string;
  isShared: boolean;
  participants: CollaborationParticipant[];
};
