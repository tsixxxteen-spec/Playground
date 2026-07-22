import type {
  CollaborationInvitation,
  IncomingCollaborationInvitation,
} from "../invitationTypes";

import type {
  SharedCursorPresence,
} from "../cursors/types";


import type {
  CollaborationParticipant,
} from "../types";

import type {
  SharedLockTakeoverRequest,
  SharedObjectLock,
  SharedObjectSelection,
} from "../selection/types";

import type {
  SharedWorldMutation,
} from "../mutations/types";

import type {
  SharedResyncRequest,
  SharedResyncSnapshot,
} from "../recovery/types";




export type CollaborationConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

export type CollaborationTransportMessage =
  | {
      id: string;
      type: "session-join";
      sessionId: string;
      senderId: string;
      sentAt: number;
      participant: CollaborationParticipant;
    }
  | {
      id: string;
      type: "session-leave";
      sessionId: string;
      senderId: string;
      sentAt: number;
      participantId: string;
    }
  | {
      id: string;
      type: "presence-snapshot";
      sessionId: string;
      senderId: string;
      sentAt: number;
      participants: CollaborationParticipant[];
    }
  | {
      id: string;
      type: "participant-updated";
      sessionId: string;
      senderId: string;
      sentAt: number;
      participant: CollaborationParticipant;
    }
  | {
      id: string;
      type: "invitation-created";
      sessionId: string;
      senderId: string;
      sentAt: number;
      invitation: CollaborationInvitation;
    }
  | {
      id: string;
      type: "invitation-received";
      sessionId: string;
      senderId: string;
      sentAt: number;
      invitation: IncomingCollaborationInvitation;
    }
  | {
      id: string;
      type: "invitation-cancelled";
      sessionId: string;
      senderId: string;
      sentAt: number;
      invitationId: string;
    }
  | {
      id: string;
      type: "session-renamed";
      sessionId: string;
      senderId: string;
      sentAt: number;
      name: string;
    }
  | {
      id: string;
      type: "cursor-updated";
      sessionId: string;
      senderId: string;
      sentAt: number;
      cursor: SharedCursorPresence;
    }
  | {
      id: string;
      type: "cursor-left";
      sessionId: string;
      senderId: string;
      sentAt: number;
      participantId: string;
    }
  | {
      id: string;
      type: "selection-updated";
      sessionId: string;
      senderId: string;
      sentAt: number;
      selection: SharedObjectSelection;
    }
  | {
      id: string;
      type: "selection-cleared";
      sessionId: string;
      senderId: string;
      sentAt: number;
      participantId: string;
    }
  | {
      id: string;
      type: "lock-acquired";
      sessionId: string;
      senderId: string;
      sentAt: number;
      lock: SharedObjectLock;
    }
  | {
      id: string;
      type: "lock-released";
      sessionId: string;
      senderId: string;
      sentAt: number;
      objectId: string;
    }
  | {
      id: string;
      type: "lock-takeover-requested";
      sessionId: string;
      senderId: string;
      sentAt: number;
      request: SharedLockTakeoverRequest;
    }
  | {
      id: string;
      type: "world-mutation";
      sessionId: string;
      senderId: string;
      sentAt: number;
      mutation: SharedWorldMutation;
    }
  | {
      id: string;
      type: "session-resync-requested";
      sessionId: string;
      senderId: string;
      sentAt: number;
      request: SharedResyncRequest;
    }
  | {
      id: string;
      type: "session-resync-snapshot";
      sessionId: string;
      senderId: string;
      sentAt: number;
      snapshot: SharedResyncSnapshot;
    };

export type CollaborationTransportListener = (
  message: CollaborationTransportMessage,
) => void;

export type ConnectionStateListener = (
  state: CollaborationConnectionState,
) => void;

export interface CollaborationTransport {
  connect(sessionId: string): Promise<void>;

  disconnect(): Promise<void>;

  send(
    message: CollaborationTransportMessage,
  ): void;

  subscribe(
    listener: CollaborationTransportListener,
  ): () => void;

  subscribeToConnectionState(
    listener: ConnectionStateListener,
  ): () => void;

  getConnectionState():
    CollaborationConnectionState;
}
