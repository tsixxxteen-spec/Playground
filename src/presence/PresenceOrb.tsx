import type {
  CSSProperties,
} from "react";

import type {
  PresenceMode,
  PresenceUser,
} from "./PresenceTypes";

import "./Presence.css";

type Props = {
  user: PresenceUser;
  mode: PresenceMode;
};

function formatJoinedTime(joinedAt: number): string {
  const elapsedMinutes = Math.max(
    0,
    Math.floor((Date.now() - joinedAt) / 60000),
  );

  if (elapsedMinutes < 1) {
    return "Just arrived";
  }

  if (elapsedMinutes === 1) {
    return "Here for 1 minute";
  }

  return `Here for ${elapsedMinutes} minutes`;
}

export default function PresenceOrb({
  user,
  mode,
}: Props) {
  const style = {
    left: `${user.x}%`,
    top: `${user.y}%`,
    "--presence-color": user.color,
  } as CSSProperties;

  const initial =
    user.displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      className={[
        "presence-orb",
        `presence-orb--${user.status}`,
        `presence-orb--${mode}`,
      ].join(" ")}
      data-presence-theme={
        user.themeVariant ?? "minimal"
      }
      style={style}
    >
      <div className="presence-orb__energy">
        <div className="presence-avatar">
          {mode === "full" && user.avatar ? (
            <img
              className="presence-avatar__image"
              src={user.avatar}
              alt=""
            />
          ) : (
            <span aria-hidden="true">
              {mode === "ambient" ? "" : initial}
            </span>
          )}
        </div>
      </div>

      {mode === "full" && (
        <div
          className="presence-card"
          role="status"
        >
          <strong>{user.displayName}</strong>

          <span>
            {user.activity ??
              user.status.charAt(0).toUpperCase() +
                user.status.slice(1)}
          </span>

          <small>
            {formatJoinedTime(user.joinedAt)}
          </small>
        </div>
      )}
    </div>
  );
}
