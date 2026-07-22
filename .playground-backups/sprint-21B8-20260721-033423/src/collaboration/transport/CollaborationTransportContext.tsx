import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

import {
  useCollaborationSession,
} from "../CollaborationSessionContext";

import type {
  CollaborationParticipant,
} from "../types";

import {
  collaborationTransport,
} from "./index";

import {
  createTransportMessage,
} from "./messageFactory";

import type {
  CollaborationConnectionState,
  CollaborationTransportMessage,
} from "./types";

type CollaborationTransportContextValue = {
  connectionState:
    CollaborationConnectionState;

  send: (
    message:
      CollaborationTransportMessage,
  ) => void;

  reconnect: () => Promise<void>;
};

const CollaborationTransportContext =
  createContext<
    CollaborationTransportContextValue
    | null
  >(null);

type CollaborationTransportProviderProps = {
  children: ReactNode;
};

function mergeParticipant(
  participants:
    CollaborationParticipant[],
  incoming:
    CollaborationParticipant,
): CollaborationParticipant[] {
  const exists =
    participants.some(
      (participant) =>
        participant.id === incoming.id,
    );

  if (!exists) {
    return [
      ...participants,
      incoming,
    ];
  }

  return participants.map(
    (participant) =>
      participant.id === incoming.id
        ? {
            ...participant,
            ...incoming,
          }
        : participant,
  );
}

export function CollaborationTransportProvider({
  children,
}: CollaborationTransportProviderProps) {
  const {
    session,
    setParticipants,
    receiveInvitation,
    cancelInvitation,
    renameSession,
  } = useCollaborationSession();

  const [
    connectionState,
    setConnectionState,
  ] =
    useState<
      CollaborationConnectionState
    >(
      collaborationTransport
        .getConnectionState(),
    );

  const reconnectTimerRef =
    useRef<
      ReturnType<typeof setTimeout>
      | null
    >(null);

  const participantsRef =
    useRef<
      CollaborationParticipant[]
    >(session.participants);

  const sessionIdRef =
    useRef(session.id);

  const localParticipantRef =
    useRef<
      CollaborationParticipant
      | undefined
    >(undefined);

  useEffect(() => {
    participantsRef.current =
      session.participants;

    localParticipantRef.current =
      session.participants.find(
        (participant) =>
          participant.id ===
            "local-owner" ||
          participant.name === "You",
      ) ?? session.participants[0];
  }, [session.participants]);

  useEffect(() => {
    sessionIdRef.current =
      session.id;
  }, [session.id]);

  const clearReconnectTimer =
    useCallback(() => {
      if (
        reconnectTimerRef.current
      ) {
        clearTimeout(
          reconnectTimerRef.current,
        );

        reconnectTimerRef.current =
          null;
      }
    }, []);

  const connect =
    useCallback(async () => {
      clearReconnectTimer();

      try {
        await collaborationTransport.connect(
          sessionIdRef.current,
        );

        const localParticipant =
          localParticipantRef.current;

        if (localParticipant) {
          collaborationTransport.send(
            createTransportMessage({
              type: "session-join",
              sessionId:
                sessionIdRef.current,
              senderId:
                localParticipant.id,
              participant:
                localParticipant,
            }),
          );
        }
      } catch {
        reconnectTimerRef.current =
          setTimeout(() => {
            void connect();
          }, 2500);
      }
    }, [clearReconnectTimer]);

  useEffect(() => {
    return collaborationTransport
      .subscribeToConnectionState(
        setConnectionState,
      );
  }, []);

  useEffect(() => {
    return collaborationTransport
      .subscribe((message) => {
        if (
          message.sessionId !==
            sessionIdRef.current
        ) {
          return;
        }

        switch (message.type) {
          case "session-join": {
            const participants =
              mergeParticipant(
                participantsRef.current,
                message.participant,
              );

            participantsRef.current =
              participants;

            setParticipants(
              participants,
            );

            const localParticipant =
              localParticipantRef.current;

            if (localParticipant) {
              collaborationTransport.send(
                createTransportMessage({
                  type:
                    "presence-snapshot",
                  sessionId:
                    sessionIdRef.current,
                  senderId:
                    localParticipant.id,
                  participants,
                }),
              );
            }

            break;
          }

          case "session-leave": {
            const participants =
              participantsRef.current.filter(
                (participant) =>
                  participant.id !==
                    message.participantId,
              );

            participantsRef.current =
              participants;

            setParticipants(
              participants,
            );

            break;
          }

          case "presence-snapshot": {
            participantsRef.current =
              message.participants;

            setParticipants(
              message.participants,
            );

            break;
          }

          case "participant-updated": {
            const participants =
              mergeParticipant(
                participantsRef.current,
                message.participant,
              );

            participantsRef.current =
              participants;

            setParticipants(
              participants,
            );

            break;
          }

          case "invitation-received": {
            receiveInvitation(
              message.invitation,
            );

            break;
          }

          case "invitation-cancelled": {
            cancelInvitation(
              message.invitationId,
            );

            break;
          }

          case "session-renamed": {
            renameSession(
              message.name,
            );

            break;
          }

          case "invitation-created":
          case "cursor-updated":
          case "cursor-left":
          case "selection-updated":
          case "selection-cleared":
          case "lock-acquired":
          case "lock-released":
          case "lock-takeover-requested": {
            break;
          }

          default: {
            const exhaustiveCheck:
              never = message;

            return exhaustiveCheck;
          }
        }
      });
  }, [
    setParticipants,
    receiveInvitation,
    cancelInvitation,
    renameSession,
  ]);

  useEffect(() => {
    void connect();

    return () => {
      clearReconnectTimer();

      const localParticipant =
        localParticipantRef.current;

      if (localParticipant) {
        collaborationTransport.send(
          createTransportMessage({
            type: "session-leave",
            sessionId:
              sessionIdRef.current,
            senderId:
              localParticipant.id,
            participantId:
              localParticipant.id,
          }),
        );
      }

      void collaborationTransport
        .disconnect();
    };
  }, [
    session.id,
    connect,
    clearReconnectTimer,
  ]);

  useEffect(() => {
    if (
      connectionState !== "error" &&
      connectionState !==
        "disconnected"
    ) {
      return;
    }

    clearReconnectTimer();

    reconnectTimerRef.current =
      setTimeout(() => {
        void connect();
      }, 2500);

    return clearReconnectTimer;
  }, [
    connectionState,
    connect,
    clearReconnectTimer,
  ]);

  const send = useCallback(
    (
      message:
        CollaborationTransportMessage,
    ) => {
      collaborationTransport.send(
        message,
      );
    },
    [],
  );

  const value = useMemo(
    () => ({
      connectionState,
      send,
      reconnect: connect,
    }),
    [
      connectionState,
      send,
      connect,
    ],
  );

  return (
    <CollaborationTransportContext.Provider
      value={value}
    >
      {children}
    </CollaborationTransportContext.Provider>
  );
}

export function useCollaborationTransport() {
  const context = useContext(
    CollaborationTransportContext,
  );

  if (!context) {
    throw new Error(
      "useCollaborationTransport must be used inside CollaborationTransportProvider.",
    );
  }

  return context;
}
