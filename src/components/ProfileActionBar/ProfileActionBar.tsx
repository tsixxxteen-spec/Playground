import type {
  AccountVisibility,
  FollowRelationship,
} from "../../profile-experiences/shared/ExperienceTypes";

import "./ProfileActionBar.css";

type Props = {
  isOwner: boolean;
  accountVisibility: AccountVisibility;
  followRelationship: FollowRelationship;
  notice?: string | null;
  onEdit: () => void;
  onFollowToggle: () => void;
  onMessage: () => void;
  onShare: () => void;
  onCopyLink: () => void;
};

function followLabel(
  relationship: FollowRelationship,
): "Follow" | "Unfollow" {
  return relationship === "following"
    ? "Unfollow"
    : "Follow";
}

export default function ProfileActionBar({
  isOwner,
  accountVisibility,
  followRelationship,
  notice,
  onEdit,
  onFollowToggle,
  onMessage,
  onShare,
  onCopyLink,
}: Props) {
  const followText = followLabel(followRelationship);

  const followClassName = [
    "profile-action-bar__button",
    followRelationship === "following"
      ? "profile-action-bar__button--following"
      : "profile-action-bar__button--primary",
    followRelationship === "requested"
      ? "profile-action-bar__button--pending"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      className="profile-action-bar-shell"
      aria-label={
        isOwner
          ? "Your profile controls"
          : "Profile actions"
      }
    >
      {notice ? (
        <div
          className="profile-action-bar__notice"
          role="status"
          aria-live="polite"
        >
          {notice}
        </div>
      ) : null}

      <div className="profile-action-bar">
        {isOwner ? (
          <>
            <button
              className="profile-action-bar__button profile-action-bar__button--primary"
              type="button"
              onClick={onEdit}
            >
              <span aria-hidden="true">✦</span>
              Edit Profile
            </button>

            <button
              className="profile-action-bar__button"
              type="button"
              onClick={onShare}
            >
              Share
            </button>

            <button
              className="profile-action-bar__button"
              type="button"
              onClick={onCopyLink}
            >
              Copy Link
            </button>
          </>
        ) : (
          <>
            <button
              className={followClassName}
              type="button"
              onClick={onFollowToggle}
              aria-label={
                followRelationship === "requested"
                  ? accountVisibility === "private"
                    ? "Follow request sent. Activate to cancel."
                    : followText
                  : followText
              }
              title={
                followRelationship === "requested"
                  ? "Follow request sent"
                  : undefined
              }
            >
              {followText}
            </button>

            <button
              className="profile-action-bar__button"
              type="button"
              onClick={onMessage}
            >
              Message
            </button>

            <button
              className="profile-action-bar__button"
              type="button"
              onClick={onShare}
            >
              Share
            </button>
          </>
        )}
      </div>
    </section>
  );
}
