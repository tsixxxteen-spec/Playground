import {
  BroadcastChannelTransport,
} from "./BroadcastChannelTransport";

import {
  NoopTransport,
} from "./NoopTransport";

import type {
  CollaborationTransport,
} from "./types";

function createTransport():
  CollaborationTransport {
  if (
    typeof window !== "undefined" &&
    "BroadcastChannel" in window
  ) {
    return new BroadcastChannelTransport();
  }

  return new NoopTransport();
}

export const collaborationTransport =
  createTransport();

export type {
  CollaborationConnectionState,
  CollaborationTransport,
  CollaborationTransportMessage,
} from "./types";
