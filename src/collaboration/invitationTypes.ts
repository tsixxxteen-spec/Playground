export type CollaborationInvitationStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled";

export type CollaborationInvitation = {
  id: string;
  sessionId: string;
  sessionName: string;
  inviterId: string;
  inviterName: string;
  recipientName: string;
  recipientId?: string;
  createdAt: number;
  status: CollaborationInvitationStatus;
};

export type IncomingCollaborationInvitation = {
  id: string;
  sessionId: string;
  sessionName: string;
  inviterId: string;
  inviterName: string;
  createdAt: number;
};
