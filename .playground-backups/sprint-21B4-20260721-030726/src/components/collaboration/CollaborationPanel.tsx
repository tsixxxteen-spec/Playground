import { useCollaborationSession } from "../../collaboration/CollaborationSessionContext";
import CollaboratorCard from "./CollaboratorCard";
import InviteDialog from "./InviteDialog";
import SessionBadge from "./SessionBadge";
import "./CollaborationPanel.css";

export default function CollaborationPanel() {
  const {
    session,
    inviteDialogOpen,
    openInviteDialog,
    closeInviteDialog,
    inviteParticipant,
    removeParticipant,
  } = useCollaborationSession();

  return (
    <>
      <aside
        className="collaboration-panel"
        aria-label="Collaboration"
      >
        <div className="collaboration-panel__header">
          <div>
            <p className="collaboration-panel__eyebrow">
              Playground
            </p>

            <h3>Collaboration</h3>
          </div>

          <SessionBadge shared={session.isShared} />
        </div>

        <div className="collaboration-panel__participants">
          {session.participants.map((participant) => (
            <CollaboratorCard
              key={participant.id}
              participant={participant}
              onRemove={removeParticipant}
            />
          ))}
        </div>

        <button
          className="collaboration-panel__invite-button"
          type="button"
          onClick={openInviteDialog}
        >
          Invite People
        </button>
      </aside>

      {inviteDialogOpen && (
        <InviteDialog
          onClose={closeInviteDialog}
          onInvite={inviteParticipant}
        />
      )}
    </>
  );
}
