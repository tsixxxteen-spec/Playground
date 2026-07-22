import type {
  SharedMutationInput,
  SharedWorldMutation,
} from "./types";

type MutationIdentity = {
  participantId: string;
  participantName: string;
  revision: number;
};

function createMutationId() {
  if (
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto
  ) {
    return crypto.randomUUID();
  }

  return [
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 10),
  ].join("-");
}

export function createSharedMutation(
  input: SharedMutationInput,
  identity: MutationIdentity,
): SharedWorldMutation {
  const base = {
    id: createMutationId(),
    objectId: input.objectId,
    participantId: identity.participantId,
    participantName: identity.participantName,
    revision: identity.revision,
    createdAt: Date.now(),
  };

  switch (input.kind) {
    case "object-moved":
      return {
        ...base,
        kind: input.kind,
        position: input.position,
      };

    case "object-resized":
      return {
        ...base,
        kind: input.kind,
        size: input.size,
      };

    case "object-properties-updated":
      return {
        ...base,
        kind: input.kind,
        properties: input.properties,
      };

    case "object-deleted":
      return {
        ...base,
        kind: input.kind,
      };

    default: {
      const exhaustiveCheck: never = input;
      return exhaustiveCheck;
    }
  }
}
