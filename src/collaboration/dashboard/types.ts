export type CollaboratorStatus =
  | "online"
  | "idle"
  | "disconnected";

export type CollaborationConnectionStatus =
  | "connected"
  | "connecting"
  | "offline";

export type CollaborationUser = {
  id: string;
  name: string;
  status: CollaboratorStatus;
  isLocal?: boolean;
  lastSeenAt?: number;
  activeObjectId?: string;
  activeObjectName?: string;
};

export type CollaborationLock = {
  objectId: string;
  objectName?: string;
  userId: string;
  userName: string;
  acquiredAt?: number;
};

export type CollaborationDashboardSnapshot = {
  connectionStatus?:
    CollaborationConnectionStatus;
  users?: CollaborationUser[];
  locks?: CollaborationLock[];
  updatedAt?: number;
};
