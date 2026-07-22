import { usePresence } from "./PresenceContext";
import PresenceOrb from "./PresenceOrb";

import "./Presence.css";

export default function PresenceLayer() {
  const {
    users,
    mode,
  } = usePresence();

  if (mode === "off") {
    return null;
  }

  return (
    <div
      className={`presence-layer presence-layer--${mode}`}
      aria-label={
        mode === "full"
          ? "Active explorers"
          : undefined
      }
      aria-hidden={mode === "ambient"}
    >
      {users.map((user) => (
        <PresenceOrb
          key={user.id}
          user={user}
          mode={mode}
        />
      ))}
    </div>
  );
}
