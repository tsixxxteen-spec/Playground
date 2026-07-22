import type {
  CollaborationInvitation,
} from "../../collaboration/invitationTypes";

import "./PendingInviteCard.css";

type PendingInviteCardProps = {
  invitation: CollaborationInvitation;
  onCancel: (
    invitationId: string,
  ) => void;
};

export default function PendingInviteCard({
  invitation,
  onCancel,
}: PendingInviteCardProps) {
  return (
    <article className="pending-invite-card">
      <div className="pending-invite-card__icon">
        ↗
      </div>

      <div className="pending-invite-card__content">
        <strong>
          {invitation.recipientName}
        </strong>

        <span>Invite pending</span>
      </div>

      <button
        type="button"
        onClick={() =>
          onCancel(invitation.id)
        }
      >
        Cancel
      </button>
    </article>
  );
}
