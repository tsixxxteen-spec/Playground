import { usePresence } from "./PresenceContext";
import PresenceOrb from "./PresenceOrb";

import "./Presence.css";

export default function PresenceLayer() {
  const { users } = usePresence();

  return (
    <div
      className="presence-layer"
      aria-label="People currently present"
    >
      {users.map((user) => (
        <PresenceOrb
          key={user.id}
          user={user}
        />
      ))}
    </div>
  );
}
