import type {
  SharedMutationInput,
  SharedObjectPosition,
  SharedObjectSize,
  SharedWorldMutation,
} from "../mutations/types";

export type SharedObjectSnapshot = {
  objectId: string;
  exists: boolean;
  position?: SharedObjectPosition;
  size?: SharedObjectSize;
  properties?: Record<string, unknown>;
  html?: string;
  parentObjectId?: string;
  parentSelector?: string;
  siblingIndex?: number;
};

export type SharedHistoryEntry = {
  id: string;
  participantId: string;
  participantName: string;
  mutation: SharedWorldMutation;
  before: SharedObjectSnapshot;
  after: SharedObjectSnapshot;
  createdAt: number;
};

export type SharedUndoRequest = {
  historyEntryId: string;
  participantId: string;
  requestedAt: number;
};

export type SharedRedoRequest = {
  historyEntryId: string;
  participantId: string;
  requestedAt: number;
};

export type SharedResyncRequest = {
  id: string;
  participantId: string;
  requestedAt: number;
};

export type SharedResyncSnapshot = {
  id: string;
  sourceParticipantId: string;
  createdAt: number;
  objects: SharedObjectSnapshot[];
};

export type SharedRecoveryAction =
  | {
      type: "undo";
      entry: SharedHistoryEntry;
      inverse: SharedMutationInput;
    }
  | {
      type: "redo";
      entry: SharedHistoryEntry;
      mutation: SharedMutationInput;
    };
