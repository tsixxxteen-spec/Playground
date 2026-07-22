import {
  useEffect,
  useRef,
} from "react";

import {
  useCollaborationSession,
} from "../CollaborationSessionContext";

import {
  useCollaborationTransport,
} from "../transport/CollaborationTransportContext";

import {
  createTransportMessage,
} from "../transport/messageFactory";

import type {
  CollaborationActivityState,
} from "../types";

const IDLE_AFTER_MS = 45_000;
const AWAY_AFTER_MS = 120_000;
const CURSOR_SEND_INTERVAL_MS = 34;

type CursorSnapshot = {
  x: number;
  y: number;
};

export function useSharedCursorPublisher() {
  const {
    session,
  } = useCollaborationSession();

  const {
    send,
  } = useCollaborationTransport();

  const latestCursorRef =
    useRef<CursorSnapshot | null>(null);

  const lastSentAtRef =
    useRef(0);

  const lastActivityAtRef =
    useRef(Date.now());

  const activityStateRef =
    useRef<CollaborationActivityState>(
      "active",
    );

  const localParticipant =
    session.participants.find(
      (participant) =>
        participant.id ===
          "local-owner" ||
        participant.name === "You",
    ) ?? session.participants[0];

  useEffect(() => {
    if (!localParticipant) {
      return;
    }

    const publishCursor = (
      activityState:
        CollaborationActivityState,
    ) => {
      const cursor =
        latestCursorRef.current;

      if (!cursor) {
        return;
      }

      send(
        createTransportMessage({
          type: "cursor-updated",
          sessionId: session.id,
          senderId:
            localParticipant.id,
          cursor: {
            participantId:
              localParticipant.id,
            participantName:
              localParticipant.name,
            position: cursor,
            activityState,
            selectedObjectId:
              localParticipant
                .selectedObjectId ??
              null,
            updatedAt: Date.now(),
          },
        }),
      );
    };

    const markActive = () => {
      lastActivityAtRef.current =
        Date.now();

      if (
        activityStateRef.current !==
        "active"
      ) {
        activityStateRef.current =
          "active";

        publishCursor("active");
      }
    };

    const handlePointerMove = (
      event: PointerEvent,
    ) => {
      latestCursorRef.current = {
        x:
          event.clientX /
          Math.max(
            window.innerWidth,
            1,
          ),
        y:
          event.clientY /
          Math.max(
            window.innerHeight,
            1,
          ),
      };

      markActive();

      const now = Date.now();

      if (
        now - lastSentAtRef.current <
        CURSOR_SEND_INTERVAL_MS
      ) {
        return;
      }

      lastSentAtRef.current = now;

      publishCursor("active");
    };

    const handleActivity = () => {
      markActive();
    };

    const activityTimer =
      window.setInterval(() => {
        const elapsed =
          Date.now() -
          lastActivityAtRef.current;

        const nextState:
          CollaborationActivityState =
            elapsed >= AWAY_AFTER_MS
              ? "away"
              : elapsed >=
                  IDLE_AFTER_MS
                ? "idle"
                : "active";

        if (
          nextState !==
          activityStateRef.current
        ) {
          activityStateRef.current =
            nextState;

          publishCursor(nextState);
        }
      }, 5_000);

    window.addEventListener(
      "pointermove",
      handlePointerMove,
      {
        passive: true,
      },
    );

    window.addEventListener(
      "pointerdown",
      handleActivity,
      {
        passive: true,
      },
    );

    window.addEventListener(
      "keydown",
      handleActivity,
    );

    return () => {
      window.clearInterval(
        activityTimer,
      );

      window.removeEventListener(
        "pointermove",
        handlePointerMove,
      );

      window.removeEventListener(
        "pointerdown",
        handleActivity,
      );

      window.removeEventListener(
        "keydown",
        handleActivity,
      );

      send(
        createTransportMessage({
          type: "cursor-left",
          sessionId: session.id,
          senderId:
            localParticipant.id,
          participantId:
            localParticipant.id,
        }),
      );
    };
  }, [
    session.id,
    localParticipant,
    send,
  ]);
}
