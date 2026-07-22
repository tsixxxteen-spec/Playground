import type {
  SharedObjectSnapshot,
} from "../recovery/types";

export const PLAYGROUND_CHECKPOINT_VERSION = 1;

export type PlaygroundSessionCheckpoint = {
  version: number;
  id: string;
  storageKey: string;
  pathname: string;
  createdAt: number;
  updatedAt: number;
  objects: SharedObjectSnapshot[];
};

export type PlaygroundImportDetail = {
  checkpoint?: PlaygroundSessionCheckpoint;
  json?: string;
};

export type PlaygroundCheckpointEventDetail = {
  checkpoint: PlaygroundSessionCheckpoint;
  source:
    | "automatic"
    | "manual"
    | "restore"
    | "import";
};
