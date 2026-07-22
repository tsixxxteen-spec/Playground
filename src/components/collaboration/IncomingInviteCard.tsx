import type {
  IncomingCollaborationInvitation,
} from "../../collaboration/invitationTypes";

import "./IncomingInviteCard.css";

type IncomingInviteCardProps = {
  invitation: IncomingCollaborationInvitation;
  onAccept: (
    invitationId: string,
  ) => void;
  onDecline: (
    invitationId: string,
  ) => void;
};

export default function IncomingInviteCard({
  invitation,
  onAccept,
  onDecline,
}: IncomingInviteCardProps) {
  return (
    <article className="incoming-invite-card">
      <div className="incoming-invite-card__heading">
        <span>Invitation</span>

        <strong>
          {invitation.sessionName}
        </strong>

        <p>
          {invitation.inviterName} invited you
          to collaborate.
        </p>
      </div>

      <div className="incoming-invite-card__actions">
        <button
          type="button"
          className="incoming-invite-card__decline"
          onClick={() =>
            onDecline(invitation.id)
          }
        >
          Decline
        </button>

        <button
          type="button"
          className="incoming-invite-card__accept"
          onClick={() =>
            onAccept(invitation.id)
          }
        >
          Join
        </button>
      </div>
    </article>
  );
}
