import type { CSSProperties } from "react";
import type { PresenceUser } from "./PresenceTypes";

import "./Presence.css";

type Props = {
  user: PresenceUser;
};

export default function PresenceOrb({
  user,
}: Props) {
  const style: CSSProperties = {
    left: `${user.x}%`,
    top: `${user.y}%`,
    borderColor: user.color,
    ["--presence-color" as string]: user.color,
  };

  return (
    <div
      className="presence-orb"
      style={style}
      aria-label={`${user.displayName} is ${user.status}`}
    >
      <div className="presence-avatar">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt=""
            className="presence-avatar-image"
          />
        ) : (
          <span aria-hidden="true">
            {user.displayName.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <div className="presence-label">
        <span className="presence-name">
          {user.displayName}
        </span>

        <span className="presence-status">
          {user.status}
        </span>
      </div>
    </div>
  );
}
