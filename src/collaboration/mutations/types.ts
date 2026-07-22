export type SharedMutationKind =
  | "object-moved"
  | "object-resized"
  | "object-properties-updated"
  | "object-deleted";

export type SharedObjectPosition = {
  x: number;
  y: number;
  z?: number;
};

export type SharedObjectSize = {
  width: number;
  height: number;
  depth?: number;
};

type SharedMutationBase = {
  id: string;
  objectId: string;
  participantId: string;
  participantName: string;
  revision: number;
  createdAt: number;
};

export type SharedObjectMovedMutation =
  SharedMutationBase & {
    kind: "object-moved";
    position: SharedObjectPosition;
  };

export type SharedObjectResizedMutation =
  SharedMutationBase & {
    kind: "object-resized";
    size: SharedObjectSize;
  };

export type SharedObjectPropertiesUpdatedMutation =
  SharedMutationBase & {
    kind: "object-properties-updated";
    properties: Record<string, unknown>;
  };

export type SharedObjectDeletedMutation =
  SharedMutationBase & {
    kind: "object-deleted";
  };

export type SharedWorldMutation =
  | SharedObjectMovedMutation
  | SharedObjectResizedMutation
  | SharedObjectPropertiesUpdatedMutation
  | SharedObjectDeletedMutation;

export type SharedMutationInput =
  | {
      kind: "object-moved";
      objectId: string;
      position: SharedObjectPosition;
    }
  | {
      kind: "object-resized";
      objectId: string;
      size: SharedObjectSize;
    }
  | {
      kind: "object-properties-updated";
      objectId: string;
      properties: Record<string, unknown>;
    }
  | {
      kind: "object-deleted";
      objectId: string;
    };

export type SharedMutationDispatchDetail = {
  mutation: SharedWorldMutation;
  remote: boolean;
};
