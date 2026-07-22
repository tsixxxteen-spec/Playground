import type {
  CollaborationTransportMessage,
} from "./types";

type RemoveGeneratedFields<T> =
  T extends unknown
    ? Omit<T, "id" | "sentAt">
    : never;

export type TransportMessageInput =
  RemoveGeneratedFields<
    CollaborationTransportMessage
  >;

function createMessageId() {
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

export function createTransportMessage(
  input: TransportMessageInput,
): CollaborationTransportMessage {
  return {
    ...input,
    id: createMessageId(),
    sentAt: Date.now(),
  } as CollaborationTransportMessage;
}
