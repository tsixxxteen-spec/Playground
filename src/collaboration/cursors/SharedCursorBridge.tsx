import {
  useEffect,
} from "react";

import {
  collaborationTransport,
} from "../transport";

import {
  useSharedCursors,
} from "./SharedCursorContext";

import {
  useSharedCursorPublisher,
} from "./useSharedCursorPublisher";

export default function SharedCursorBridge() {
  useSharedCursorPublisher();

  const {
    upsertCursor,
    removeCursor,
  } = useSharedCursors();

  useEffect(() => {
    return collaborationTransport.subscribe(
      (message) => {
        switch (message.type) {
          case "cursor-updated": {
            upsertCursor(
              message.cursor,
            );
            break;
          }

          case "cursor-left":
          case "session-leave": {
            removeCursor(
              message.participantId,
            );
            break;
          }

          default:
            break;
        }
      },
    );
  }, [
    upsertCursor,
    removeCursor,
  ]);

  return null;
}
