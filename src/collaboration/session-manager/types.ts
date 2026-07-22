import type {
  PlaygroundSessionCheckpoint,
} from "../persistence/types";

export type ManagedSession =
  PlaygroundSessionCheckpoint & {
    name?: string;
  };

export type SessionSaveStatus =
  | "saved"
  | "saving"
  | "error"
  | "idle";
