import {
  useCollaborationSession,
} from "../../collaboration/CollaborationSessionContext";

import {
  createCollaborationSessionId,
} from "../../collaboration/sessionLinks";

import CollaboratorCard from "./CollaboratorCard";
import IncomingInviteCard from "./IncomingInviteCard";
import InviteDialog from "./InviteDialog";
import PendingInviteCard from "./PendingInviteCard";
import SessionBadge from "./SessionBadge";
import ShareSessionPanel from "./ShareSessionPanel";

import "./CollaborationPanel.css";
import { useCollaborationTransport } from "../../collaboration/transport/CollaborationTransportContext";
import ConnectionBadge from "./ConnectionBadge";

export default function CollaborationPanel() {

  const {
    connectionState,
    reconnect,
  } = useCollaborationTransport();
  const {
    session,
    inviteDialogOpen,
    openInviteDialog,
    closeInviteDialog,
    inviteParticipant,
    cancelInvitation,
    receiveInvitation,
    acceptInvitation,
    declineInvitation,
    removeParticipant,
  } = useCollaborationSession();

  const createTestInvitation = () => {
    receiveInvitation({
      id: createCollaborationSessionId(),
      sessionId:
        createCollaborationSessionId(),
      sessionName: "Creative Session",
      inviterId: "demo-owner",
      inviterName: "Alex",
      createdAt: Date.now(),
    });
  };

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

            <span className="collaboration-panel__session-name">
              {session.name}
            </span>
          </div>

          <div className="collaboration-panel__status">
            <SessionBadge
              shared={session.isShared}
            />

            <ConnectionBadge
              state={connectionState}
              onReconnect={() => {
                void reconnect();
              }}
            />
          </div>
        </div>

        {session.incomingInvitations.length >
          0 && (
          <section className="collaboration-panel__section">
            <div className="collaboration-panel__section-heading">
              <span>Invitations</span>

              <small>
                {
                  session
                    .incomingInvitations
                    .length
                }
              </small>
            </div>

            <div className="collaboration-panel__stack">
              {session.incomingInvitations.map(
                (invitation) => (
                  <IncomingInviteCard
                    key={invitation.id}
                    invitation={invitation}
                    onAccept={
                      acceptInvitation
                    }
                    onDecline={
                      declineInvitation
                    }
                  />
                ),
              )}
            </div>
          </section>
        )}

        <ShareSessionPanel
          sessionId={session.id}
        />

        <section className="collaboration-panel__section">
          <div className="collaboration-panel__section-heading">
            <span>People</span>

            <small>
              {session.participants.length}
            </small>
          </div>

          <div className="collaboration-panel__participants">
            {session.participants.map(
              (participant) => (
                <CollaboratorCard
                  key={participant.id}
                  participant={participant}
                  onRemove={
                    removeParticipant
                  }
                />
              ),
            )}
          </div>
        </section>

        {session.pendingInvitations.length >
          0 && (
          <section className="collaboration-panel__section">
            <div className="collaboration-panel__section-heading">
              <span>Pending</span>

              <small>
                {
                  session
                    .pendingInvitations
                    .length
                }
              </small>
            </div>

            <div className="collaboration-panel__stack">
              {session.pendingInvitations.map(
                (invitation) => (
                  <PendingInviteCard
                    key={invitation.id}
                    invitation={invitation}
                    onCancel={
                      cancelInvitation
                    }
                  />
                ),
              )}
            </div>
          </section>
        )}

        <button
          className="collaboration-panel__invite-button"
          type="button"
          onClick={openInviteDialog}
        >
          Invite People
        </button>

        {import.meta.env.DEV && (
          <button
            className="collaboration-panel__test-button"
            type="button"
            onClick={createTestInvitation}
          >
            Test Incoming Invite
          </button>
        )}
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
