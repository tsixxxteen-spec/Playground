import type {
  AccountVisibility,
  FollowRelationship,
} from "../../profile-experiences/shared/ExperienceTypes";
import "./ProfileActionBar.css";

type Props = {
  isOwner: boolean;
  accountVisibility: AccountVisibility;
  followRelationship: FollowRelationship;
  onEdit?: () => void;
  onFollow?: () => void;
  onMessage?: () => void;
  onShare?: () => void;
};

function followButtonLabel(
  relationship: FollowRelationship,
): string {
  switch (relationship) {
    case "requested":
      return "Requested";
    case "following":
      return "Following";
    default:
      return "Follow";
  }
}

export default function ProfileActionBar({
  isOwner,
  accountVisibility,
  followRelationship,
  onEdit,
  onFollow,
  onMessage,
  onShare,
}: Props) {
  if (isOwner) {
    return (
      <nav
        className="profile-action-bar"
        aria-label="Your profile actions"
      >
        <button
          className="profile-action-bar__button profile-action-bar__button--primary"
          type="button"
          onClick={onEdit}
        >
          Edit Profile
        </button>

        <button
          className="profile-action-bar__button profile-action-bar__button--secondary"
          type="button"
          onClick={onShare}
        >
          Share
        </button>
      </nav>
    );
  }

  const privateRequestPending =
    accountVisibility === "private" &&
    followRelationship === "requested";

  return (
    <nav
      className="profile-action-bar"
      aria-label="Profile actions"
    >
      <button
        className={[
          "profile-action-bar__button",
          followRelationship === "none"
            ? "profile-action-bar__button--primary"
            : "profile-action-bar__button--relationship",
        ].join(" ")}
        type="button"
        onClick={onFollow}
        aria-pressed={followRelationship === "following"}
      >
        {followButtonLabel(followRelationship)}
      </button>

      {!privateRequestPending ? (
        <button
          className="profile-action-bar__button profile-action-bar__button--secondary"
          type="button"
          onClick={onMessage}
        >
          Message
        </button>
      ) : null}

      <button
        className="profile-action-bar__button profile-action-bar__button--secondary"
        type="button"
        onClick={onShare}
      >
        Share
      </button>
    </nav>
  );
}
