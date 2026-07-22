import type {
  CollaborationActivityState,
} from "../types";

export type SharedCursorPosition = {
  x: number;
  y: number;
};

export type SharedCursorPresence = {
  participantId: string;
  participantName: string;
  position: SharedCursorPosition;
  activityState: CollaborationActivityState;
  selectedObjectId?: string | null;
  updatedAt: number;
};
