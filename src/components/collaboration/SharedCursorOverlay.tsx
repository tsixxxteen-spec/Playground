import {
  useCollaborationSession,
} from "../../collaboration/CollaborationSessionContext";

import {
  useSharedCursors,
} from "../../collaboration/cursors/SharedCursorContext";

import SharedCursor from "./SharedCursor";

import "./SharedCursorOverlay.css";

export default function SharedCursorOverlay() {
  const {
    session,
  } = useCollaborationSession();

  const {
    cursors,
  } = useSharedCursors();

  const localParticipant =
    session.participants.find(
      (participant) =>
        participant.id ===
          "local-owner" ||
        participant.name === "You",
    ) ?? session.participants[0];

  return (
    <div
      className="shared-cursor-overlay"
      aria-hidden="true"
    >
      {cursors
        .filter(
          (cursor) =>
            cursor.participantId !==
            localParticipant?.id,
        )
        .map((cursor) => (
          <SharedCursor
            key={
              cursor.participantId
            }
            cursor={cursor}
          />
        ))}
    </div>
  );
}
