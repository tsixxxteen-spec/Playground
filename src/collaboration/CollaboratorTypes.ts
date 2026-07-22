export type CollaboratorRole =
  | "owner"
  | "editor"
  | "viewer";

export type CollaboratorStatus =
  | "active"
  | "invited"
  | "offline";

export type InviteStatus =
  | "pending"
  | "accepted"
  | "revoked"
  | "expired";

export type Collaborator = {
  id: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  role: CollaboratorRole;
  status: CollaboratorStatus;
  joinedAt: number;
  lastActiveAt: number;
};

export type CollaborationInvite = {
  id: string;
  playgroundId: string;
  createdBy: string;
  recipientEmail?: string;
  recipientName?: string;
  role: Exclude<CollaboratorRole, "owner">;
  status: InviteStatus;
  token: string;
  createdAt: number;
  expiresAt?: number;
  acceptedAt?: number;
  revokedAt?: number;
};

export type CollaborationSnapshot = {
  collaborators: Collaborator[];
  currentUserId: string | null;
};

export type InviteSnapshot = {
  invites: CollaborationInvite[];
};

export type CreateInviteInput = {
  playgroundId: string;
  createdBy: string;
  recipientEmail?: string;
  recipientName?: string;
  role: Exclude<CollaboratorRole, "owner">;
  expiresAt?: number;
};

export type AddCollaboratorInput = {
  id: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  role: CollaboratorRole;
  status?: CollaboratorStatus;
};

export type CollaborationContextValue = {
  collaborators: Collaborator[];
  invites: CollaborationInvite[];
  currentUserId: string | null;
  currentCollaborator: Collaborator | null;

  setCurrentUser: (userId: string | null) => void;

  addCollaborator: (
    input: AddCollaboratorInput,
  ) => Collaborator;

  updateCollaborator: (
    id: string,
    changes: Partial<
      Omit<Collaborator, "id" | "joinedAt">
    >,
  ) => void;

  removeCollaborator: (id: string) => void;

  setCollaboratorRole: (
    id: string,
    role: CollaboratorRole,
  ) => void;

  createInvite: (
    input: CreateInviteInput,
  ) => CollaborationInvite;

  acceptInvite: (
    inviteId: string,
    collaborator: AddCollaboratorInput,
  ) => CollaborationInvite | null;

  revokeInvite: (inviteId: string) => void;

  removeInvite: (inviteId: string) => void;

  clearCollaboration: () => void;
};
