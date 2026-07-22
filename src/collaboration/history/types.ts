import type {
  PlaygroundSessionCheckpoint,
} from "../persistence/types";

export type HistoryEntryKind =
  | "snapshot"
  | "undo"
  | "redo"
  | "restore"
  | "recovery"
  | "resync"
  | "mutation";

export type PlaygroundHistoryEntry = {
  id: string;
  title: string;
  kind: HistoryEntryKind;
  createdAt: number;
  checkpoint:
    PlaygroundSessionCheckpoint;
};

export type HistoryPanelStatus =
  | "idle"
  | "saved"
  | "restored"
  | "error";
