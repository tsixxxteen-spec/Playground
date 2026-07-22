export type SharedObjectSelection = {
  participantId: string;
  participantName: string;
  objectId: string;
  selectedAt: number;
};

export type SharedObjectLock = {
  objectId: string;
  ownerId: string;
  ownerName: string;
  acquiredAt: number;
  expiresAt: number;
};

export type SharedLockTakeoverRequest = {
  id: string;
  objectId: string;
  requesterId: string;
  requesterName: string;
  currentOwnerId: string;
  requestedAt: number;
};
