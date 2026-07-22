import type { CollaborationParticipant } from "../../collaboration/types";
import "./CollaboratorCard.css";

type CollaboratorCardProps = {
  participant: CollaborationParticipant;
  onRemove?: (participantId: string) => void;
};

export default function CollaboratorCard({
  participant,
  onRemove,
}: CollaboratorCardProps) {
  const initials = participant.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const isOwner = participant.role === "owner";

  return (
    <article className="collaborator-card">
      <div className="collaborator-card__avatar">
        {participant.avatarUrl ? (
          <img
            src={participant.avatarUrl}
            alt=""
          />
        ) : (
          <span>{initials || "?"}</span>
        )}

        <span
          className={`collaborator-card__presence ${
            participant.isOnline
              ? "collaborator-card__presence--online"
              : ""
          }`}
          aria-label={
            participant.isOnline ? "Online" : "Offline"
          }
        />
      </div>

      <div className="collaborator-card__info">
        <strong>{participant.name}</strong>

        <small>
          {isOwner
            ? "Owner"
            : participant.isOnline
              ? "Active now"
              : "Invite pending"}
        </small>
      </div>

      {!isOwner && onRemove && (
        <button
          className="collaborator-card__remove"
          type="button"
          aria-label={`Remove ${participant.name}`}
          onClick={() => onRemove(participant.id)}
        >
          ×
        </button>
      )}
    </article>
  );
}
